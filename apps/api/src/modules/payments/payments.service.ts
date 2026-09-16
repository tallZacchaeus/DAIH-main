import { prisma } from "../../db/client.js";
import { Prisma } from "@prisma/client";
import {
  paymentsRepository,
  PaymentsRepository,
} from "./payments.repository.js";
import { paystackClient, PaystackClient } from "./paystack.client.js";
import { invoiceService, InvoiceService } from "./invoice.service.js";
import { outboxService } from "../events/outbox.service.js";
import { bookingRepository } from "../booking/booking.repository.js";
import {
  scheduleHoldExpiry,
  cancelHoldExpiryJob,
} from "../../jobs/hold-expiry.job.js";
import {
  assertValidTransition,
  ACTIVE_BOOKING_STATES,
} from "../booking/booking.state-machine.js";
import { discountService } from "../discounts/discount.service.js";
import {
  BookingState,
  PaymentStatus,
  PaymentMethod,
  PaymentTransaction,
  PaystackWebhookPayload,
  ReconciliationSummary,
  ReconciliationDiscrepancy,
  DailyPaymentSummary,
} from "@daih/types";

export class PaymentsService {
  constructor(
    private repo: PaymentsRepository = paymentsRepository,
    private paystack: PaystackClient = paystackClient,
    private invoices: InvoiceService = invoiceService,
  ) {}

  /**
   * Formats transaction entity into clean API DTO
   */
  private formatTransaction(tx: any): PaymentTransaction {
    if (!tx) return tx;

    return {
      id: tx.id,
      reference: tx.reference,
      bookingId: tx.bookingId,
      userId: tx.userId,
      amount: Number(tx.amount),
      currency: tx.currency,
      status: tx.status as any,
      method: tx.method as any,
      paystackReference: tx.paystackReference || null,
      paystackChannel: tx.paystackChannel || null,
      gatewayResponse: tx.gatewayResponse || null,
      webhookEventId: tx.webhookEventId || null,
      webhookReceivedAt: tx.webhookReceivedAt
        ? tx.webhookReceivedAt instanceof Date
          ? tx.webhookReceivedAt.toISOString()
          : tx.webhookReceivedAt
        : null,
      paidAt: tx.paidAt
        ? tx.paidAt instanceof Date
          ? tx.paidAt.toISOString()
          : tx.paidAt
        : null,
      failedAt: tx.failedAt
        ? tx.failedAt instanceof Date
          ? tx.failedAt.toISOString()
          : tx.failedAt
        : null,
      refundedAt: tx.refundedAt
        ? tx.refundedAt instanceof Date
          ? tx.refundedAt.toISOString()
          : tx.refundedAt
        : null,
      refundAmount: tx.refundAmount ? Number(tx.refundAmount) : null,
      refundReason: tx.refundReason || null,
      refundedBy: tx.refundedBy || null,
      createdAt:
        tx.createdAt instanceof Date
          ? tx.createdAt.toISOString()
          : tx.createdAt,
      updatedAt:
        tx.updatedAt instanceof Date
          ? tx.updatedAt.toISOString()
          : tx.updatedAt,
      booking: tx.booking
        ? {
            id: tx.booking.id,
            reference: tx.booking.reference,
            resourceName: tx.booking.resource?.name || "Workspace",
            startTime:
              tx.booking.startTime instanceof Date
                ? tx.booking.startTime.toISOString()
                : tx.booking.startTime,
            endTime:
              tx.booking.endTime instanceof Date
                ? tx.booking.endTime.toISOString()
                : tx.booking.endTime,
            state: tx.booking.state,
          }
        : undefined,
      invoice: tx.invoice
        ? {
            id: tx.invoice.id,
            invoiceNumber: tx.invoice.invoiceNumber,
            transactionId: tx.invoice.transactionId,
            bookingId: tx.invoice.bookingId,
            userId: tx.invoice.userId,
            subtotal: Number(tx.invoice.subtotal),
            tax: Number(tx.invoice.tax),
            total: Number(tx.invoice.total),
            currency: tx.invoice.currency,
            lineItems: Array.isArray(tx.invoice.lineItems)
              ? tx.invoice.lineItems
              : [],
            issuedAt:
              tx.invoice.issuedAt instanceof Date
                ? tx.invoice.issuedAt.toISOString()
                : tx.invoice.issuedAt,
            customerName: tx.invoice.customerName,
            customerEmail: tx.invoice.customerEmail,
            customerClientId: tx.invoice.customerClientId,
            resourceName: tx.invoice.resourceName,
            bookingReference: tx.invoice.bookingReference,
            createdAt:
              tx.invoice.createdAt instanceof Date
                ? tx.invoice.createdAt.toISOString()
                : tx.invoice.createdAt,
          }
        : null,
    };
  }

