import { prisma } from "../../db/client.js";
import { Prisma } from "@prisma/client";
import {
  DiscountType,
  CustomerEligibility,
  RedemptionStatus,
  DiscountSource,
  BookingState,
  DiscountDTO,
  DiscountPreviewRequestDTO,
  DiscountPreviewResponseDTO,
  ApplyCourtesyDiscountDTO,
  DiscountRedemptionDTO,
  DiscountFilterDTO,
  DiscountListResponse,
} from "@daih/types";
import {
  calculatePreTaxDiscount,
  validateDiscountEligibility,
} from "./discount.engine.js";
import { normalizeCode } from "./discount.schema.js";
import { outboxService } from "../events/outbox.service.js";

export class DiscountService {
  /**
   * Format Prisma Discount record into clean DTO
   */
  public formatDiscount(d: any): DiscountDTO {
    return {
      id: d.id,
      code: d.code,
      name: d.name,
      description: d.description || null,
      type: d.type as DiscountType,
      value: Number(d.value),
      maxDiscountAmount: d.maxDiscountAmount
        ? Number(d.maxDiscountAmount)
        : null,
      minOrderAmount: Number(d.minOrderAmount || 0),
      currency: d.currency || "NGN",
      isAutomatic: Boolean(d.isAutomatic),
      isActive: Boolean(d.isActive),
      validFrom:
        d.validFrom instanceof Date ? d.validFrom.toISOString() : d.validFrom,
      validUntil: d.validUntil
        ? d.validUntil instanceof Date
          ? d.validUntil.toISOString()
          : d.validUntil
        : null,
      maxUsageTotal: d.maxUsageTotal ?? null,
      maxUsagePerUser: d.maxUsagePerUser ?? 1,
      currentUsageCount: d.currentUsageCount ?? 0,
      appliesToAll: Boolean(d.appliesToAll),
      targetCategories: d.targetCategories || [],
      customerEligibility: d.customerEligibility as CustomerEligibility,
      targetEmailDomains: d.targetEmailDomains || [],
      createdAt:
        d.createdAt instanceof Date ? d.createdAt.toISOString() : d.createdAt,
      updatedAt:
        d.updatedAt instanceof Date ? d.updatedAt.toISOString() : d.updatedAt,
      targetResources: d.targetResources
        ? d.targetResources.map((r: any) => ({
            id: r.id,
            discountId: r.discountId,
            resourceId: r.resourceId,
            resourceName: r.resource?.name,
            resourceSlug: r.resource?.slug,
          }))
        : undefined,
      targetCustomers: d.targetCustomers
        ? d.targetCustomers.map((c: any) => ({
            id: c.id,
            discountId: c.discountId,
            userId: c.userId,
            customerName: c.user
              ? `${c.user.firstName || ""} ${c.user.lastName || ""}`.trim() ||
                c.user.email
              : undefined,
            customerEmail: c.user?.email,
            customerClientId: c.user?.clientId,
          }))
        : undefined,
      redemptionsCount: d._count?.redemptions ?? undefined,
    };
  }

  /**
   * Format DiscountRedemption into clean DTO
   */
  public formatRedemption(r: any): DiscountRedemptionDTO {
    return {
      id: r.id,
      discountId: r.discountId || null,
      discountCode: r.discount?.code || null,
      discountName: r.discount?.name || null,
      userId: r.userId,
      customerName: r.user
        ? `${r.user.firstName || ""} ${r.user.lastName || ""}`.trim() ||
          r.user.email
        : undefined,
      customerEmail: r.user?.email,
      customerClientId: r.user?.clientId,
      bookingId: r.bookingId,
      bookingReference: r.booking?.reference,
      transactionId: r.transactionId || null,
      source: r.source as DiscountSource,
      appliedByStaffId: r.appliedByStaffId || null,
      appliedByStaffName: r.appliedByStaff
        ? `${r.appliedByStaff.firstName || ""} ${r.appliedByStaff.lastName || ""}`.trim() ||
          r.appliedByStaff.email
        : null,
      justificationNote: r.justificationNote || null,
      originalAmount: Number(r.originalAmount),
      discountAmount: Number(r.discountAmount),
      finalAmount: Number(r.finalAmount),
      status: r.status as RedemptionStatus,
      heldAt: r.heldAt instanceof Date ? r.heldAt.toISOString() : r.heldAt,
      appliedAt: r.appliedAt
        ? r.appliedAt instanceof Date
          ? r.appliedAt.toISOString()
          : r.appliedAt
        : null,
      releasedAt: r.releasedAt
        ? r.releasedAt instanceof Date
          ? r.releasedAt.toISOString()
          : r.releasedAt
        : null,
      createdAt:
        r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    };
  }

