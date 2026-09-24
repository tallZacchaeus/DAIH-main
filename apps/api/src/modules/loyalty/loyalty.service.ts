import { prisma } from "../../db/client.js";
import { Prisma } from "@prisma/client";
import { loyaltyRepository, LoyaltyRepository } from "./loyalty.repository.js";
import {
  LoyaltySettingsRecord,
  LoyaltyWalletDTO,
  LoyaltyLedgerListResponse,
  AdminLoyaltyStatsDTO,
  AdminManualAdjustmentDTO,
  RedemptionPreviewRequestDTO,
  RedemptionPreviewResponseDTO,
  UpdateLoyaltySettingsDTO,
} from "@daih/types";
import { coinService } from "./coin.service.js";

export class LoyaltyService {
  constructor(private repo: LoyaltyRepository = loyaltyRepository) {}

  /**
   * Pure formula engine to compute transaction coins from net cash spent
   */
  calculateTransactionCoins(
    netCashAmount: number,
    settings: LoyaltySettingsRecord,
  ): number {
    if (!settings.isProgramActive || !settings.isTransactionRewardEnabled) {
      return 0;
    }

    if (netCashAmount <= 0) {
      return 0;
    }

    if (netCashAmount < settings.minSpendThreshold) {
      return 0;
    }

    let rawCoins = 0;

    switch (settings.formulaMode) {
      case "SPEND_RATIO": {
        const ratio = settings.spendRatioNgn > 0 ? settings.spendRatioNgn : 100;
        rawCoins = Math.floor(netCashAmount / ratio);
        break;
      }

      case "PERCENTAGE": {
        const percent = Math.max(0, settings.percentageRate || 0);
        rawCoins = Math.floor((netCashAmount * percent) / 100);
        break;
      }

      case "FIXED_AMOUNT": {
        rawCoins = Math.floor(settings.fixedAmountCoins || 0);
        break;
      }

      default: {
        const ratio = settings.spendRatioNgn > 0 ? settings.spendRatioNgn : 100;
        rawCoins = Math.floor(netCashAmount / ratio);
        break;
      }
    }

    if (
      settings.maxCoinsPerTransaction !== null &&
      settings.maxCoinsPerTransaction !== undefined &&
      settings.maxCoinsPerTransaction > 0
    ) {
      rawCoins = Math.min(rawCoins, settings.maxCoinsPerTransaction);
    }

    return Math.max(0, rawCoins);
  }

  /**
   * Calculate coin redemption value in NGN and applicable limits
   */
  calculateRedemptionDiscount(
    coinsToRedeem: number,
    bookingTotal: number,
    settings: LoyaltySettingsRecord,
  ): RedemptionPreviewResponseDTO {
    if (!settings.isProgramActive || !settings.isRedemptionEnabled) {
      return {
        valid: false,
        discountAmountNgn: 0,
        coinsRedeemed: 0,
        remainingTotalNgn: bookingTotal,
        message: "Coin redemption is currently disabled by administrator",
      };
    }

    if (coinsToRedeem <= 0) {
      return {
        valid: false,
        discountAmountNgn: 0,
        coinsRedeemed: 0,
        remainingTotalNgn: bookingTotal,
        message: "Coins to redeem must be greater than zero",
      };
    }

    if (coinsToRedeem < settings.minCoinsToRedeem) {
      return {
        valid: false,
        discountAmountNgn: 0,
        coinsRedeemed: 0,
        remainingTotalNgn: bookingTotal,
        message: `A minimum of ${settings.minCoinsToRedeem} ${settings.coinName}s is required for checkout redemption`,
      };
    }

    const conversionRate =
      settings.redemptionRateCoins > 0
        ? settings.redemptionRateNgn / settings.redemptionRateCoins
        : 1;

    const requestedDiscountNgn = coinsToRedeem * conversionRate;
    const maxAllowedDiscountNgn =
      (bookingTotal * settings.maxDiscountPercent) / 100;
    const effectiveDiscountNgn = Math.min(
      requestedDiscountNgn,
      maxAllowedDiscountNgn,
    );
    const effectiveCoins = Math.ceil(effectiveDiscountNgn / conversionRate);

    return {
      valid: true,
      discountAmountNgn: Math.round(effectiveDiscountNgn * 100) / 100,
      coinsRedeemed: effectiveCoins,
      remainingTotalNgn: Math.max(
        0,
        Math.round((bookingTotal - effectiveDiscountNgn) * 100) / 100,
      ),
    };
  }