  /**
   * Initiates payment for an active booking hold
   */
  async initializePayment(
    bookingId: string,
    userId: string,
    callbackUrl?: string,
  ) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) {
      const err: any = new Error(`Booking '${bookingId}' not found`);
      err.statusCode = 404;
      err.code = "BOOKING_NOT_FOUND";
      throw err;
    }

    if (booking.userId !== userId) {
      const err: any = new Error(
        "You are not authorized to pay for this booking",
      );
      err.statusCode = 403;
      err.code = "FORBIDDEN";
      throw err;
    }

    if (
      booking.state !== BookingState.HELD &&
      booking.state !== BookingState.PENDING_PAYMENT
    ) {
      const err: any = new Error(
        `Cannot pay for booking in state '${booking.state}'`,
      );
      err.statusCode = 400;
      err.code = "INVALID_BOOKING_STATE";
      throw err;
    }

    // 1. Safeguard: Check if this booking has already been paid and confirmed
    const successfulTx = await prisma.transaction.findFirst({
      where: {
        bookingId: booking.id,
        status: PaymentStatus.SUCCESSFUL,
      },
    });
    if (successfulTx) {
      const err: any = new Error(
        `This booking has already been paid and confirmed (Reference: ${successfulTx.reference}).`,
      );
      err.statusCode = 400;
      err.code = "BOOKING_ALREADY_PAID";
      throw err;
    }

    // 2. Safeguard: Check if an active PENDING transaction exists and verify with Paystack first
    const recentPendingTx = await prisma.transaction.findFirst({
      where: {
        bookingId: booking.id,
        status: PaymentStatus.PENDING,
      },
      orderBy: { createdAt: "desc" },
    });

    if (recentPendingTx && recentPendingTx.paystackReference) {
      try {
        const verifyRes = await this.paystack.verifyTransaction(
          recentPendingTx.paystackReference,
        );
        if (
          verifyRes &&
          verifyRes.data &&
          verifyRes.data.status === "success"
        ) {
          // Immediately confirm booking to prevent double charge
          await this.handleWebhookEvent({
            event: "charge.success",
            data: verifyRes.data as any,
          });
          const err: any = new Error(
            `Payment already received and confirmed on Paystack (Reference: ${recentPendingTx.reference}).`,
          );
          err.statusCode = 400;
          err.code = "BOOKING_ALREADY_PAID";
          throw err;
        }
      } catch (e: any) {
        if (e.code === "BOOKING_ALREADY_PAID") throw e;
        console.warn(
          "Notice checking existing transaction before initialize:",
          e.message,
        );
      }
    }

    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const reference = `DAIH-PAY-${datePart}-${randomSuffix}`;
    const amount = Number(booking.totalAmount);
    const amountInKobo = Math.round(amount * 100);

    // Run interactive transaction for state change and transaction creation
    const { transaction, newHoldExpiresAt } = await prisma.$transaction(
      async (tx) => {
        // Extend hold by 15 minutes for payment session
        const holdExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

        await tx.booking.update({
          where: { id: booking.id },
          data: {
            state: BookingState.PENDING_PAYMENT,
            holdExpiresAt,
          },
        });

        const createdTx = await tx.transaction.create({
          data: {
            reference,
            bookingId: booking.id,
            userId,
            amount,
            currency: booking.currency || "NGN",
            status: PaymentStatus.PENDING,
            method: PaymentMethod.PAYSTACK,
            paystackReference: reference,
          },
        });

        await outboxService.recordEvent(
          {
            eventType: "payment.initialized",
            aggregateType: "Transaction",
            aggregateId: createdTx.id,
            payload: {
              transactionId: createdTx.id,
              reference,
              bookingId: booking.id,
              userId,
              amount,
              currency: booking.currency,
            },
          },
          tx,
        );

        return { transaction: createdTx, newHoldExpiresAt: holdExpiresAt };
      },
    );

    // Reschedule hold expiry job with new 15-minute window
    await scheduleHoldExpiry(booking.id, 15 * 60 * 1000);

    // Call Paystack gateway
    const paystackRes = await this.paystack.initializeTransaction({
      email: booking.user.email,
      amount: amountInKobo,
      reference,
      callbackUrl,
      metadata: {
        bookingId: booking.id,
        bookingReference: booking.reference,
        userId,
        transactionId: transaction.id,
      },
    });

    return {
      authorization_url: paystackRes.authorization_url,
      access_code: paystackRes.access_code,
      reference: paystackRes.reference,
      transactionId: transaction.id,
      amount,
      currency: booking.currency,
    };
  }

  /**
   * Handles incoming Paystack webhook idempotently
   */
  async handleWebhookEvent(event: PaystackWebhookPayload) {
    const eventId = String(event.data?.id || "");
    const reference = event.data?.reference;

    if (!reference) {
      console.warn("⚠️ Webhook event missing reference:", event.event);
      return { received: true, skipped: true };
    }

    // 1. Idempotency check: have we already recorded this Paystack event ID?
    if (eventId) {
      const existing = await this.repo.findByWebhookEventId(eventId);
      if (existing) {
        console.log(
          `⚡ Idempotent webhook received: Event ID '${eventId}' already processed for transaction '${existing.reference}'`,
        );
        return { received: true, duplicate: true };
      }
    }

    // 2. Lookup transaction by Paystack reference
    const transaction = await this.repo.findByPaystackReference(reference);
    if (!transaction) {
      console.warn(
        `⚠️ Orphan webhook received: No local transaction found for Paystack reference '${reference}'`,
      );
      return { received: true, orphan: true };
    }

    // 3. Process event inside atomic PostgreSQL transaction
    await prisma.$transaction(
      async (tx) => {
        if (event.event === "charge.success") {
          // Check fresh database state inside transaction to prevent concurrency races
          const currentTx = await tx.transaction.findUnique({
            where: { id: transaction.id },
          });
          if (currentTx && currentTx.status === PaymentStatus.SUCCESSFUL) {
            console.log(
              `⚡ Transaction '${transaction.reference}' is already SUCCESSFUL`,
            );
            return;
          }

          const paidAt = event.data.paid_at
            ? new Date(event.data.paid_at)
            : new Date();

          // Sanitize gateway response
          const gatewayResponse = {
            gateway_response: event.data.gateway_response || "Approved",
            channel: event.data.channel || "card",
            ip_address: event.data.ip_address || null,
            customer: event.data.customer || null,
            authorization: event.data.authorization || null,
          };

          // Update transaction
          await tx.transaction.update({
            where: { id: transaction.id },
            data: {
              status: PaymentStatus.SUCCESSFUL,
              paidAt,
              webhookEventId: eventId || null,
              webhookReceivedAt: new Date(),
              paystackChannel: event.data.channel || "card",
              gatewayResponse: gatewayResponse as any,
            },
          });

          // Fetch fresh booking state
          const booking = await tx.booking.findUnique({
            where: { id: transaction.bookingId },
            include: {
              resource: true,
              user: true,
            },
          });

          if (booking) {
            const customerName =
              `${booking.user.firstName || ""} ${booking.user.lastName || ""}`.trim() ||
              "Valued Customer";
            let qrToken: string | undefined;

            const canConfirm =
              booking.state === BookingState.HELD ||
              booking.state === BookingState.PENDING_PAYMENT ||
              booking.state === BookingState.EXPIRED;

            if (canConfirm) {
              // Handle late recovery if booking was EXPIRED
              if (booking.state === BookingState.EXPIRED) {
                const activeCount =
                  await bookingRepository.countActiveOverlappingBookings(
                    tx,
                    booking.resourceId,
                    booking.startTime,
                    booking.endTime,
                    booking.id,
                  );

                if (activeCount >= (booking.resource?.capacity || 1)) {
                  // Cannot confirm on this slot because capacity was taken by another user after hold expiry.
                  // Under the No-Refund Policy: We DO NOT refund. We retain the payment as SUCCESSFUL,
                  // set the booking state to NO_SHOW, and create an audit alert for the Operations Manager.
                  await tx.booking.update({
                    where: { id: booking.id },
                    data: {
                      state: BookingState.NO_SHOW,
                      holdExpiresAt: null,
                    },
                  });

                  // Create Invoice for retained payment
                  await this.invoices.createInvoiceForTransaction(tx, {
                    transactionId: transaction.id,
                    bookingId: booking.id,
                    userId: booking.userId,
                    customerName,
                    customerEmail: booking.user.email,
                    customerClientId:
                      booking.user.clientId ||
                      `DAIH-CUS-${booking.userId.slice(0, 8).toUpperCase()}`,
                    resourceName: booking.resource?.name || "Workspace",
                    bookingReference: booking.reference,
                    amount: Number(transaction.amount),
                    currency: transaction.currency,
                  });

                  // Write AuditLog for Capacity Conflict
                  await tx.auditLog.create({
                    data: {
                      userId: booking.userId,
                      action: "LATE_PAYMENT_CAPACITY_CONFLICT",
                      entityType: "Booking",
                      entityId: booking.id,
                      metadata: {
                        bookingId: booking.id,
                        reference: booking.reference,
                        resourceId: booking.resourceId,
                        amount: Number(transaction.amount),
                        currency: transaction.currency,
                        reason:
                          "Late payment confirmed after hold expiry; slot was occupied by another reservation. Marked as NO_SHOW for Operations Admin discretionary rescheduling.",
                      },
                    },
                  });

                  // Outbox Event
                  await outboxService.recordEvent(
                    {
                      eventType: "payment.capacity_conflict",
                      aggregateType: "Booking",
                      aggregateId: booking.id,
                      payload: {
                        transactionId: transaction.id,
                        bookingId: booking.id,
                        reference: booking.reference,
                        amount: Number(transaction.amount),
                        customerEmail: booking.user.email,
                        customerName,
                        requiresReschedule: true,
                      },
                    },
                    tx,
                  );

                  console.warn(
                    `⚠️ Late payment confirmed for expired booking '${booking.reference}', but slot is occupied. Retained payment and flagged for Operations Admin rescheduling.`,
                  );
                  return;
                }
              }

              // Confirm booking
              assertValidTransition(
                booking.state as any,
                BookingState.CONFIRMED,
                booking.id,
              );

              qrToken = `daih_qr_${booking.id}_${Date.now()}`;
              await tx.booking.update({
                where: { id: booking.id },
                data: {
                  state: BookingState.CONFIRMED,
                  qrToken,
                  holdExpiresAt: null,
                },
              });

              // Generate Invoice
              await this.invoices.createInvoiceForTransaction(tx, {
                transactionId: transaction.id,
                bookingId: booking.id,
                userId: booking.userId,
                customerName,
                customerEmail: booking.user.email,
                customerClientId:
                  booking.user.clientId ||
                  `DAIH-CUS-${booking.userId.slice(0, 8).toUpperCase()}`,
                resourceName: booking.resource?.name || "Workspace",
                bookingReference: booking.reference,
                amount: Number(transaction.amount),
                currency: transaction.currency,
              });

              // Confirm discount redemption if applicable
              await discountService.confirmRedemptionTx(
                tx,
                booking.id,
                transaction.id,
              );

              // Cancel delayed hold expiry job
              await cancelHoldExpiryJob(booking.id);
            } else {
              console.warn(
                `⚠️ Late payment received for booking '${booking.reference}' currently in terminal state '${booking.state}'. Retaining booking state and logging for finance review.`,
              );
            }

            // Audit log
            await tx.auditLog.create({
              data: {
                userId: booking.userId,
                action: "PAYMENT_SUCCESSFUL",
                entityType: "Transaction",
                entityId: transaction.id,
                metadata: {
                  bookingId: booking.id,
                  bookingReference: booking.reference,
                  amount: Number(transaction.amount),
                  currency: transaction.currency,
                  reference: transaction.reference,
                  paystackEventId: eventId,
                  channel: event.data.channel,
                },
              },
            });

            // Outbox events
            await outboxService.recordEvent(
              {
                eventType: "payment.successful",
                aggregateType: "Transaction",
                aggregateId: transaction.id,
                payload: {
                  transactionId: transaction.id,
                  bookingId: booking.id,
                  bookingReference: booking.reference,
                  amount: Number(transaction.amount),
                  currency: transaction.currency,
                  customerEmail: booking.user.email,
                  customerName,
                },
              },
              tx,
            );

            if (qrToken) {
              await outboxService.recordEvent(
                {
                  eventType: "booking.confirmed",
                  aggregateType: "Booking",
                  aggregateId: booking.id,
                  payload: {
                    bookingId: booking.id,
                    reference: booking.reference,
                    qrToken,
                    customerEmail: booking.user.email,
                  },
                },
                tx,
              );
            }
          }
        } else if (
          event.event === "charge.failed" ||
          event.event === "paymentrequest.failed"
        ) {
          await tx.transaction.update({
            where: { id: transaction.id },
            data: {
              status: PaymentStatus.FAILED,
              failedAt: new Date(),
              webhookEventId: eventId || null,
              webhookReceivedAt: new Date(),
              gatewayResponse: {
                gateway_response: event.data.gateway_response || "Failed",
              },
            },
          });

          await tx.auditLog.create({
            data: {
              userId: transaction.userId,
              action: "PAYMENT_FAILED",
              entityType: "Transaction",
              entityId: transaction.id,
              metadata: {
                reference: transaction.reference,
                paystackEventId: eventId,
                gatewayResponse: event.data.gateway_response,
              },
            },
          });

          await outboxService.recordEvent(
            {
              eventType: "payment.failed",
              aggregateType: "Transaction",
              aggregateId: transaction.id,
              payload: {
                transactionId: transaction.id,
                bookingId: transaction.bookingId,
                reference: transaction.reference,
              },
            },
            tx,
          );
        }
      },
      {
        maxWait: 15000,
        timeout: 20000,
      },
    );

    return { received: true, processed: true };
  }

  /**
   * Verify and sync payment status with Paystack (Customer polling or manual verification)
   */
  async verifyPayment(transactionIdOrRef: string, userId?: string) {
    let tx = await this.repo.findById(transactionIdOrRef);
    if (!tx) {
      tx = await this.repo.findByReference(transactionIdOrRef);
    }
    if (!tx) {
      tx = await this.repo.findByPaystackReference(transactionIdOrRef);
    }
    if (!tx) {
      // Support looking up latest transaction by booking ID
      tx = await prisma.transaction.findFirst({
        where: { bookingId: transactionIdOrRef },
        orderBy: { createdAt: "desc" },
        include: {
          booking: {
            include: {
              resource: true,
              user: true,
            },
          },
          user: true,
          invoice: true,
        },
      });
    }
    if (!tx) {
      const err: any = new Error(
        `Transaction '${transactionIdOrRef}' not found`,
      );
      err.statusCode = 404;
      err.code = "TRANSACTION_NOT_FOUND";
      throw err;
    }

    if (userId && tx.userId !== userId) {
      const err: any = new Error(
        "You are not authorized to view this transaction",
      );
      err.statusCode = 403;
      err.code = "FORBIDDEN";
      throw err;
    }

    // If still pending, query Paystack directly to sync
    if (tx.status === PaymentStatus.PENDING && tx.paystackReference) {
      try {
        const verifyRes = await this.paystack.verifyTransaction(
          tx.paystackReference,
        );
        if (verifyRes && verifyRes.data) {
          if (verifyRes.data.status === "success") {
            await this.handleWebhookEvent({
              event: "charge.success",
              data: verifyRes.data as any,
            });
            tx = await this.repo.findById(tx.id);
          } else if (
            verifyRes.data.status === "failed" ||
            verifyRes.data.status === "abandoned"
          ) {
            await this.handleWebhookEvent({
              event: "charge.failed",
              data: verifyRes.data as any,
            });
            tx = await this.repo.findById(tx.id);
          }
        } else if (verifyRes === null) {
          // Transaction reference was not found on Paystack (never sent to Paystack or abandoned)
          const ageMinutes =
            (Date.now() - new Date(tx.createdAt).getTime()) / (1000 * 60);
          if (ageMinutes >= 15) {
            await prisma.transaction.update({
              where: { id: tx.id },
              data: {
                status: PaymentStatus.FAILED,
                failedAt: new Date(),
                gatewayResponse: {
                  gateway_response:
                    "Transaction abandoned before Paystack registration",
                },
              },
            });
            tx = await this.repo.findById(tx.id);
          }
        }
      } catch (err: any) {
        console.warn("Notice checking Paystack verification:", err.message);
      }
    }

    return this.formatTransaction(tx);
  }

  /**
   * Get customer's personal payment history
   */
  async getPaymentHistory(
    userId: string,
    options?: { page?: number; limit?: number },
  ) {
    const res = await this.repo.findByUserId(userId, options);
    return {
      total: res.total,
      page: res.page,
      limit: res.limit,
      transactions: res.transactions.map((t) => this.formatTransaction(t)),
    };
  }

  /**
   * Get all transactions for Admin / Finance view
   */
  async getAdminTransactions(filters: {
    status?: PaymentStatus;
    method?: PaymentMethod;
    search?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const parseFilterDate = (d?: string, isEnd = false) => {
      if (!d) return undefined;
      const date = new Date(d);
      if (isNaN(date.getTime())) return undefined;
      if (isEnd && (d.length <= 10 || !d.includes("T"))) {
        date.setHours(23, 59, 59, 999);
      }
      return date;
    };

    const res = await this.repo.findAllAdminTransactions({
      ...filters,
      startDate: parseFilterDate(filters.startDate, false),
      endDate: parseFilterDate(filters.endDate, true),
    });

    return {
      total: res.total,
      page: res.page,
      limit: res.limit,
      transactions: res.transactions.map((t) => this.formatTransaction(t)),
    };
  }

  /**
   * Reconciliation View for Finance Officers
   */
  async getReconciliationView(
    startDateStr?: string,
    endDateStr?: string,
  ): Promise<ReconciliationSummary> {
    const startDate = startDateStr
      ? new Date(startDateStr)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = endDateStr ? new Date(endDateStr) : new Date();

    const transactions = await prisma.transaction.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        booking: {
          include: { resource: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    let totalCollected = 0;
    let totalRefunded = 0;
    let matchedCount = 0;
    const discrepancies: ReconciliationDiscrepancy[] = [];

    for (const t of transactions) {
      const amount = Number(t.amount);
      if (t.status === PaymentStatus.SUCCESSFUL) {
        totalCollected += amount;
        matchedCount++;
      } else if (
        t.status === PaymentStatus.REFUNDED ||
        t.status === PaymentStatus.PARTIALLY_REFUNDED
      ) {
        totalCollected += amount;
        totalRefunded += Number(t.refundAmount || amount);
        matchedCount++;
      } else if (t.status === PaymentStatus.FAILED) {
        // Failed is recorded
        matchedCount++;
      } else if (t.status === PaymentStatus.PENDING) {
        // Check if old pending transactions have discrepancies
        const ageHours =
          (Date.now() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60);
        if (ageHours > 24) {
          discrepancies.push({
            transactionId: t.id,
            reference: t.reference,
            type: "STATUS_MISMATCH",
            localStatus: PaymentStatus.PENDING as any,
            localAmount: amount,
            details:
              "Pending transaction older than 24 hours without resolution",
          });
        }
      }
    }

    return {
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      totalLocalTransactions: transactions.length,
      matchedCount,
      discrepancyCount: discrepancies.length,
      totalCollected,
      totalRefunded,
      netRevenue: totalCollected - totalRefunded,
      currency: "NGN",
      discrepancies,
    };
  }

  /**
   * Daily Payment Summary for Finance Dashboard
   */
  async getDailySummary(dateStr?: string): Promise<DailyPaymentSummary> {
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const startOfDay = new Date(
      Date.UTC(
        targetDate.getUTCFullYear(),
        targetDate.getUTCMonth(),
        targetDate.getUTCDate(),
        0,
        0,
        0,
      ),
    );
    const endOfDay = new Date(
      Date.UTC(
        targetDate.getUTCFullYear(),
        targetDate.getUTCMonth(),
        targetDate.getUTCDate(),
        23,
        59,
        59,
      ),
    );

    const transactions = await prisma.transaction.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    let successfulCount = 0;
    let successfulAmount = 0;
    let failedCount = 0;
    let failedAmount = 0;
    let refundedCount = 0;
    let refundedAmount = 0;
    let pendingCount = 0;
    let pendingAmount = 0;

    for (const t of transactions) {
      const amt = Number(t.amount);
      switch (t.status) {
        case PaymentStatus.SUCCESSFUL:
          successfulCount++;
          successfulAmount += amt;
          break;
        case PaymentStatus.FAILED:
          failedCount++;
          failedAmount += amt;
          break;
        case PaymentStatus.REFUNDED:
        case PaymentStatus.PARTIALLY_REFUNDED:
          refundedCount++;
          refundedAmount += Number(t.refundAmount || amt);
          successfulAmount += amt; // originally collected
          break;
        case PaymentStatus.PENDING:
          pendingCount++;
          pendingAmount += amt;
          break;
      }
    }

    return {
      date: startOfDay.toISOString().slice(0, 10),
      totalTransactions: transactions.length,
      successfulCount,
      successfulAmount,
      failedCount,
      failedAmount,
      refundedCount,
      refundedAmount,
      pendingCount,
      pendingAmount,
      netRevenue: successfulAmount - refundedAmount,
      currency: "NGN",
    };
  }
}

export const paymentsService = new PaymentsService();