  /**
   * Preview discount breakdown for customer / admin checkout
   */
  async previewDiscount(
    userId: string,
    input: DiscountPreviewRequestDTO,
  ): Promise<DiscountPreviewResponseDTO> {
    // 1. Fetch resource and plan to find base price
    const resource = await prisma.facilityResource.findFirst({
      where: {
        OR: [{ id: input.resourceId }, { slug: input.resourceId }],
      },
      include: {
        pricing: { where: { isActive: true } },
      },
    });

    if (!resource || !resource.isActive) {
      return {
        eligible: false,
        basePrice: 0,
        discountAmount: 0,
        netTaxableSubtotal: 0,
        taxAmount: 0,
        grandTotal: 0,
        currency: "NGN",
        reason: "Workspace is offline or not found.",
      };
    }

    let basePrice = 4000;
    let currency = "NGN";
    if (input.planId) {
      const plan = resource.pricing.find((p) => p.id === input.planId);
      if (plan) {
        basePrice = Number(plan.price);
        currency = plan.currency;
      }
    } else if (resource.pricing.length > 0) {
      basePrice = Number(resource.pricing[0].price);
      currency = resource.pricing[0].currency;
    }

    // Fetch user context: prior bookings
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    const userPriorBookingsCount = await prisma.booking.count({
      where: {
        userId,
        state: {
          in: [
            BookingState.CONFIRMED,
            BookingState.ACTIVE,
            BookingState.COMPLETED,
          ],
        },
      },
    });

    // 2. Specific Promo Code flow
    if (input.code && input.code.trim()) {
      const normalized = normalizeCode(input.code);
      const discount = await prisma.discount.findUnique({
        where: { code: normalized },
        include: {
          targetResources: true,
          targetCustomers: true,
        },
      });

      if (!discount) {
        return {
          eligible: false,
          basePrice,
          discountAmount: 0,
          netTaxableSubtotal: basePrice,
          taxAmount: 0,
          grandTotal: basePrice,
          currency,
          reason: `Promo code '${normalized}' is invalid.`,
          isAutomatic: false,
        };
      }

      const userPriorRedemptionsCount = await prisma.discountRedemption.count({
        where: {
          discountId: discount.id,
          userId,
          status: { in: [RedemptionStatus.HELD, RedemptionStatus.APPLIED] },
        },
      });

      const validation = validateDiscountEligibility({
        discount: discount as any,
        context: {
          userId,
          userEmail: user?.email,
          userPriorBookingsCount,
          userPriorRedemptionsCount,
          resourceId: resource.id,
          resourceCategory: resource.category as any,
          basePrice,
        },
      });

      if (!validation.valid) {
        return {
          eligible: false,
          discountId: discount.id,
          code: discount.code || undefined,
          name: discount.name,
          basePrice,
          discountAmount: 0,
          netTaxableSubtotal: basePrice,
          taxAmount: 0,
          grandTotal: basePrice,
          currency,
          reason: validation.reason,
          isAutomatic: false,
        };
      }

      const breakdown = calculatePreTaxDiscount({
        basePrice,
        type: discount.type as DiscountType,
        value: Number(discount.value),
        maxDiscountAmount: discount.maxDiscountAmount
          ? Number(discount.maxDiscountAmount)
          : null,
        taxRate: 0,
      });

      return {
        eligible: true,
        discountId: discount.id,
        code: discount.code || undefined,
        name: discount.name,
        discountType: discount.type as DiscountType,
        discountValue: Number(discount.value),
        basePrice: breakdown.basePrice,
        discountAmount: breakdown.discountAmount,
        netTaxableSubtotal: breakdown.netTaxableSubtotal,
        taxAmount: breakdown.taxAmount,
        grandTotal: breakdown.grandTotal,
        currency,
        isAutomatic: Boolean(discount.isAutomatic),
      };
    }

    // 3. Automatic Discount flow: evaluate all active automatic promotions and pick best eligible candidate
    const automaticDiscounts = await prisma.discount.findMany({
      where: { isAutomatic: true, isActive: true },
      include: { targetResources: true, targetCustomers: true },
      orderBy: { createdAt: "desc" },
    });

    let bestMatch: {
      discount: any;
      breakdown: any;
    } | null = null;

    for (const cand of automaticDiscounts) {
      const userPriorRedemptionsCount = await prisma.discountRedemption.count({
        where: {
          discountId: cand.id,
          userId,
          status: { in: [RedemptionStatus.HELD, RedemptionStatus.APPLIED] },
        },
      });

      const validation = validateDiscountEligibility({
        discount: cand as any,
        context: {
          userId,
          userEmail: user?.email,
          userPriorBookingsCount,
          userPriorRedemptionsCount,
          resourceId: resource.id,
          resourceCategory: resource.category as any,
          basePrice,
        },
      });

      if (validation.valid) {
        const breakdown = calculatePreTaxDiscount({
          basePrice,
          type: cand.type as DiscountType,
          value: Number(cand.value),
          maxDiscountAmount: cand.maxDiscountAmount
            ? Number(cand.maxDiscountAmount)
            : null,
          taxRate: 0,
        });

        if (
          !bestMatch ||
          breakdown.discountAmount > bestMatch.breakdown.discountAmount
        ) {
          bestMatch = { discount: cand, breakdown };
        }
      }
    }

    if (!bestMatch || bestMatch.breakdown.discountAmount <= 0) {
      return {
        eligible: false,
        basePrice,
        discountAmount: 0,
        netTaxableSubtotal: basePrice,
        taxAmount: 0,
        grandTotal: basePrice,
        currency,
        isAutomatic: false,
      };
    }

    return {
      eligible: true,
      discountId: bestMatch.discount.id,
      code: bestMatch.discount.code || undefined,
      name: bestMatch.discount.name,
      discountType: bestMatch.discount.type as DiscountType,
      discountValue: Number(bestMatch.discount.value),
      basePrice: bestMatch.breakdown.basePrice,
      discountAmount: bestMatch.breakdown.discountAmount,
      netTaxableSubtotal: bestMatch.breakdown.netTaxableSubtotal,
      taxAmount: bestMatch.breakdown.taxAmount,
      grandTotal: bestMatch.breakdown.grandTotal,
      currency,
      isAutomatic: true,
    };
  }