  /**
   * Award coins on successful payment (Transaction reward + Active referral bonus)
   */
  async awardPaymentReward(
    tx: Prisma.TransactionClient,
    transactionId: string,
  ): Promise<{
    transactionCoinsAwarded: number;
    referralBonusAwarded: number;
  }> {
    const transaction = await tx.transaction.findUnique({
      where: { id: transactionId },
      include: {
        booking: true,
        user: true,
      },
    });

    if (!transaction || !transaction.user) {
      return { transactionCoinsAwarded: 0, referralBonusAwarded: 0 };
    }

    const settings = await this.repo.getSettings();
    let transactionCoinsAwarded = 0;
    let referralBonusAwarded = 0;

    // 1. Transaction Reward (computed strictly on net fiat settled: transaction.amount)
    const netCashAmount = Number(transaction.amount);
    const coinsToAward = this.calculateTransactionCoins(
      netCashAmount,
      settings,
    );

    if (coinsToAward > 0) {
      const creditRes = await this.repo.creditCoins(
        transaction.userId,
        coinsToAward,
        "TRANSACTION_REWARD",
        transaction.id,
        `Earned ${coinsToAward} ${settings.coinSymbol} for booking ${transaction.booking.reference}`,
        {
          transactionId: transaction.id,
          bookingReference: transaction.booking.reference,
          netAmountPaidNgn: netCashAmount,
          formulaMode: settings.formulaMode,
        },
        tx,
      );

      if (!creditRes.duplicate) {
        transactionCoinsAwarded = coinsToAward;
      }
    }

    // 2. Active Referral Bonus Check
    if (
      settings.isProgramActive &&
      settings.isReferralRewardEnabled &&
      settings.coinsPerActiveReferral > 0 &&
      transaction.user.referredById &&
      transaction.user.referredById !== transaction.user.id
    ) {
      const referrerId = transaction.user.referredById;
      const refereeId = transaction.user.id;

      // Defense-in-depth: registration timestamp must precede or match booking creation
      const refereeCreatedAt = new Date(transaction.user.createdAt).getTime();
      const bookingCreatedAt = new Date(
        transaction.booking.createdAt,
      ).getTime();
      const isTimelineValid = refereeCreatedAt <= bookingCreatedAt + 60000; // 1 min buffer

      if (isTimelineValid) {
        // Check if referee reward has already been claimed
        const alreadyClaimed = await this.repo.hasRefereeRewardBeenClaimed(
          refereeId,
          tx,
        );

        if (!alreadyClaimed) {
          // Check if this is the referee's first paid booking
          const priorPaidCount = await tx.transaction.count({
            where: {
              userId: refereeId,
              status: "SUCCESSFUL",
              id: { not: transaction.id },
            },
          });

          if (
            priorPaidCount === 0 &&
            netCashAmount >= settings.minSpendThreshold
          ) {
            // Credit referrer
            const refCreditRes = await this.repo.creditCoins(
              referrerId,
              settings.coinsPerActiveReferral,
              "ACTIVE_REFERRAL_BONUS",
              refereeId, // Use refereeId as unique referenceId!
              `Earned ${settings.coinsPerActiveReferral} ${settings.coinSymbol} for active referral (${transaction.user.firstName} ${transaction.user.lastName})`,
              {
                refereeId,
                refereeName:
                  `${transaction.user.firstName} ${transaction.user.lastName}`.trim(),
                qualifyingBookingId: transaction.bookingId,
              },
              tx,
            );

            if (!refCreditRes.duplicate) {
              referralBonusAwarded = settings.coinsPerActiveReferral;
              await this.repo.recordReferralReward(
                {
                  referrerId,
                  refereeId,
                  bookingId: transaction.bookingId,
                  coinsAwarded: settings.coinsPerActiveReferral,
                },
                tx,
              );
            }

            // Optional: referee welcome bonus
            if (settings.refereeWelcomeBonus > 0) {
              await this.repo.creditCoins(
                refereeId,
                settings.refereeWelcomeBonus,
                "REFEREE_WELCOME_BONUS",
                referrerId, // Use referrerId as unique referenceId
                `Welcome bonus of ${settings.refereeWelcomeBonus} ${settings.coinSymbol} for joining via referral`,
                {
                  referredBy: referrerId,
                },
                tx,
              );
            }
          }
        }
      }
    }

    return { transactionCoinsAwarded, referralBonusAwarded };
  }

