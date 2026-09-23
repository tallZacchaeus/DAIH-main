import { prisma } from "../../db/client.js";
import {
  Prisma,
  LoyaltyTransactionType,
  LoyaltyFormulaMode,
} from "@prisma/client";
import {
  LoyaltySettingsRecord,
  UpdateLoyaltySettingsDTO,
  LoyaltyWalletDTO,
  LoyaltyTransactionDTO,
  LoyaltyLedgerListResponse,
  AdminLoyaltyStatsDTO,
  LoyaltySettingsAuditDTO,
} from "@daih/types";
import { redis } from "../../config/redis.js";
import { getMemberTier } from "../../config/peedee.config.js";

const SETTINGS_CACHE_KEY = "daih:loyalty_settings";
const SETTINGS_CACHE_TTL = 300; // 5 minutes

export const DEFAULT_LOYALTY_SETTINGS: LoyaltySettingsRecord = {
  id: "default",
  isProgramActive: true,
  coinName: "PD Coin",
  coinSymbol: "PDC",
  isTransactionRewardEnabled: true,
  formulaMode: "SPEND_RATIO",
  spendRatioNgn: 100,
  percentageRate: 1.0,
  fixedAmountCoins: 50,
  minSpendThreshold: 500,
  maxCoinsPerTransaction: null,
  isReferralRewardEnabled: false, // OFF by default
  coinsPerActiveReferral: 100,
  refereeWelcomeBonus: 0, // 0 by default
  isRedemptionEnabled: true,
  redemptionRateCoins: 100,
  redemptionRateNgn: 100, // 100 PDC = 100 NGN (1:1)
  minCoinsToRedeem: 100,
  maxDiscountPercent: 50,
  isBirthdayBonusEnabled: true,
  birthdayBonusCoins: 500,
  isStreakBonusEnabled: true,
  streakBonusCoins: 200,
  streakThresholdCount: 3,
  streakWindowDays: 30,
  isSignupBonusEnabled: true,
  signupBonusCoins: 500,
  isExpiryEnabled: true,
  expiryMonths: 12,
  referralRewardPercent: 5.0,
  referralFloorCoins: 50,
  referralCapCoins: 1000,
  referralWindowDays: 90,
  dailyAdjustmentLimitCoins: 20000,
  holdExpiryMinutes: 15,
  updatedAt: new Date().toISOString(),
  updatedBy: null,
};