  /**
   * Applies a promo code during booking hold creation inside an interactive Prisma transaction.
   * Locks the discount row to prevent concurrent race conditions on limited-quantity codes.
   */
  async applyDiscountToHoldTx(
    tx: Prisma.TransactionClient,
    params: {
      bookingId: string;
      userId: string;
      userEmail?: string;
      resourceId: string;
      resourceCategory: any;
      basePrice: number;
      promoCode?: string;
    },
  ) {
    const {
      bookingId,
      userId,
      userEmail,
      resourceId,
      resourceCategory,
      basePrice,
      promoCode,
    } = params;

    const userPriorBookingsCount = await tx.booking.count({
      where: {
        userId,
        state: {
          in: [
            BookingState.CONFIRMED,
            BookingState.ACTIVE,
            BookingState.COMPLETED,
          ],
        },
      },
    });

    // 1. Promo code provided explicitly
    if (promoCode && promoCode.trim()) {
      const normalized = normalizeCode(promoCode);

      // Lock the discount row for update to serialize quota checks
      const rows: any[] = await tx.$queryRaw`
        SELECT id FROM "discounts" WHERE code = ${normalized} FOR UPDATE
      `;
      if (rows.length === 0) {
        const error: any = new Error(`Promo code '${normalized}' is invalid.`);
        error.statusCode = 404;
        error.code = "PROMO_CODE_NOT_FOUND";
        throw error;
      }

      const discount = await tx.discount.findUnique({
        where: { id: rows[0].id },
        include: {
          targetResources: true,
          targetCustomers: true,
        },
      });

      if (!discount) {
        const error: any = new Error(`Promo code '${normalized}' is invalid.`);
        error.statusCode = 404;
        error.code = "PROMO_CODE_NOT_FOUND";
        throw error;
      }

      const userPriorRedemptionsCount = await tx.discountRedemption.count({
        where: {
          discountId: discount.id,
          userId,
          status: { in: [RedemptionStatus.HELD, RedemptionStatus.APPLIED] },
        },
      });

      const validation = validateDiscountEligibility({
        discount: discount as any,
        context: {
          userId,
          userEmail,
          userPriorBookingsCount,
          userPriorRedemptionsCount,
          resourceId,
          resourceCategory,
          basePrice,
        },
      });

      if (!validation.valid) {
        const error: any = new Error(
          validation.reason || "Promotion is not applicable.",
        );
        error.statusCode = 400;
        error.code = "DISCOUNT_NOT_ELIGIBLE";
        throw error;
      }

      const breakdown = calculatePreTaxDiscount({
        basePrice,
        type: discount.type as DiscountType,
        value: Number(discount.value),
        maxDiscountAmount: discount.maxDiscountAmount
          ? Number(discount.maxDiscountAmount)
          : null,
      });

      // Create redemption record in HELD state
      await tx.discountRedemption.create({
        data: {
          discountId: discount.id,
          userId,
          bookingId,
          source: discount.isAutomatic
            ? DiscountSource.AUTOMATIC
            : DiscountSource.CUSTOMER_COUPON,
          originalAmount: basePrice,
          discountAmount: breakdown.discountAmount,
          finalAmount: breakdown.grandTotal,
          status: RedemptionStatus.HELD,
        },
      });

      return {
        discountId: discount.id,
        discountCode: discount.code,
        discountAmount: breakdown.discountAmount,
        finalAmount: breakdown.grandTotal,
      };
    }

    // 2. Automatic Discount: Evaluate all active automatic discounts and select best match
    const automaticDiscounts = await tx.discount.findMany({
      where: { isAutomatic: true, isActive: true },
      include: { targetResources: true, targetCustomers: true },
      orderBy: { createdAt: "desc" },
    });

    let bestDiscountMatch: {
      discount: any;
      breakdown: any;
    } | null = null;

    for (const cand of automaticDiscounts) {
      const userPriorRedemptionsCount = await tx.discountRedemption.count({
        where: {
          discountId: cand.id,
          userId,
          status: { in: [RedemptionStatus.HELD, RedemptionStatus.APPLIED] },
        },
      });

      const validation = validateDiscountEligibility({
        discount: cand as any,
        context: {
          userId,
          userEmail,
          userPriorBookingsCount,
          userPriorRedemptionsCount,
          resourceId,
          resourceCategory,
          basePrice,
        },
      });

      if (validation.valid) {
        const breakdown = calculatePreTaxDiscount({
          basePrice,
          type: cand.type as DiscountType,
          value: Number(cand.value),
          maxDiscountAmount: cand.maxDiscountAmount
            ? Number(cand.maxDiscountAmount)
            : null,
        });

        if (
          !bestDiscountMatch ||
          breakdown.discountAmount > bestDiscountMatch.breakdown.discountAmount
        ) {
          bestDiscountMatch = { discount: cand, breakdown };
        }
      }
    }

    if (!bestDiscountMatch || bestDiscountMatch.breakdown.discountAmount <= 0) {
      return {
        discountId: null,
        discountCode: null,
        discountAmount: 0,
        finalAmount: basePrice,
      };
    }

    const { discount, breakdown } = bestDiscountMatch;

    // Create redemption record in HELD state
    await tx.discountRedemption.create({
      data: {
        discountId: discount.id,
        userId,
        bookingId,
        source: DiscountSource.AUTOMATIC,
        originalAmount: basePrice,
        discountAmount: breakdown.discountAmount,
        finalAmount: breakdown.grandTotal,
        status: RedemptionStatus.HELD,
      },
    });

    return {
      discountId: discount.id,
      discountCode: discount.code,
      discountAmount: breakdown.discountAmount,
      finalAmount: breakdown.grandTotal,
    };
  }

