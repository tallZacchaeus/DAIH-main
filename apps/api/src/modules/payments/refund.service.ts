import {
  Prisma,
  RefundStatus,
  RefundReasonCode,
  UserRole,
  BookingState,
  CoinLedgerAction,
} from "@prisma/client";
import { prisma } from "../../db/client.js";
import { paystackClient } from "./paystack.client.js";
import { coinService } from "../loyalty/coin.service.js";
import { enqueueNotification } from "../notifications/notifications.queue.js";
import { Decimal } from "@prisma/client/runtime/library";

export interface RaiseRefundRequestDTO {
  bookingId: string;
  reasonCode: RefundReasonCode;
  reason: string;
}

export interface RequestInfoDTO {
  question: string;
}

export interface ProvideInfoDTO {
  response: string;
}

export interface RejectRefundDTO {
  rejectionReason: string;
}

export class RefundService {
  /**
   * Operations Manager raises a dual-authorization refund request.
   * Enforces detailed justification (>= 20 chars) and checks existing requests.
   */
  async raiseRefundRequest(
    operatorUserId: string,
    dto: RaiseRefundRequestDTO,
  ): Promise<any> {
    const cleanReason = (dto.reason || "").trim();
    if (cleanReason.length < 20) {
      const error: any = new Error(
        "Refund request reason must be at least 20 characters describing the justification.",
      );
      error.code = "INVALID_REFUND_REASON";
      error.statusCode = 400;
      throw error;
    }

    // 1. Fetch booking with transactions and user
    const booking = await prisma.booking.findUnique({
      where: { id: dto.bookingId },
      include: {
        transactions: {
          where: { status: "SUCCESSFUL" },
        },
        user: true,
      },
    });

    if (!booking) {
      const error: any = new Error("Booking not found");
      error.code = "BOOKING_NOT_FOUND";
      error.statusCode = 404;
      throw error;
    }

    // 2. Check if a refund request already exists
    const existing = await prisma.refundRequest.findUnique({
      where: { bookingId: dto.bookingId },
    });

    if (
      existing &&
      [
        RefundStatus.PENDING,
        RefundStatus.INFO_REQUESTED,
        RefundStatus.APPROVED,
        RefundStatus.PROCESSED,
      ].includes(existing.status as any)
    ) {
      const error: any = new Error(
        `A refund request for this booking is already ${existing.status.toLowerCase()}.`,
      );
      error.code = "REFUND_ALREADY_EXISTS";
      error.statusCode = 409;
      throw error;
    }

    // 3. Compute net settled fiat to refund
    const totalPaidFiat = booking.transactions.reduce(
      (sum, t) => sum.plus(new Decimal(t.amount)),
      new Decimal(0),
    );

    if (totalPaidFiat.isZero() || totalPaidFiat.isNegative()) {
      const error: any = new Error(
        "No settled payment found for this booking to refund.",
      );
      error.code = "NO_SETTLED_PAYMENT";
      error.statusCode = 400;
      throw error;
    }

    const primaryTransaction = booking.transactions[0];

    // 4. Calculate coin adjustments
    // (a) Customer redeemed coins to return
    const coinsToReverse = booking.redeemedCoins
      ? new Decimal(booking.redeemedCoins)
      : new Decimal(0);

    // (b) Customer earned coins to claw back
    const earnedEntry = await prisma.coinLedgerEntry.findFirst({
      where: {
        referenceId: booking.id,
        action: CoinLedgerAction.BOOKING_EARN,
      },
    });
    const coinsToClawback = earnedEntry
      ? new Decimal(earnedEntry.amount)
      : new Decimal(0);

    // (c) Referrer coins to claw back if this was referee's first booking
    let referralCoinsToClawback = new Decimal(0);
    let referrerId: string | null = null;
    if (booking.user.referredById) {
      const refEntry = await prisma.coinLedgerEntry.findFirst({
        where: {
          referenceId: booking.id,
          action: CoinLedgerAction.REFERRAL_BONUS,
        },
      });
      if (refEntry) {
        referralCoinsToClawback = new Decimal(refEntry.amount);
        referrerId = booking.user.referredById;
      }
    }

    // 5. Create or update RefundRequest
    const operator = await prisma.user.findUnique({
      where: { id: operatorUserId },
    });

    const refundRequest = await prisma.refundRequest.upsert({
      where: { bookingId: dto.bookingId },
      create: {
        bookingId: dto.bookingId,
        transactionId: primaryTransaction?.id || null,
        amount: totalPaidFiat,
        coinsToReverse,
        coinsToClawback,
        referralCoinsToClawback,
        referrerId,
        reasonCode: dto.reasonCode,
        reason: cleanReason,
        status: RefundStatus.PENDING,
        requestedByUserId: operatorUserId,
      },
      update: {
        transactionId: primaryTransaction?.id || null,
        amount: totalPaidFiat,
        coinsToReverse,
        coinsToClawback,
        referralCoinsToClawback,
        referrerId,
        reasonCode: dto.reasonCode,
        reason: cleanReason,
        status: RefundStatus.PENDING,
        requestedByUserId: operatorUserId,
        reviewedByUserId: null,
        reviewedAt: null,
        rejectionReason: null,
        infoRequested: null,
        infoProvided: null,
      },
      include: {
        booking: true,
        requestedBy: true,
      },
    });

    // 6. Notify Finance Officers and Super Admins
    const financeOfficers = await prisma.user.findMany({
      where: {
        role: { in: [UserRole.FINANCE_OFFICER, UserRole.SUPER_ADMIN] },
        isVerified: true,
      },
      select: { id: true, email: true, firstName: true },
    });

    for (const fo of financeOfficers) {
      try {
        await enqueueNotification(
          "finance.refund_requested",
          fo.email,
          fo.firstName,
          {
            refundRequestId: refundRequest.id,
            bookingReference: booking.reference,
            amount: Number(totalPaidFiat),
            operatorName:
              `${operator?.firstName || "Operations"} ${operator?.lastName || ""}`.trim(),
            reason: cleanReason,
          },
        );
      } catch (err: any) {
        console.warn(
          "[RefundService] Failed to notify finance officer:",
          err?.message,
        );
      }
    }

    return refundRequest;
  }