export class LoyaltyRepository {
  /**
   * Ensure default settings exist in the database
   */
  async ensureDefaultSettings(): Promise<LoyaltySettingsRecord> {
    const existing = await prisma.loyaltySetting.findUnique({
      where: { id: "default" },
    });

    if (existing) {
      return this.mapSettingRow(existing);
    }

    const created = await prisma.loyaltySetting.create({
      data: {
        id: "default",
        isProgramActive: DEFAULT_LOYALTY_SETTINGS.isProgramActive,
        coinName: DEFAULT_LOYALTY_SETTINGS.coinName,
        coinSymbol: DEFAULT_LOYALTY_SETTINGS.coinSymbol,
        isTransactionRewardEnabled:
          DEFAULT_LOYALTY_SETTINGS.isTransactionRewardEnabled,
        formulaMode: DEFAULT_LOYALTY_SETTINGS.formulaMode as LoyaltyFormulaMode,
        spendRatioNgn: DEFAULT_LOYALTY_SETTINGS.spendRatioNgn,
        percentageRate: DEFAULT_LOYALTY_SETTINGS.percentageRate,
        fixedAmountCoins: DEFAULT_LOYALTY_SETTINGS.fixedAmountCoins,
        minSpendThreshold: DEFAULT_LOYALTY_SETTINGS.minSpendThreshold,
        maxCoinsPerTransaction: DEFAULT_LOYALTY_SETTINGS.maxCoinsPerTransaction,
        isReferralRewardEnabled:
          DEFAULT_LOYALTY_SETTINGS.isReferralRewardEnabled,
        coinsPerActiveReferral: DEFAULT_LOYALTY_SETTINGS.coinsPerActiveReferral,
        refereeWelcomeBonus: DEFAULT_LOYALTY_SETTINGS.refereeWelcomeBonus,
        referralRewardPercent: DEFAULT_LOYALTY_SETTINGS.referralRewardPercent,
        referralFloorCoins: DEFAULT_LOYALTY_SETTINGS.referralFloorCoins,
        referralCapCoins: DEFAULT_LOYALTY_SETTINGS.referralCapCoins,
        referralWindowDays: DEFAULT_LOYALTY_SETTINGS.referralWindowDays,
        isRedemptionEnabled: DEFAULT_LOYALTY_SETTINGS.isRedemptionEnabled,
        redemptionRateCoins: DEFAULT_LOYALTY_SETTINGS.redemptionRateCoins,
        redemptionRateNgn: DEFAULT_LOYALTY_SETTINGS.redemptionRateNgn,
        minCoinsToRedeem: DEFAULT_LOYALTY_SETTINGS.minCoinsToRedeem,
        maxDiscountPercent: DEFAULT_LOYALTY_SETTINGS.maxDiscountPercent,
        isBirthdayBonusEnabled: DEFAULT_LOYALTY_SETTINGS.isBirthdayBonusEnabled,
        birthdayBonusCoins: DEFAULT_LOYALTY_SETTINGS.birthdayBonusCoins,
        isStreakBonusEnabled: DEFAULT_LOYALTY_SETTINGS.isStreakBonusEnabled,
        streakBonusCoins: DEFAULT_LOYALTY_SETTINGS.streakBonusCoins,
        streakThresholdCount: DEFAULT_LOYALTY_SETTINGS.streakThresholdCount,
        streakWindowDays: DEFAULT_LOYALTY_SETTINGS.streakWindowDays,
        isSignupBonusEnabled: DEFAULT_LOYALTY_SETTINGS.isSignupBonusEnabled,
        signupBonusCoins: DEFAULT_LOYALTY_SETTINGS.signupBonusCoins,
        isExpiryEnabled: DEFAULT_LOYALTY_SETTINGS.isExpiryEnabled,
        expiryMonths: DEFAULT_LOYALTY_SETTINGS.expiryMonths,
        dailyAdjustmentLimitCoins:
          DEFAULT_LOYALTY_SETTINGS.dailyAdjustmentLimitCoins,
        holdExpiryMinutes: DEFAULT_LOYALTY_SETTINGS.holdExpiryMinutes,
      },
    });

    return this.mapSettingRow(created);
  }

  private mapSettingRow(row: any): LoyaltySettingsRecord {
    return {
      id: row.id,
      isProgramActive: row.isProgramActive,
      coinName: row.coinName,
      coinSymbol: row.coinSymbol,
      isTransactionRewardEnabled: row.isTransactionRewardEnabled,
      formulaMode: row.formulaMode as any,
      spendRatioNgn: Number(row.spendRatioNgn),
      percentageRate: Number(row.percentageRate),
      fixedAmountCoins: Number(row.fixedAmountCoins),
      minSpendThreshold: Number(row.minSpendThreshold),
      maxCoinsPerTransaction: row.maxCoinsPerTransaction
        ? Number(row.maxCoinsPerTransaction)
        : null,
      isReferralRewardEnabled: row.isReferralRewardEnabled,
      coinsPerActiveReferral: Number(row.coinsPerActiveReferral),
      refereeWelcomeBonus: Number(row.refereeWelcomeBonus),
      referralRewardPercent: Number(row.referralRewardPercent ?? 5.0),
      referralFloorCoins: Number(row.referralFloorCoins ?? 50),
      referralCapCoins: Number(row.referralCapCoins ?? 1000),
      referralWindowDays: Number(row.referralWindowDays ?? 90),
      isRedemptionEnabled: row.isRedemptionEnabled,
      redemptionRateCoins: Number(row.redemptionRateCoins),
      redemptionRateNgn: Number(row.redemptionRateNgn),
      minCoinsToRedeem: Number(row.minCoinsToRedeem),
      maxDiscountPercent: Number(row.maxDiscountPercent),
      isBirthdayBonusEnabled: row.isBirthdayBonusEnabled ?? true,
      birthdayBonusCoins: Number(row.birthdayBonusCoins ?? 500),
      isStreakBonusEnabled: row.isStreakBonusEnabled ?? true,
      streakBonusCoins: Number(row.streakBonusCoins ?? 200),
      streakThresholdCount: Number(row.streakThresholdCount ?? 3),
      streakWindowDays: Number(row.streakWindowDays ?? 30),
      isSignupBonusEnabled: row.isSignupBonusEnabled ?? true,
      signupBonusCoins: Number(row.signupBonusCoins ?? 500),
      isExpiryEnabled: row.isExpiryEnabled ?? true,
      expiryMonths: Number(row.expiryMonths ?? 12),
      dailyAdjustmentLimitCoins: Number(row.dailyAdjustmentLimitCoins ?? 20000),
      holdExpiryMinutes: Number(row.holdExpiryMinutes ?? 15),
      updatedAt:
        row.updatedAt instanceof Date
          ? row.updatedAt.toISOString()
          : row.updatedAt,
      updatedBy: row.updatedBy || null,
    };
  }