  /**
   * Release held discount redemption when a booking hold expires or is cancelled.
   */
  async releaseHeldRedemptionTx(
    tx: Prisma.TransactionClient,
    bookingId: string,
  ) {
    const held = await tx.discountRedemption.findFirst({
      where: {
        bookingId,
        status: RedemptionStatus.HELD,
      },
    });

    if (held) {
      await tx.discountRedemption.update({
        where: { id: held.id },
        data: {
          status: RedemptionStatus.RELEASED,
          releasedAt: new Date(),
        },
      });
      console.log(
        `🎟️ Released held discount redemption '${held.id}' for booking '${bookingId}'`,
      );
    }
  }

  /**
   * Confirm discount redemption when payment succeeds (via Paystack webhook).
   */
  async confirmRedemptionTx(
    tx: Prisma.TransactionClient,
    bookingId: string,
    transactionId: string,
  ) {
    const redemption = await tx.discountRedemption.findFirst({
      where: {
        bookingId,
        status: RedemptionStatus.HELD,
      },
    });

    if (redemption) {
      await tx.discountRedemption.update({
        where: { id: redemption.id },
        data: {
          status: RedemptionStatus.APPLIED,
          appliedAt: new Date(),
          transactionId,
        },
      });

      if (redemption.discountId) {
        await tx.discount.update({
          where: { id: redemption.discountId },
          data: {
            currentUsageCount: { increment: 1 },
          },
        });
      }

      console.log(
        `🎟️ Confirmed discount redemption '${redemption.id}' for booking '${bookingId}' (Transaction: ${transactionId})`,
      );
    }
  }