  /**
   * Finance Officer requests more info / clarification from Operations.
   */
  async requestMoreInfo(
    financeOfficerUserId: string,
    refundRequestId: string,
    dto: RequestInfoDTO,
  ): Promise<any> {
    const refundRequest = await prisma.refundRequest.findUnique({
      where: { id: refundRequestId },
      include: { requestedBy: true, booking: true },
    });

    if (!refundRequest) {
      const error: any = new Error("Refund request not found");
      error.code = "REFUND_NOT_FOUND";
      error.statusCode = 404;
      throw error;
    }

    if (refundRequest.status !== RefundStatus.PENDING) {
      const error: any = new Error(
        `Cannot request info on refund request with status ${refundRequest.status}.`,
      );
      error.code = "INVALID_REFUND_STATUS";
      error.statusCode = 400;
      throw error;
    }

    const updated = await prisma.refundRequest.update({
      where: { id: refundRequestId },
      data: {
        status: RefundStatus.INFO_REQUESTED,
        infoRequested: dto.question.trim(),
        reviewedByUserId: financeOfficerUserId,
      },
      include: {
        booking: true,
        requestedBy: true,
      },
    });

    // Notify Operations Admin
    try {
      await enqueueNotification(
        "operations.refund_info_requested",
        refundRequest.requestedBy.email,
        refundRequest.requestedBy.firstName,
        {
          refundRequestId: updated.id,
          bookingReference: refundRequest.booking.reference,
          question: dto.question.trim(),
        },
      );
    } catch (err: any) {
      console.warn(
        "[RefundService] Failed to notify operations admin:",
        err?.message,
      );
    }

    return updated;
  }

  /**
   * Operations Manager provides clarification requested by Finance.
   */
  async provideMoreInfo(
    operatorUserId: string,
    refundRequestId: string,
    dto: ProvideInfoDTO,
  ): Promise<any> {
    const refundRequest = await prisma.refundRequest.findUnique({
      where: { id: refundRequestId },
      include: { booking: true },
    });

    if (!refundRequest) {
      const error: any = new Error("Refund request not found");
      error.code = "REFUND_NOT_FOUND";
      error.statusCode = 404;
      throw error;
    }

    if (refundRequest.status !== RefundStatus.INFO_REQUESTED) {
      const error: any = new Error(
        `Refund request is not awaiting clarification (status: ${refundRequest.status}).`,
      );
      error.code = "INVALID_REFUND_STATUS";
      error.statusCode = 400;
      throw error;
    }

    const updated = await prisma.refundRequest.update({
      where: { id: refundRequestId },
      data: {
        status: RefundStatus.PENDING,
        infoProvided: dto.response.trim(),
      },
      include: {
        booking: true,
        requestedBy: true,
      },
    });

    // Notify Finance Officer
    if (refundRequest.reviewedByUserId) {
      const fo = await prisma.user.findUnique({
        where: { id: refundRequest.reviewedByUserId },
      });
      if (fo?.email) {
        try {
          await enqueueNotification(
            "finance.refund_info_provided",
            fo.email,
            fo.firstName,
            {
              refundRequestId: updated.id,
              bookingReference: refundRequest.booking.reference,
              response: dto.response.trim(),
            },
          );
        } catch (err: any) {
          console.warn(
            "[RefundService] Failed to notify finance officer:",
            err?.message,
          );
        }
      }
    }

    return updated;
  }