  /**
   * Get settings with Redis caching
   */
  async getSettings(): Promise<LoyaltySettingsRecord> {
    if (redis) {
      try {
        const cached = await redis.get(SETTINGS_CACHE_KEY);
        if (cached) return JSON.parse(cached);
      } catch {}
    }

    const settings = await this.ensureDefaultSettings();

    if (redis) {
      await redis
        .set(
          SETTINGS_CACHE_KEY,
          JSON.stringify(settings),
          "EX",
          SETTINGS_CACHE_TTL,
        )
        .catch(() => {});
    }

    return settings;
  }

  /**
   * Update loyalty settings and write audit diff log
   */
  async updateSettings(
    dto: UpdateLoyaltySettingsDTO,
    adminUserId?: string,
  ): Promise<LoyaltySettingsRecord> {
    const current = await this.getSettings();

    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.loyaltySetting.update({
        where: { id: "default" },
        data: {
          ...(dto.isProgramActive !== undefined && {
            isProgramActive: dto.isProgramActive,
          }),
          ...(dto.coinName !== undefined && { coinName: dto.coinName }),
          ...(dto.coinSymbol !== undefined && { coinSymbol: dto.coinSymbol }),
          ...(dto.isTransactionRewardEnabled !== undefined && {
            isTransactionRewardEnabled: dto.isTransactionRewardEnabled,
          }),
          ...(dto.formulaMode !== undefined && {
            formulaMode: dto.formulaMode as LoyaltyFormulaMode,
          }),
          ...(dto.spendRatioNgn !== undefined && {
            spendRatioNgn: dto.spendRatioNgn,
          }),
          ...(dto.percentageRate !== undefined && {
            percentageRate: dto.percentageRate,
          }),
          ...(dto.fixedAmountCoins !== undefined && {
            fixedAmountCoins: dto.fixedAmountCoins,
          }),
          ...(dto.minSpendThreshold !== undefined && {
            minSpendThreshold: dto.minSpendThreshold,
          }),
          ...(dto.maxCoinsPerTransaction !== undefined && {
            maxCoinsPerTransaction: dto.maxCoinsPerTransaction,
          }),
          ...(dto.isReferralRewardEnabled !== undefined && {
            isReferralRewardEnabled: dto.isReferralRewardEnabled,
          }),
          ...(dto.coinsPerActiveReferral !== undefined && {
            coinsPerActiveReferral: dto.coinsPerActiveReferral,
          }),
          ...(dto.refereeWelcomeBonus !== undefined && {
            refereeWelcomeBonus: dto.refereeWelcomeBonus,
          }),
          ...(dto.referralRewardPercent !== undefined && {
            referralRewardPercent: dto.referralRewardPercent,
          }),
          ...(dto.referralFloorCoins !== undefined && {
            referralFloorCoins: dto.referralFloorCoins,
          }),
          ...(dto.referralCapCoins !== undefined && {
            referralCapCoins: dto.referralCapCoins,
          }),
          ...(dto.referralWindowDays !== undefined && {
            referralWindowDays: dto.referralWindowDays,
          }),
          ...(dto.isRedemptionEnabled !== undefined && {
            isRedemptionEnabled: dto.isRedemptionEnabled,
          }),
          ...(dto.redemptionRateCoins !== undefined && {
            redemptionRateCoins: dto.redemptionRateCoins,
          }),
          ...(dto.redemptionRateNgn !== undefined && {
            redemptionRateNgn: dto.redemptionRateNgn,
          }),
          ...(dto.minCoinsToRedeem !== undefined && {
            minCoinsToRedeem: dto.minCoinsToRedeem,
          }),
          ...(dto.maxDiscountPercent !== undefined && {
            maxDiscountPercent: dto.maxDiscountPercent,
          }),
          ...(dto.isBirthdayBonusEnabled !== undefined && {
            isBirthdayBonusEnabled: dto.isBirthdayBonusEnabled,
          }),
          ...(dto.birthdayBonusCoins !== undefined && {
            birthdayBonusCoins: dto.birthdayBonusCoins,
          }),
          ...(dto.isStreakBonusEnabled !== undefined && {
            isStreakBonusEnabled: dto.isStreakBonusEnabled,
          }),
          ...(dto.streakBonusCoins !== undefined && {
            streakBonusCoins: dto.streakBonusCoins,
          }),
          ...(dto.streakThresholdCount !== undefined && {
            streakThresholdCount: dto.streakThresholdCount,
          }),
          ...(dto.streakWindowDays !== undefined && {
            streakWindowDays: dto.streakWindowDays,
          }),
          ...(dto.isSignupBonusEnabled !== undefined && {
            isSignupBonusEnabled: dto.isSignupBonusEnabled,
          }),
          ...(dto.signupBonusCoins !== undefined && {
            signupBonusCoins: dto.signupBonusCoins,
          }),
          ...(dto.isExpiryEnabled !== undefined && {
            isExpiryEnabled: dto.isExpiryEnabled,
          }),
          ...(dto.expiryMonths !== undefined && {
            expiryMonths: dto.expiryMonths,
          }),
          ...(dto.dailyAdjustmentLimitCoins !== undefined && {
            dailyAdjustmentLimitCoins: dto.dailyAdjustmentLimitCoins,
          }),
          ...(dto.holdExpiryMinutes !== undefined && {
            holdExpiryMinutes: dto.holdExpiryMinutes,
          }),
          updatedBy: adminUserId || null,
        },
      });

      // Write audit log diff
      await tx.auditLog.create({
        data: {
          userId: adminUserId || null,
          action: "LOYALTY_SETTINGS_UPDATED",
          entityType: "LoyaltySetting",
          entityId: "default",
          metadata: {
            previous: current as any,
            updated: dto as any,
          },
        },
      });

      return saved;
    });

    const mapped = this.mapSettingRow(updated);

    if (redis) {
      await redis.del(SETTINGS_CACHE_KEY).catch(() => {});
    }

    return mapped;
  }

  /**
   * Get settings modification audit history
   */
  async getSettingsAuditHistory(
    limit: number = 50,
  ): Promise<LoyaltySettingsAuditDTO[]> {
    const logs = await prisma.auditLog.findMany({
      where: {
        entityType: "LoyaltySetting",
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return logs.map((log) => ({
      id: log.id,
      userId: log.userId,
      userName: log.user
        ? `${log.user.firstName} ${log.user.lastName}`.trim()
        : null,
      action: log.action,
      metadata: log.metadata,
      createdAt: log.createdAt.toISOString(),
    }));
  }

  /**
   * Ensure wallet exists for user in a single atomic database operation
   */
  async getOrCreateWallet(
    userId: string,
    tx: Prisma.TransactionClient | typeof prisma = prisma,
  ) {
    return tx.loyaltyWallet.upsert({
      where: { userId },
      create: {
        userId,
        balance: 0,
        reservedCoins: 0,
        lifetimeEarned: 0,
        lifetimeSpent: 0,
      },
      update: {},
    });
  }

  /**
   * Check if reward has already been claimed (fast idempotency check)
   */
  async hasRewardBeenClaimed(
    referenceId: string,
    type: LoyaltyTransactionType,
    tx: Prisma.TransactionClient | typeof prisma = prisma,
  ): Promise<boolean> {
    if (!referenceId) return false;
    const existing = await tx.loyaltyTransaction.findUnique({
      where: {
        referenceId_type: {
          referenceId,
          type,
        },
      },
      select: { id: true },
    });
    return !!existing;
  }

  /**
   * Credit coins atomically with append-only ledger transaction
   */
  async creditCoins(
    userId: string,
    amount: number,
    type: LoyaltyTransactionType,
    referenceId: string,
    description: string,
    metadata: Record<string, any> = {},
    tx: Prisma.TransactionClient,
  ) {
    if (!referenceId || !referenceId.trim()) {
      throw new Error(
        `referenceId is strictly required for credit operation of type ${type}`,
      );
    }

    const cleanRef = referenceId.trim();

    // Idempotency check: if already awarded, return existing wallet
    const alreadyClaimed = await this.hasRewardBeenClaimed(cleanRef, type, tx);
    if (alreadyClaimed) {
      const existingWallet = await this.getOrCreateWallet(userId, tx);
      return { wallet: existingWallet, duplicate: true };
    }

    // Atomic upsert: creates wallet or increments balance in a SINGLE database round trip
    const updatedWallet = await tx.loyaltyWallet.upsert({
      where: { userId },
      create: {
        userId,
        balance: amount,
        reservedCoins: 0,
        lifetimeEarned: amount,
        lifetimeSpent: 0,
      },
      update: {
        balance: { increment: amount },
        lifetimeEarned: { increment: amount },
      },
    });

    // Append ledger entry with required referenceId
    const ledgerTx = await tx.loyaltyTransaction.create({
      data: {
        walletId: updatedWallet.id,
        userId,
        amount,
        balanceAfter: updatedWallet.balance,
        type,
        referenceId: cleanRef,
        referenceType: type.includes("REFERRAL") ? "REFERRAL" : "TRANSACTION",
        description,
        metadata,
      },
    });

    return { wallet: updatedWallet, transaction: ledgerTx, duplicate: false };
  }

  /**
   * Reserve coins for booking hold (two-phase hold)
   */
  async reserveCoinsForHold(
    userId: string,
    amount: number,
    bookingId: string,
    tx: Prisma.TransactionClient,
  ): Promise<boolean> {
    await this.getOrCreateWallet(userId, tx);

    // Check existing hold for this booking if any
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      select: { redeemedCoins: true },
    });

    const previouslyHeld = Number(booking?.redeemedCoins || 0);
    const delta = amount - previouslyHeld;

    if (delta <= 0) {
      // Amount decreased or unchanged
      if (delta < 0) {
        await this.releaseCoinsFromHold(userId, Math.abs(delta), tx);
      }
      return true;
    }

    // Atomic query: only increment reservedCoins if available balance (balance - reservedCoins) >= delta
    const result = await tx.$executeRawUnsafe(
      `
      UPDATE loyalty_wallets 
      SET "reservedCoins" = "reservedCoins" + $1,
          "updatedAt" = CURRENT_TIMESTAMP
      WHERE "userId" = $2 
        AND ("balance" - "reservedCoins") >= $1;
      `,
      delta,
      userId,
    );

    return result > 0;
  }

  /**
   * Release reserved coins from hold (safe atomic decrement with GREATEST(0, ...))
   */
  async releaseCoinsFromHold(
    userId: string,
    amount: number,
    tx: Prisma.TransactionClient | typeof prisma = prisma,
  ): Promise<void> {
    if (amount <= 0) return;

    await tx.$executeRawUnsafe(
      `
      UPDATE loyalty_wallets 
      SET "reservedCoins" = GREATEST(0, "reservedCoins" - $1),
          "updatedAt" = CURRENT_TIMESTAMP
      WHERE "userId" = $2;
      `,
      amount,
      userId,
    );
  }

  /**
   * Confirm redeemed coins on payment completion (converts hold into permanent debit)
   */
  async confirmRedeemedCoins(
    userId: string,
    amount: number,
    referenceId: string,
    description: string,
    metadata: Record<string, any> = {},
    tx: Prisma.TransactionClient,
  ) {
    if (!referenceId || !referenceId.trim()) {
      throw new Error(
        "referenceId (bookingId) is required for coin redemption",
      );
    }

    const cleanRef = referenceId.trim();

    // Idempotency check: don't double-debit if already confirmed
    const alreadyRedeemed = await this.hasRewardBeenClaimed(
      cleanRef,
      LoyaltyTransactionType.REDEMPTION_BOOKING,
      tx,
    );
    if (alreadyRedeemed) {
      return { duplicate: true };
    }

    // Execute atomic balance and hold decrement and return updated row in a SINGLE database round trip
    let rows = await tx.$queryRawUnsafe<Array<{ id: string; balance: any }>>(
      `
      UPDATE loyalty_wallets 
      SET "balance" = "balance" - $1,
          "reservedCoins" = GREATEST(0, "reservedCoins" - $1),
          "lifetimeSpent" = "lifetimeSpent" + $1,
          "updatedAt" = CURRENT_TIMESTAMP
      WHERE "userId" = $2 AND "balance" >= $1
      RETURNING "id", "balance";
      `,
      amount,
      userId,
    );

    let isDeficit = false;
    if (!rows || rows.length === 0) {
      // Late payment / hold expiry race: user spent balance while webhook was in-flight.
      // Prioritize confirmed payment: debit into negative debt ceiling and flag deficit audit.
      rows = await tx.$queryRawUnsafe<Array<{ id: string; balance: any }>>(
        `
        UPDATE loyalty_wallets 
        SET "balance" = "balance" - $1,
            "reservedCoins" = GREATEST(0, "reservedCoins" - $1),
            "lifetimeSpent" = "lifetimeSpent" + $1,
            "updatedAt" = CURRENT_TIMESTAMP
        WHERE "userId" = $2
        RETURNING "id", "balance";
        `,
        amount,
        userId,
      );
      isDeficit = true;
    }

    if (!rows || rows.length === 0) {
      throw new Error(
        "COIN_WALLET_NOT_FOUND: Failed to locate or debit customer loyalty wallet",
      );
    }

    const updatedRow = rows[0];

    if (isDeficit) {
      await tx.auditLog
        .create({
          data: {
            userId,
            action: "LATE_PAYMENT_COIN_DEFICIT",
            entityType: "LoyaltyWallet",
            entityId: updatedRow.id,
            metadata: {
              bookingId: cleanRef,
              shortfallCoins: Math.abs(Number(updatedRow.balance)),
              amount,
            },
          },
        })
        .catch(() => {});
    }

    const ledgerTx = await tx.loyaltyTransaction.create({
      data: {
        walletId: updatedRow.id,
        userId,
        amount: -amount,
        balanceAfter: Number(updatedRow.balance),
        type: LoyaltyTransactionType.REDEMPTION_BOOKING,
        referenceId: cleanRef,
        referenceType: "BOOKING",
        description,
        metadata: {
          ...metadata,
          isDeficit,
        },
      },
    });

    return { wallet: updatedRow, transaction: ledgerTx, duplicate: false };
  }

  /**
   * Clawback payment reward coins on booking cancellation or refund
   */
  async clawbackPaymentReward(
    bookingId: string,
    transactionId: string,
    tx: Prisma.TransactionClient,
  ): Promise<{
    coinsClawedBack: number;
    unrecoveredCoins: number;
    fiatToDockNgn: number;
  }> {
    // 1. Find the reward transaction associated with this transactionId
    const rewardTx = await tx.loyaltyTransaction.findFirst({
      where: {
        referenceId: transactionId,
        type: LoyaltyTransactionType.TRANSACTION_REWARD,
      },
    });

    if (!rewardTx || Number(rewardTx.amount) <= 0) {
      return { coinsClawedBack: 0, unrecoveredCoins: 0, fiatToDockNgn: 0 };
    }

    // Check if already clawed back
    const alreadyClawedBack = await this.hasRewardBeenClaimed(
      `CLAWBACK-${transactionId}`,
      LoyaltyTransactionType.REFUND_CLAWBACK,
      tx,
    );
    if (alreadyClawedBack) {
      return { coinsClawedBack: 0, unrecoveredCoins: 0, fiatToDockNgn: 0 };
    }

    const coinsToClawback = Number(rewardTx.amount);
    const wallet = await this.getOrCreateWallet(rewardTx.userId, tx);
    const availableBalance = Number(wallet.balance);

    const coinsRecoverable = Math.min(availableBalance, coinsToClawback);
    const unrecoveredCoins = Math.max(0, coinsToClawback - coinsRecoverable);

    // Get settings for fiat valuation
    const settings = await this.getSettings();
    const fiatToDockNgn =
      (unrecoveredCoins / (settings.redemptionRateCoins || 100)) *
      (settings.redemptionRateNgn || 100);

    if (coinsRecoverable > 0) {
      await tx.$executeRawUnsafe(
        `
        UPDATE loyalty_wallets 
        SET "balance" = "balance" - $1,
            "lifetimeEarned" = GREATEST(0, "lifetimeEarned" - $1),
            "updatedAt" = CURRENT_TIMESTAMP
        WHERE "userId" = $2;
        `,
        coinsRecoverable,
        rewardTx.userId,
      );

      await tx.loyaltyTransaction.create({
        data: {
          walletId: wallet.id,
          userId: rewardTx.userId,
          amount: -coinsRecoverable,
          balanceAfter: availableBalance - coinsRecoverable,
          type: LoyaltyTransactionType.REFUND_CLAWBACK,
          referenceId: `CLAWBACK-${transactionId}`,
          referenceType: "TRANSACTION",
          description: `Clawback of ${coinsRecoverable} ${settings.coinSymbol} for refunded booking transaction ${transactionId}`,
          metadata: {
            originalRewardAmount: coinsToClawback,
            unrecoveredCoins,
            fiatToDockNgn,
            bookingId,
            transactionId,
          },
        },
      });
    }

    return {
      coinsClawedBack: coinsRecoverable,
      unrecoveredCoins,
      fiatToDockNgn,
    };
  }

  /**
   * Admin manual adjustment (+/-)
   */
  async adminAdjust(
    adminUserId: string,
    targetUserId: string,
    amount: number,
    reason: string,
    note?: string,
  ) {
    return prisma.$transaction(async (tx) => {
      const adjustmentRef = `ADJ-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

      let updatedWallet: { id: string; balance: any };
      if (amount < 0) {
        const absAmount = Math.abs(amount);
        const rows = await tx.$queryRawUnsafe<
          Array<{ id: string; balance: any }>
        >(
          `
          UPDATE loyalty_wallets 
          SET "balance" = "balance" - $1,
              "lifetimeSpent" = "lifetimeSpent" + $1,
              "updatedAt" = CURRENT_TIMESTAMP
          WHERE "userId" = $2 AND "balance" >= $1
          RETURNING "id", "balance";
          `,
          absAmount,
          targetUserId,
        );

        if (!rows || rows.length === 0) {
          const err: any = new Error(
            "Cannot deduct more coins than the user currently possesses",
          );
          err.statusCode = 400;
          err.code = "INSUFFICIENT_COIN_BALANCE";
          throw err;
        }

        updatedWallet = rows[0];
      } else {
        updatedWallet = await tx.loyaltyWallet.upsert({
          where: { userId: targetUserId },
          create: {
            userId: targetUserId,
            balance: amount,
            lifetimeEarned: amount,
            reservedCoins: 0,
            lifetimeSpent: 0,
          },
          update: {
            balance: { increment: amount },
            lifetimeEarned: { increment: amount },
          },
        });
      }

      const ledgerTx = await tx.loyaltyTransaction.create({
        data: {
          walletId: updatedWallet!.id,
          userId: targetUserId,
          amount,
          balanceAfter: updatedWallet!.balance,
          type: LoyaltyTransactionType.ADMIN_ADJUSTMENT,
          referenceId: adjustmentRef,
          referenceType: "MANUAL",
          description: reason,
          metadata: {
            adminUserId,
            note: note || null,
          },
        },
      });

      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: "LOYALTY_COIN_ADJUSTMENT",
          entityType: "LoyaltyWallet",
          entityId: updatedWallet.id,
          metadata: {
            targetUserId,
            adjustmentAmount: amount,
            balanceAfter: Number(updatedWallet!.balance),
            reason,
            note,
            adjustmentRef,
          },
        },
      });

      return {
        success: true,
        newBalance: Number(updatedWallet!.balance),
        transactionId: ledgerTx.id,
      };
    });
  }

  /**
   * Record referral reward log (idempotent per refereeId)
   */
  async recordReferralReward(
    data: {
      referrerId: string;
      refereeId: string;
      bookingId: string;
      coinsAwarded: number;
    },
    tx: Prisma.TransactionClient,
  ) {
    if (data.referrerId === data.refereeId) {
      throw new Error("Self-referral reward is forbidden");
    }

    return tx.referralRewardLog.create({
      data: {
        referrerId: data.referrerId,
        refereeId: data.refereeId,
        bookingId: data.bookingId,
        coinsAwarded: data.coinsAwarded,
      },
    });
  }

  /**
   * Has referee already triggered referral bonus?
   */
  async hasRefereeRewardBeenClaimed(
    refereeId: string,
    tx: Prisma.TransactionClient | typeof prisma = prisma,
  ): Promise<boolean> {
    const existing = await tx.referralRewardLog.findUnique({
      where: { refereeId },
    });
    return !!existing;
  }

  /**
   * Get user wallet with equivalent fiat value
   */
  async getWalletDTO(userId: string): Promise<LoyaltyWalletDTO> {
    const [wallet, settings] = await Promise.all([
      this.getOrCreateWallet(userId),
      this.getSettings(),
    ]);

    const balance = Number(wallet.balance);
    const reservedCoins = Number(wallet.reservedCoins);
    const availableBalance = Math.max(0, balance - reservedCoins);
    const conversionFactor =
      settings.redemptionRateCoins > 0
        ? settings.redemptionRateNgn / settings.redemptionRateCoins
        : 1;
    const equivalentNgnValue =
      Math.round(availableBalance * conversionFactor * 100) / 100;
    const tierInfo = getMemberTier(wallet.lifetimeEarned);

    return {
      id: wallet.id,
      userId: wallet.userId,
      balance,
      reservedCoins,
      availableBalance,
      lifetimeEarned: Number(wallet.lifetimeEarned),
      lifetimeSpent: Number(wallet.lifetimeSpent),
      equivalentNgnValue,
      coinSymbol: settings.coinSymbol,
      coinName: settings.coinName,
      tier: tierInfo.tier,
      tierMultiplier: tierInfo.multiplier,
    };
  }

  /**
   * Get user ledger with pagination
   */
  async getLedger(
    userId: string,
    options: { page?: number; limit?: number; type?: string } = {},
  ): Promise<LoyaltyLedgerListResponse> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, Math.min(100, options.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.LoyaltyTransactionWhereInput = {
      userId,
      ...(options.type ? { type: options.type as LoyaltyTransactionType } : {}),
    };

    const [total, items] = await Promise.all([
      prisma.loyaltyTransaction.count({ where }),
      prisma.loyaltyTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return {
      items: items.map((i) => ({
        id: i.id,
        walletId: i.walletId,
        userId: i.userId,
        amount: Number(i.amount),
        balanceAfter: Number(i.balanceAfter),
        type: i.type as any,
        referenceId: i.referenceId,
        referenceType: i.referenceType,
        description: i.description,
        metadata: i.metadata as any,
        createdAt: i.createdAt.toISOString(),
      })),
      total,
      page,
      limit,
    };
  }

  /**
   * Get global loyalty ledger for Admin
   */
  async getAdminGlobalLedger(
    options: {
      page?: number;
      limit?: number;
      type?: string;
      search?: string;
    } = {},
  ): Promise<LoyaltyLedgerListResponse> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, Math.min(100, options.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.LoyaltyTransactionWhereInput = {
      ...(options.type ? { type: options.type as LoyaltyTransactionType } : {}),
      ...(options.search
        ? {
            OR: [
              {
                description: { contains: options.search, mode: "insensitive" },
              },
              {
                referenceId: { contains: options.search, mode: "insensitive" },
              },
              {
                user: {
                  email: { contains: options.search, mode: "insensitive" },
                },
              },
              {
                user: {
                  firstName: { contains: options.search, mode: "insensitive" },
                },
              },
              {
                user: {
                  lastName: { contains: options.search, mode: "insensitive" },
                },
              },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      prisma.loyaltyTransaction.count({ where }),
      prisma.loyaltyTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              clientId: true,
            },
          },
        },
      }),
    ]);

    return {
      items: items.map((i) => ({
        id: i.id,
        walletId: i.walletId,
        userId: i.userId,
        userName: i.user
          ? `${i.user.firstName} ${i.user.lastName}`.trim()
          : undefined,
        userEmail: i.user?.email,
        userClientId: i.user?.clientId,
        amount: Number(i.amount),
        balanceAfter: Number(i.balanceAfter),
        type: i.type as any,
        referenceId: i.referenceId,
        referenceType: i.referenceType,
        description: i.description,
        metadata: i.metadata as any,
        createdAt: i.createdAt.toISOString(),
      })),
      total,
      page,
      limit,
    };
  }

  /**
   * Get aggregated admin stats
   */
  async getAdminStats(): Promise<AdminLoyaltyStatsDTO> {
    const [settings, walletAggs, activeEarnersCount, totalTxCount] =
      await Promise.all([
        this.getSettings(),
        prisma.loyaltyWallet.aggregate({
          _sum: {
            balance: true,
            lifetimeEarned: true,
            lifetimeSpent: true,
          },
        }),
        prisma.loyaltyWallet.count({
          where: { lifetimeEarned: { gt: 0 } },
        }),
        prisma.loyaltyTransaction.count(),
      ]);

    const totalCirculationCoins = Number(walletAggs._sum.balance || 0);
    const lifetimeCoinsEarned = Number(walletAggs._sum.lifetimeEarned || 0);
    const lifetimeCoinsRedeemed = Number(walletAggs._sum.lifetimeSpent || 0);
    const rateFactor =
      settings.redemptionRateCoins > 0
        ? settings.redemptionRateNgn / settings.redemptionRateCoins
        : 1;
    const totalCirculationNgn =
      Math.round(totalCirculationCoins * rateFactor * 100) / 100;

    return {
      totalCirculationCoins,
      totalCirculationNgn,
      lifetimeCoinsEarned,
      lifetimeCoinsRedeemed,
      activeEarnersCount,
      totalTransactionsCount: totalTxCount,
      redemptionRateNgnPerCoin: rateFactor,
    };
  }
}

export const loyaltyRepository = new LoyaltyRepository();