  /**
   * Staff Courtesy Override:
   * Guardrail 1: Strictly prohibited on bookings in PENDING_PAYMENT state.
   * Guardrail 2: Writes an immutable record to AuditLog with staff ID, reason, and financial details.
   */
  async applyCourtesyOverride(
    staffUserId: string,
    bookingId: string,
    input: ApplyCourtesyDiscountDTO,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        resource: { include: { pricing: true } },
        user: true,
      },
    });

    if (!booking) {
      const error: any = new Error(`Booking '${bookingId}' not found`);
      error.statusCode = 404;
      error.code = "BOOKING_NOT_FOUND";
      throw error;
    }

    // STRICT GUARDRAIL 1: Payment pending cannot be overridden
    if (booking.state === BookingState.PENDING_PAYMENT) {
      const error: any = new Error(
        "Cannot apply or modify a courtesy discount while payment is pending. The active payment session must complete, expire, or be cancelled first.",
      );
      error.statusCode = 409;
      error.code = "CANNOT_OVERRIDE_PAYMENT_PENDING";
      throw error;
    }

    if (
      booking.state !== BookingState.DRAFT &&
      booking.state !== BookingState.HELD
    ) {
      const error: any = new Error(
        `Cannot apply courtesy discount to booking in state '${booking.state}'. Only DRAFT or initial HELD bookings can be modified.`,
      );
      error.statusCode = 400;
      error.code = "INVALID_BOOKING_STATE";
      throw error;
    }

    // Determine base list price
    const basePrice =
      Number(booking.originalAmount) || Number(booking.totalAmount);

    let calculatedDiscount = 0;
    let newTotal = 0;

    if (input.waiveFee) {
      calculatedDiscount = basePrice;
      newTotal = 0;
    } else {
      const breakdown = calculatePreTaxDiscount({
        basePrice,
        type: input.type,
        value: input.value,
      });
      calculatedDiscount = breakdown.discountAmount;
      newTotal = breakdown.grandTotal;
    }

    // Execute atomic update, immutable redemption creation, and audit logging
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update booking amounts
      const updatedBooking = await tx.booking.update({
        where: { id: booking.id },
        data: {
          originalAmount: basePrice,
          discountAmount: calculatedDiscount,
          totalAmount: newTotal,
        },
      });

      // 2. Insert immutable redemption record
      const redemption = await tx.discountRedemption.create({
        data: {
          userId: booking.userId,
          bookingId: booking.id,
          source: DiscountSource.STAFF_OVERRIDE,
          appliedByStaffId: staffUserId,
          justificationNote: input.justificationNote,
          originalAmount: basePrice,
          discountAmount: calculatedDiscount,
          finalAmount: newTotal,
          status: RedemptionStatus.HELD,
        },
        include: {
          appliedByStaff: true,
          user: true,
          booking: true,
        },
      });

      // 3. STRICT GUARDRAIL 2: Write immutable audit log entry
      await tx.auditLog.create({
        data: {
          userId: staffUserId,
          action: "DISCOUNT_COURTESY_OVERRIDE_APPLIED",
          entityType: "Booking",
          entityId: booking.id,
          metadata: {
            bookingReference: booking.reference,
            customerId: booking.userId,
            customerEmail: booking.user?.email,
            staffUserId,
            previousAmount: Number(booking.totalAmount),
            basePrice,
            discountType: input.type,
            discountValue: input.value,
            discountAmountDeducted: calculatedDiscount,
            newTotalAmount: newTotal,
            waivedFee: Boolean(input.waiveFee),
            justificationNote: input.justificationNote,
            ipAddress,
            userAgent,
            timestamp: new Date().toISOString(),
          },
          ipAddress,
        },
      });

      // 4. Emit outbox event
      await outboxService.recordEvent(
        {
          eventType: "booking.courtesy_discount_applied",
          aggregateType: "Booking",
          aggregateId: booking.id,
          payload: {
            bookingId: booking.id,
            reference: booking.reference,
            staffUserId,
            discountAmount: calculatedDiscount,
            newTotalAmount: newTotal,
            justificationNote: input.justificationNote,
          },
        },
        tx,
      );

      return { updatedBooking, redemption };
    });

    return {
      success: true,
      message: "Staff courtesy override successfully applied.",
      booking: result.updatedBooking,
      redemption: this.formatRedemption(result.redemption),
    };
  }

  /**
   * Admin: Create a new Discount rule
   */
  async createDiscount(
    input: any,
    staffUserId: string,
    ipAddress?: string,
  ): Promise<DiscountDTO> {
    if (input.code) {
      const existing = await prisma.discount.findUnique({
        where: { code: input.code },
      });
      if (existing) {
        const err: any = new Error(
          `Promo code '${input.code}' already exists. Please choose another code.`,
        );
        err.statusCode = 409;
        err.code = "PROMO_CODE_EXISTS";
        throw err;
      }
    }

    const { targetResourceIds, targetCustomerIds, ...discountData } = input;

    const created = await prisma.discount.create({
      data: {
        ...discountData,
        targetResources:
          targetResourceIds && targetResourceIds.length > 0
            ? {
                create: targetResourceIds.map((resourceId: string) => ({
                  resourceId,
                })),
              }
            : undefined,
        targetCustomers:
          targetCustomerIds && targetCustomerIds.length > 0
            ? {
                create: targetCustomerIds.map((userId: string) => ({
                  userId,
                })),
              }
            : undefined,
      },
      include: {
        targetResources: { include: { resource: true } },
        targetCustomers: { include: { user: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: staffUserId,
        action: "DISCOUNT_RULE_CREATED",
        entityType: "Discount",
        entityId: created.id,
        metadata: {
          code: created.code,
          name: created.name,
          type: created.type,
          value: Number(created.value),
        },
        ipAddress,
      },
    });

    return this.formatDiscount(created);
  }

  /**
   * Admin: Update Discount rule
   */
  async updateDiscount(
    id: string,
    input: any,
    staffUserId: string,
    ipAddress?: string,
  ): Promise<DiscountDTO> {
    const existing = await prisma.discount.findUnique({ where: { id } });
    if (!existing) {
      const err: any = new Error(`Discount '${id}' not found`);
      err.statusCode = 404;
      err.code = "DISCOUNT_NOT_FOUND";
      throw err;
    }

    if (input.code && input.code !== existing.code) {
      const duplicate = await prisma.discount.findUnique({
        where: { code: input.code },
      });
      if (duplicate && duplicate.id !== id) {
        const err: any = new Error(
          `Promo code '${input.code}' is already taken.`,
        );
        err.statusCode = 409;
        err.code = "PROMO_CODE_EXISTS";
        throw err;
      }
    }

    const { targetResourceIds, targetCustomerIds, ...updateData } = input;

    const updated = await prisma.$transaction(async (tx) => {
      if (targetResourceIds !== undefined) {
        await tx.discountTargetResource.deleteMany({
          where: { discountId: id },
        });
        if (targetResourceIds.length > 0) {
          await tx.discountTargetResource.createMany({
            data: targetResourceIds.map((resourceId: string) => ({
              discountId: id,
              resourceId,
            })),
          });
        }
      }

      if (targetCustomerIds !== undefined) {
        await tx.discountTargetCustomer.deleteMany({
          where: { discountId: id },
        });
        if (targetCustomerIds.length > 0) {
          await tx.discountTargetCustomer.createMany({
            data: targetCustomerIds.map((userId: string) => ({
              discountId: id,
              userId,
            })),
          });
        }
      }

      return tx.discount.update({
        where: { id },
        data: updateData,
        include: {
          targetResources: { include: { resource: true } },
          targetCustomers: { include: { user: true } },
        },
      });
    });

    await prisma.auditLog.create({
      data: {
        userId: staffUserId,
        action: "DISCOUNT_RULE_UPDATED",
        entityType: "Discount",
        entityId: id,
        metadata: { changes: input },
        ipAddress,
      },
    });

    return this.formatDiscount(updated);
  }

  /**
   * Admin: Toggle active status
   */
  async toggleDiscountStatus(
    id: string,
    isActive: boolean,
    staffUserId: string,
    ipAddress?: string,
  ): Promise<DiscountDTO> {
    const updated = await prisma.discount.update({
      where: { id },
      data: { isActive },
      include: {
        targetResources: { include: { resource: true } },
        targetCustomers: { include: { user: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: staffUserId,
        action: "DISCOUNT_STATUS_TOGGLED",
        entityType: "Discount",
        entityId: id,
        metadata: { isActive },
        ipAddress,
      },
    });

    return this.formatDiscount(updated);
  }

  /**
   * Admin: Delete Discount rule
   */
  async deleteDiscount(id: string, staffUserId: string, ipAddress?: string) {
    const existing = await prisma.discount.findUnique({
      where: { id },
      include: { _count: { select: { redemptions: true } } },
    });
    if (!existing) {
      const err: any = new Error(`Discount '${id}' not found`);
      err.statusCode = 404;
      err.code = "DISCOUNT_NOT_FOUND";
      throw err;
    }

    await prisma.discount.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: staffUserId,
        action: "DISCOUNT_RULE_DELETED",
        entityType: "Discount",
        entityId: id,
        metadata: { code: existing.code, name: existing.name },
        ipAddress,
      },
    });

    return { success: true, message: `Discount '${existing.name}' deleted.` };
  }

  /**
   * Get single Discount by ID
   */
  async getDiscountById(id: string): Promise<DiscountDTO> {
    const discount = await prisma.discount.findUnique({
      where: { id },
      include: {
        targetResources: { include: { resource: true } },
        targetCustomers: { include: { user: true } },
        _count: { select: { redemptions: true } },
      },
    });
    if (!discount) {
      const err: any = new Error(`Discount '${id}' not found`);
      err.statusCode = 404;
      err.code = "DISCOUNT_NOT_FOUND";
      throw err;
    }
    return this.formatDiscount(discount);
  }

  /**
   * Admin: List discounts with search, filters, and pagination
   */
  async listDiscounts(
    filters: DiscountFilterDTO,
  ): Promise<DiscountListResponse> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.DiscountWhereInput = {};

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { code: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.type) {
      where.type = filters.type;
    }

    const [discounts, total] = await Promise.all([
      prisma.discount.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          targetResources: { include: { resource: true } },
          targetCustomers: { include: { user: true } },
          _count: { select: { redemptions: true } },
        },
      }),
      prisma.discount.count({ where }),
    ]);

    return {
      discounts: discounts.map((d) => this.formatDiscount(d)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Admin: Get redemption audit logs for a specific discount or all redemptions
   */
  async getRedemptions(
    discountId?: string,
    query: { page?: number; limit?: number } = {},
  ) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.DiscountRedemptionWhereInput = {};
    if (discountId) {
      where.discountId = discountId;
    }

    const [redemptions, total] = await Promise.all([
      prisma.discountRedemption.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          discount: true,
          user: true,
          appliedByStaff: true,
          booking: true,
        },
      }),
      prisma.discountRedemption.count({ where }),
    ]);

    return {
      redemptions: redemptions.map((r) => this.formatRedemption(r)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}

export const discountService = new DiscountService();