  /**
   * Finance Officer or Super Admin approves the refund request.
   * Executes Paystack gateway refund, loyalty reversals & clawbacks, and marks booking as REFUNDED.
   * Enforces segregation of duties (cannot approve own request).
   */
  async approveRefund(
    financeOfficerUserId: string,
    refundRequestId: string,
  ): Promise<any> {
    const refundRequest = await prisma.refundRequest.findUnique({
      where: { id: refundRequestId },
      include: {
        booking: {
          include: {
            transactions: { where: { status: "SUCCESSFUL" } },
            user: true,
          },
        },
        requestedBy: true,
      },
    });

    if (!refundRequest) {
      const error: any = new Error("Refund request not found");
      error.code = "REFUND_NOT_FOUND";
      error.statusCode = 404;
      throw error;
    }

    // Segregation of duties
    if (refundRequest.requestedByUserId === financeOfficerUserId) {
      const error: any = new Error(
        "Segregation of Duties Violation: You cannot approve a refund request that you initiated.",
      );
      error.code = "SELF_APPROVAL_PROHIBITED";
      error.statusCode = 403;
      throw error;
    }

    if (
      ![RefundStatus.PENDING, RefundStatus.INFO_REQUESTED].includes(
        refundRequest.status as any,
      )
    ) {
      const error: any = new Error(
        `Cannot approve refund request with status ${refundRequest.status}.`,
      );
      error.code = "INVALID_REFUND_STATUS";
      error.statusCode = 400;
      throw error;
    }

    // 1. Gateway execution with Paystack
    const primaryTx = refundRequest.booking.transactions[0];
    const txRef = primaryTx?.reference || refundRequest.booking.reference;
    const amountKobo = Math.round(Number(refundRequest.amount) * 100);

    let paystackResult: any = null;
    try {
      paystackResult = await paystackClient.createRefund({
        transaction: txRef,
        amount: amountKobo,
        merchantNote: `Approved by Finance: ${refundRequest.reason}`,
        customerNote: "Refund for your booking at DAIH Hub",
      });
    } catch (err: any) {
      // Mark as FAILED if gateway rejected
      await prisma.refundRequest.update({
        where: { id: refundRequestId },
        data: {
          status: RefundStatus.FAILED,
          failureReason: err?.message || "Paystack gateway refund rejected",
          reviewedByUserId: financeOfficerUserId,
          reviewedAt: new Date(),
        },
      });
      const error: any = new Error(
        `Paystack Gateway Refund Failed: ${err?.message}`,
      );
      error.code = "GATEWAY_REFUND_FAILED";
      error.statusCode = 502;
      throw error;
    }

    // 2. Atomic Database updates & Loyalty adjustments
    const approved = await prisma.$transaction(async (tx) => {
      // (a) Update RefundRequest to PROCESSED
      const processedRequest = await tx.refundRequest.update({
        where: { id: refundRequestId },
        data: {
          status: RefundStatus.PROCESSED,
          reviewedByUserId: financeOfficerUserId,
          reviewedAt: new Date(),
          paystackRefundId: String(paystackResult?.data?.id || ""),
          gatewayReference: paystackResult?.data?.refund_reference || null,
        },
        include: {
          booking: true,
          requestedBy: true,
          reviewedBy: true,
        },
      });

      // (b) Update Booking state to REFUNDED
      await tx.booking.update({
        where: { id: refundRequest.bookingId },
        data: {
          state: BookingState.REFUNDED,
        },
      });

      // (c) Update transaction status
      if (primaryTx) {
        await tx.transaction.update({
          where: { id: primaryTx.id },
          data: { status: "REFUNDED" },
        });
      }

      // (d) Loyalty reversals & clawbacks
      // 1. Reverse customer redeemed coins back to wallet
      if (Number(refundRequest.coinsToReverse) > 0) {
        await coinService.reverseRedemption(
          refundRequest.bookingId,
          refundRequest.coinsToReverse,
          tx,
        );
      }

      // 2. Claw back earned coins from customer
      if (Number(refundRequest.coinsToClawback) > 0) {
        await coinService.clawbackEarnedCoins(
          refundRequest.bookingId,
          refundRequest.coinsToClawback,
          tx,
        );
      }

      // 3. Claw back referral bonus from referrer
      if (
        refundRequest.referrerId &&
        Number(refundRequest.referralCoinsToClawback) > 0
      ) {
        await coinService.clawbackReferralBonus(
          refundRequest.bookingId,
          refundRequest.referrerId,
          refundRequest.referralCoinsToClawback,
          tx,
        );
      }

      // (e) Record Outbox event
      await tx.outboxEvent.create({
        data: {
          eventType: "refund.processed",
          aggregateType: "Booking",
          aggregateId: refundRequest.bookingId,
          payload: {
            refundRequestId: processedRequest.id,
            bookingId: refundRequest.bookingId,
            bookingReference: refundRequest.booking.reference,
            amount: Number(refundRequest.amount),
            coinsToReverse: Number(refundRequest.coinsToReverse),
            coinsToClawback: Number(refundRequest.coinsToClawback),
            customerEmail: refundRequest.booking.user.email,
            customerName:
              `${refundRequest.booking.user.firstName} ${refundRequest.booking.user.lastName}`.trim(),
            approvedByUserId: financeOfficerUserId,
          },
        },
      });

      return processedRequest;
    });

    // 3. Notify Customer and Operations Manager
    try {
      await enqueueNotification(
        "customer.refund_processed",
        refundRequest.booking.user.email,
        refundRequest.booking.user.firstName,
        {
          bookingReference: refundRequest.booking.reference,
          amount: Number(refundRequest.amount),
          coinsToReverse: Number(refundRequest.coinsToReverse),
        },
      );
    } catch (err: any) {
      console.warn("[RefundService] Failed to notify customer:", err?.message);
    }

    return approved;
  }