  /**
   * Preview coin redemption at checkout
   */
  async previewRedemption(
    userId: string,
    dto: RedemptionPreviewRequestDTO,
  ): Promise<RedemptionPreviewResponseDTO> {
    const booking = await prisma.booking.findUnique({
      where: { id: dto.bookingId },
      include: { resource: true },
    });

    if (!booking) {
      const err: any = new Error("Booking not found");
      err.statusCode = 404;
      throw err;
    }

    if (booking.userId !== userId) {
      const err: any = new Error("Forbidden: Booking does not belong to you");
      err.statusCode = 403;
      throw err;
    }

    const [settings, wallet] = await Promise.all([
      this.repo.getSettings(),
      this.repo.getWalletDTO(userId),
    ]);

    const previousCoinDiscount = Number(booking.redeemedCoinsNgn || 0);
    const nonCoinDiscount = Math.max(
      0,
      Number(booking.discountAmount || 0) - previousCoinDiscount,
    );
    const grossPrice = Number(
      booking.originalAmount ||
        Number(booking.totalAmount) + Number(booking.discountAmount || 0),
    );
    const bookingTotal = Math.max(0, grossPrice - nonCoinDiscount);

    if (dto.coinsToRedeem === 0) {
      return {
        valid: true,
        discountAmountNgn: 0,
        coinsRedeemed: 0,
        remainingTotalNgn: bookingTotal,
      };
    }

    const preview = this.calculateRedemptionDiscount(
      dto.coinsToRedeem,
      bookingTotal,
      settings,
    );

    if (!preview.valid) {
      return preview;
    }

    const effectiveAvailable =
      wallet.availableBalance + Number(booking.redeemedCoins || 0);

    if (effectiveAvailable < preview.coinsRedeemed) {
      return {
        valid: false,
        discountAmountNgn: 0,
        coinsRedeemed: 0,
        remainingTotalNgn: bookingTotal,
        message: `Insufficient coin balance. You have ${effectiveAvailable} ${settings.coinName}s available.`,
      };
    }

    return preview;
  }