  /**
   * Finance Officer rejects a refund request with justification.
   */
  async rejectRefund(
    financeOfficerUserId: string,
    refundRequestId: string,
    dto: RejectRefundDTO,
  ): Promise<any> {
    const refundRequest = await prisma.refundRequest.findUnique({
      where: { id: refundRequestId },
      include: { booking: true, requestedBy: true },
    });

    if (!refundRequest) {
      const error: any = new Error("Refund request not found");
      error.code = "REFUND_NOT_FOUND";
      error.statusCode = 404;
      throw error;
    }

    if (
      ![RefundStatus.PENDING, RefundStatus.INFO_REQUESTED].includes(
        refundRequest.status as any,
      )
    ) {
      const error: any = new Error(
        `Cannot reject refund request with status ${refundRequest.status}.`,
      );
      error.code = "INVALID_REFUND_STATUS";
      error.statusCode = 400;
      throw error;
    }

    const cleanRejection = (dto.rejectionReason || "").trim();
    if (!cleanRejection) {
      const error: any = new Error("Rejection reason is required.");
      error.code = "REJECTION_REASON_REQUIRED";
      error.statusCode = 400;
      throw error;
    }

    const updated = await prisma.refundRequest.update({
      where: { id: refundRequestId },
      data: {
        status: RefundStatus.REJECTED,
        rejectionReason: cleanRejection,
        reviewedByUserId: financeOfficerUserId,
        reviewedAt: new Date(),
      },
      include: {
        booking: true,
        requestedBy: true,
        reviewedBy: true,
      },
    });

    // Notify Operations Admin
    try {
      await enqueueNotification(
        "operations.refund_rejected",
        refundRequest.requestedBy.email,
        refundRequest.requestedBy.firstName,
        {
          refundRequestId: updated.id,
          bookingReference: refundRequest.booking.reference,
          rejectionReason: cleanRejection,
        },
      );
    } catch (err: any) {
      console.warn(
        "[RefundService] Failed to notify operations admin:",
        err?.message,
      );
    }

    return updated;
  }

  /**
   * Lists refund requests with optional status filter and pagination.
   */
  async listRefundRequests(filters: {
    status?: RefundStatus;
    page?: number;
    limit?: number;
  }): Promise<{
    items: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.RefundRequestWhereInput = {
      ...(filters.status && { status: filters.status }),
    };

    const [items, total] = await Promise.all([
      prisma.refundRequest.findMany({
        where,
        include: {
          booking: {
            select: {
              id: true,
              reference: true,
              state: true,
              totalAmount: true,
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
          requestedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
          reviewedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { requestedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.refundRequest.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Gets details of a single refund request by ID.
   */
  async getRefundRequest(refundRequestId: string): Promise<any> {
    const request = await prisma.refundRequest.findUnique({
      where: { id: refundRequestId },
      include: {
        booking: {
          include: {
            transactions: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        requestedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!request) {
      const error: any = new Error("Refund request not found");
      error.code = "REFUND_NOT_FOUND";
      error.statusCode = 404;
      throw error;
    }

    return request;
  }
}

export const refundService = new RefundService();