  /**
   * Reserve coin hold on booking checkout
   */
  async applyBookingRedemptionHold(
    bookingId: string,
    userId: string,
    coinsToRedeem: number,
  ) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking || booking.userId !== userId) {
      throw new Error("Invalid booking or unauthorized");
    }

    const settings = await this.repo.getSettings();
    const previousCoins = Number(booking.redeemedCoins || 0);
    const previousCoinDiscount = Number(booking.redeemedCoinsNgn || 0);
    const nonCoinDiscount = Math.max(
      0,
      Number(booking.discountAmount || 0) - previousCoinDiscount,
    );
    const grossPrice = Number(
      booking.originalAmount ||
        Number(booking.totalAmount) + Number(booking.discountAmount || 0),
    );
    const baseTotal = Math.max(0, grossPrice - nonCoinDiscount);

    if (coinsToRedeem === 0) {
      return prisma.$transaction(async (tx) => {
        if (previousCoins > 0) {
          await this.repo.releaseCoinsFromHold(userId, previousCoins, tx);
        }
        await tx.booking.update({
          where: { id: bookingId },
          data: {
            redeemedCoins: 0,
            redeemedCoinsNgn: 0,
            discountAmount: nonCoinDiscount,
            totalAmount: baseTotal,
          },
        });
        return {
          valid: true,
          discountAmountNgn: 0,
          coinsRedeemed: 0,
          remainingTotalNgn: baseTotal,
          message: "PD Coin discount removed",
        };
      });
    }

    const preview = this.calculateRedemptionDiscount(
      coinsToRedeem,
      baseTotal,
      settings,
    );

    if (!preview.valid) {
      throw new Error(preview.message || "Invalid coin redemption");
    }

    return prisma.$transaction(async (tx) => {
      // If there was an existing hold on this booking, release it first so available balance is accurate
      if (previousCoins > 0) {
        await this.repo.releaseCoinsFromHold(userId, previousCoins, tx);
      }

      const reserved = await this.repo.reserveCoinsForHold(
        userId,
        preview.coinsRedeemed,
        bookingId,
        tx,
      );

      if (!reserved) {
        throw new Error(
          "Insufficient available PD Coin balance to place reservation",
        );
      }

      const updatedTotal = Math.max(0, baseTotal - preview.discountAmountNgn);

      await tx.booking.update({
        where: { id: bookingId },
        data: {
          redeemedCoins: preview.coinsRedeemed,
          redeemedCoinsNgn: preview.discountAmountNgn,
          discountAmount: nonCoinDiscount + preview.discountAmountNgn,
          totalAmount: updatedTotal,
        },
      });

      return preview;
    });
  }

  /**
   * Release coin hold when booking hold expires or is cancelled
   */
  async releaseBookingRedemptionHold(
    bookingId: string,
    txClient?: Prisma.TransactionClient,
  ) {
    const runner = txClient || prisma;

    const booking = await runner.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        userId: true,
        redeemedCoins: true,
        redeemedCoinsNgn: true,
      },
    });

    if (
      !booking ||
      !booking.redeemedCoins ||
      Number(booking.redeemedCoins) <= 0
    ) {
      return;
    }

    const coinsToRelease = Number(booking.redeemedCoins);

    // Safely release coins from wallet's reserved hold
    // Note: booking.redeemedCoins is preserved so late payment webhooks can accurately confirm debit
    await this.repo.releaseCoinsFromHold(
      booking.userId,
      coinsToRelease,
      runner,
    );
  }

  /**
   * Clawback payment reward coins on booking cancellation or refund
   */
  async clawbackPaymentReward(
    bookingId: string,
    transactionId: string,
    tx: Prisma.TransactionClient,
  ) {
    return this.repo.clawbackPaymentReward(bookingId, transactionId, tx);
  }

  /**
   * Confirm coin redemption when payment confirms as SUCCESSFUL
   */
  async confirmBookingRedemption(
    tx: Prisma.TransactionClient,
    bookingId: string,
  ) {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        reference: true,
        userId: true,
        redeemedCoins: true,
        redeemedCoinsNgn: true,
      },
    });

    if (
      !booking ||
      !booking.redeemedCoins ||
      Number(booking.redeemedCoins) <= 0
    ) {
      return;
    }

    const coinsToDebit = Number(booking.redeemedCoins);
    const settings = await this.repo.getSettings();

    await this.repo.confirmRedeemedCoins(
      booking.userId,
      coinsToDebit,
      booking.id, // Strictly use booking.id as unique referenceId!
      `Redeemed ${coinsToDebit} ${settings.coinSymbol} for booking ${booking.reference}`,
      {
        bookingId: booking.id,
        bookingReference: booking.reference,
        discountAmountNgn: Number(booking.redeemedCoinsNgn),
      },
      tx,
    );
  }

  // Delegated wallet / ledger / settings / stats methods
  async getWallet(userId: string): Promise<LoyaltyWalletDTO> {
    const wallet = await this.repo.getWalletDTO(userId);
    // If a customer has 0 lifetime earned coins, check and award initial signup welcome bonus if eligible
    if (wallet.balance === 0 && wallet.lifetimeEarned === 0) {
      try {
        const bonusRes = await coinService.awardSignupBonus(userId);
        if (bonusRes.coinsAwarded > 0) {
          return this.repo.getWalletDTO(userId);
        }
      } catch {}
    }
    return wallet;
  }

  async getLedger(
    userId: string,
    options?: { page?: number; limit?: number; type?: string },
  ): Promise<LoyaltyLedgerListResponse> {
    return this.repo.getLedger(userId, options);
  }

  async getAdminGlobalLedger(options?: {
    page?: number;
    limit?: number;
    type?: string;
    search?: string;
  }): Promise<LoyaltyLedgerListResponse> {
    return this.repo.getAdminGlobalLedger(options);
  }

  async getSettings(): Promise<LoyaltySettingsRecord> {
    return this.repo.getSettings();
  }

  async updateSettings(
    dto: UpdateLoyaltySettingsDTO,
    adminUserId?: string,
  ): Promise<LoyaltySettingsRecord> {
    return this.repo.updateSettings(dto, adminUserId);
  }

  async getSettingsAuditHistory() {
    return this.repo.getSettingsAuditHistory();
  }

  async getAdminStats(): Promise<AdminLoyaltyStatsDTO> {
    return this.repo.getAdminStats();
  }

  async adminAdjust(
    adminUserId: string,
    dto: AdminManualAdjustmentDTO,
    ipAddress?: string,
  ) {
    // PeeDee Coin atomic adjustment with 6 guardrails & row-level locking
    const pdResult = await coinService.adjustCoins(
      adminUserId,
      dto.targetUserId,
      dto.amount,
      {
        reasonCode: dto.reasonCode,
        justification: dto.justification || dto.reason || "",
        note: dto.note,
        ipAddress,
      },
    );

    return {
      success: true,
      balanceAfter: pdResult.newBalance,
      entry: pdResult.entry,
    };
  }
}

export const loyaltyService = new LoyaltyService();
