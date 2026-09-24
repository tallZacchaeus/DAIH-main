import { prisma } from "../../db/client.js";
import { Prisma, LoyaltyFormulaMode, CoinLedgerAction } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import {
  LoyaltySettingsRecord,
  UpdateLoyaltySettingsDTO,
  LoyaltyWalletDTO,
  LoyaltyTransactionDTO,
  LoyaltyLedgerListResponse,
  AdminLoyaltyStatsDTO,
  LoyaltySettingsAuditDTO,
  LoyaltyTransactionType,
} from "@daih/types";
import { redis } from "../../config/redis.js";
import { getMemberTier } from "../../config/peedee.config.js";
import { coinService } from "./coin.service.js";
import {
  TRANSACTION_TYPE_TO_ACTION,
  ACTION_TO_TRANSACTION_TYPE,
  mapActionToTransactionType,
  formatLedgerDescription,
  toCoinNumber,
} from "./loyalty.utils.js";

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
   * Ensure wallet exists for user in a single atomic database operation.
   * Kept for backwards compatibility; returns an in-memory representation.
   */
  async getOrCreateWallet(
    userId: string,
    tx: Prisma.TransactionClient | typeof prisma = prisma,
  ) {
    const coinBal = await tx.coinBalance.findUnique({ where: { userId } });
    return {
      id: userId,
      userId,
      balance: coinBal ? toCoinNumber(coinBal.balance) : 0,
      reservedCoins: 0,
      lifetimeEarned: coinBal ? toCoinNumber(coinBal.lifetimeEarned) : 0,
      lifetimeSpent: coinBal ? toCoinNumber(coinBal.lifetimeBurned) : 0,
    };
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
    const action = TRANSACTION_TYPE_TO_ACTION[type];
    const existing = await tx.coinLedgerEntry.findFirst({
      where: {
        referenceId,
        ...(action ? { action } : {}),
      },
      select: { id: true },
    });
    return !!existing;
  }

  /**
   * Credit coins atomically with append-only ledger transaction.
   * Delegates directly to authoritative coinService.
   */
  async creditCoins(
    userId: string,
    amount: number,
    type: LoyaltyTransactionType,
    referenceId: string,
    description: string,
    metadata: Record<string, any> = {},
    tx?: Prisma.TransactionClient,
  ) {
    if (!referenceId || !referenceId.trim()) {
      throw new Error(
        `referenceId is strictly required for credit operation of type ${type}`,
      );
    }

    const cleanRef = referenceId.trim();
    const action =
      TRANSACTION_TYPE_TO_ACTION[type] || CoinLedgerAction.ADMIN_ADJUSTMENT;
    const idempotencyKey = `credit_${type}_${cleanRef}`;

    const res = await coinService.creditCoins(
      {
        userId,
        action,
        amount,
        referenceType: type.includes("REFERRAL") ? "REFERRAL" : "TRANSACTION",
        referenceId: cleanRef,
        idempotencyKey,
        metadata: {
          ...metadata,
          description,
        },
      },
      tx,
    );

    return {
      wallet: { id: userId, userId, balance: res.newBalance },
      transaction: res.entry,
      duplicate: res.duplicate,
    };
  }

  /**
   * Reserve coins for booking hold (two-phase hold).
   * Delegates directly to authoritative coinService.createHold.
   */
  async reserveCoinsForHold(
    userId: string,
    amount: number,
    bookingId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<boolean> {
    try {
      const settings = await this.getSettings();
      const rateFactor =
        settings.redemptionRateCoins > 0
          ? settings.redemptionRateNgn / settings.redemptionRateCoins
          : 1;
      const nairaValue = Math.round(amount * rateFactor * 100) / 100;

      await coinService.createHold({
        userId,
        bookingId,
        amount,
        nairaValue,
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Release reserved coins from hold.
   */
  async releaseCoinsFromHold(
    userId: string,
    amount: number,
    tx: Prisma.TransactionClient | typeof prisma = prisma,
  ): Promise<void> {
    const activeHolds = await tx.coinHold.findMany({
      where: {
        userId,
        status: "ACTIVE",
      },
    });
    for (const hold of activeHolds) {
      await tx.coinHold.update({
        where: { id: hold.id },
        data: { status: "RELEASED" },
      });
    }
  }

  /**
   * Confirm redeemed coins on payment completion (converts hold into permanent debit).
   * Delegates directly to authoritative coinService.burnHold.
   */
  async confirmRedeemedCoins(
    userId: string,
    amount: number,
    referenceId: string,
    description: string,
    metadata: Record<string, any> = {},
    tx?: Prisma.TransactionClient,
  ) {
    if (!referenceId || !referenceId.trim()) {
      throw new Error(
        "referenceId (bookingId) is required for coin redemption",
      );
    }

    const cleanRef = referenceId.trim();

    const burnRes = await coinService.burnHold(cleanRef, tx);
    if (!burnRes.success) {
      // If hold was already expired or not found, fall back to atomic debit
      const debitRes = await coinService.debitCoins(
        {
          userId,
          action: CoinLedgerAction.HOLD_BURNED,
          amount,
          referenceType: "BOOKING",
          referenceId: cleanRef,
          idempotencyKey: `burn_hold_${cleanRef}`,
          metadata: {
            ...metadata,
            description,
          },
        },
        tx,
      );
      return {
        wallet: { id: userId, userId, balance: debitRes.newBalance },
        transaction: debitRes.entry,
        duplicate: debitRes.duplicate,
      };
    }

    const currentBal = await (tx || prisma).coinBalance.findUnique({
      where: { userId },
    });

    return {
      wallet: {
        id: userId,
        userId,
        balance: currentBal ? toCoinNumber(currentBal.balance) : 0,
      },
      duplicate: false,
    };
  }

  /**
   * Clawback payment reward coins on booking cancellation or refund.
   * Delegates directly to authoritative coinService.debitCoins.
   */
  async clawbackPaymentReward(
    bookingId: string,
    transactionId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<{
    coinsClawedBack: number;
    unrecoveredCoins: number;
    fiatToDockNgn: number;
  }> {
    const rewardEntry = await (tx || prisma).coinLedgerEntry.findFirst({
      where: {
        referenceId: transactionId,
        action: CoinLedgerAction.BOOKING_EARN,
      },
    });

    if (!rewardEntry || Number(rewardEntry.amount) <= 0) {
      return { coinsClawedBack: 0, unrecoveredCoins: 0, fiatToDockNgn: 0 };
    }

    const coinsToClawback = Number(rewardEntry.amount);
    const debitRes = await coinService.debitCoins(
      {
        userId: rewardEntry.userId,
        action: CoinLedgerAction.REFUND_CLAWBACK,
        amount: coinsToClawback,
        referenceType: "TRANSACTION",
        referenceId: `CLAWBACK-${transactionId}`,
        idempotencyKey: `clawback_${transactionId}`,
        metadata: {
          bookingId,
          transactionId,
          originalRewardAmount: coinsToClawback,
        },
      },
      tx,
    );

    const coinsClawedBack = Math.abs(Number(debitRes.entry.amount));
    const unrecoveredCoins = Math.max(0, coinsToClawback - coinsClawedBack);
    const settings = await this.getSettings();
    const fiatToDockNgn =
      (unrecoveredCoins / (settings.redemptionRateCoins || 100)) *
      (settings.redemptionRateNgn || 100);

    return {
      coinsClawedBack,
      unrecoveredCoins,
      fiatToDockNgn,
    };
  }

  /**
   * Admin manual adjustment (+/-).
   * Delegates directly to authoritative coinService.adjustCoins.
   */
  async adminAdjust(
    adminUserId: string,
    targetUserId: string,
    amount: number,
    reason: string,
    note?: string,
  ) {
    return coinService.adjustCoins(adminUserId, targetUserId, amount, {
      reasonCode: amount > 0 ? "ADMIN_GOODWILL" : "ADMIN_CORRECTION",
      justification: reason,
      note,
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
   * Get user wallet with equivalent fiat value, strictly reconciled with the authoritative engine.
   * Pure read: never inserts or mutates state on read.
   */
  async getWalletDTO(userId: string): Promise<LoyaltyWalletDTO> {
    const [settings, coinBal, activeHolds] = await Promise.all([
      this.getSettings(),
      prisma.coinBalance.findUnique({ where: { userId } }),
      prisma.coinHold.findMany({
        where: {
          userId,
          status: "ACTIVE",
          expiresAt: { gt: new Date() },
        },
      }),
    ]);

    const balance = coinBal ? toCoinNumber(coinBal.balance) : 0;
    const lifetimeEarned = coinBal ? toCoinNumber(coinBal.lifetimeEarned) : 0;
    const lifetimeSpent = coinBal ? toCoinNumber(coinBal.lifetimeBurned) : 0;

    const reservedCoins = toCoinNumber(
      activeHolds.reduce(
        (sum, h) => sum.plus(new Decimal(h.amount)),
        new Decimal(0),
      ),
    );

    const availableBalance = toCoinNumber(
      Decimal.max(0, new Decimal(balance).minus(reservedCoins)),
    );

    const conversionFactor =
      settings.redemptionRateCoins > 0
        ? settings.redemptionRateNgn / settings.redemptionRateCoins
        : 1;
    const equivalentNgnValue = toCoinNumber(
      new Decimal(availableBalance).times(conversionFactor),
    );
    const tierInfo = getMemberTier(lifetimeEarned);

    return {
      id: userId,
      userId,
      balance,
      reservedCoins,
      availableBalance,
      lifetimeEarned,
      lifetimeSpent,
      equivalentNgnValue,
      coinSymbol: settings.coinSymbol,
      coinName: settings.coinName,
      tier: tierInfo.tier,
      tierMultiplier: tierInfo.multiplier,
    };
  }

  /**
   * Get user ledger with pagination from authoritative coin_ledger_entries.
   * Filters out 0-amount entries from customer view, sanitizes metadata with allow-list.
   */
  async getLedger(
    userId: string,
    options: { page?: number; limit?: number; type?: string } = {},
  ): Promise<LoyaltyLedgerListResponse> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, Math.min(100, options.limit || 20));
    const skip = (page - 1) * limit;

    let actionFilter: CoinLedgerAction | undefined;
    if (options.type) {
      actionFilter =
        TRANSACTION_TYPE_TO_ACTION[options.type as LoyaltyTransactionType];
    }

    const where: Prisma.CoinLedgerEntryWhereInput = {
      userId,
      amount: { not: 0 },
      ...(actionFilter ? { action: actionFilter } : {}),
    };

    const [total, items] = await Promise.all([
      prisma.coinLedgerEntry.count({ where }),
      prisma.coinLedgerEntry.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      }),
    ]);

    const ALLOWED_METADATA_KEYS = new Set([
      "description",
      "bookingReference",
      "bookingId",
      "campaignName",
      "reason",
      "shortfall",
    ]);

    return {
      items: items.map((i) => {
        let sanitizedMetadata: Record<string, any> | undefined;
        if (i.metadata && typeof i.metadata === "object") {
          sanitizedMetadata = {};
          for (const [k, v] of Object.entries(
            i.metadata as Record<string, any>,
          )) {
            if (ALLOWED_METADATA_KEYS.has(k)) {
              sanitizedMetadata[k] = v;
            }
          }
        }

        const mappedType = mapActionToTransactionType(i.action);

        return {
          id: i.id,
          walletId: i.userId,
          userId: i.userId,
          amount: toCoinNumber(i.amount),
          balanceAfter: toCoinNumber(i.balanceAfter),
          type: mappedType as any,
          referenceId: i.referenceId || i.id,
          referenceType: i.referenceType,
          description: formatLedgerDescription(i),
          metadata: sanitizedMetadata,
          createdAt: i.createdAt.toISOString(),
        };
      }),
      total,
      page,
      limit,
    };
  }

  /**
   * Get global loyalty ledger for Admin.
   * Includes 0-amount entries (such as clawback shortfalls) and joins user details.
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

    let actionFilter: CoinLedgerAction | undefined;
    if (options.type) {
      actionFilter =
        TRANSACTION_TYPE_TO_ACTION[options.type as LoyaltyTransactionType];
    }

    const where: Prisma.CoinLedgerEntryWhereInput = {
      ...(actionFilter ? { action: actionFilter } : {}),
      ...(options.search
        ? {
            OR: [
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
              {
                user: {
                  clientId: { contains: options.search, mode: "insensitive" },
                },
              },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      prisma.coinLedgerEntry.count({ where }),
      prisma.coinLedgerEntry.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
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
        walletId: i.userId,
        userId: i.userId,
        userName: i.user
          ? `${i.user.firstName} ${i.user.lastName}`.trim()
          : undefined,
        userEmail: i.user?.email,
        userClientId: i.user?.clientId,
        amount: toCoinNumber(i.amount),
        balanceAfter: toCoinNumber(i.balanceAfter),
        type: mapActionToTransactionType(i.action),
        referenceId: i.referenceId || i.id,
        referenceType: i.referenceType,
        description: formatLedgerDescription(i),
        metadata: (i.metadata as any) || {},
        createdAt: i.createdAt.toISOString(),
      })),
      total,
      page,
      limit,
    };
  }

  /**
   * Get aggregated admin stats from authoritative coin_balances and coin_ledger_entries.
   */
  async getAdminStats(): Promise<AdminLoyaltyStatsDTO> {
    const [settings, balanceAggs, activeEarnersCount, totalTxCount] =
      await Promise.all([
        this.getSettings(),
        prisma.coinBalance.aggregate({
          _sum: {
            balance: true,
            lifetimeEarned: true,
            lifetimeBurned: true,
          },
        }),
        prisma.coinBalance.count({
          where: { lifetimeEarned: { gt: 0 } },
        }),
        prisma.coinLedgerEntry.count(),
      ]);

    const totalCirculationCoins = toCoinNumber(balanceAggs._sum.balance || 0);
    const lifetimeCoinsEarned = toCoinNumber(
      balanceAggs._sum.lifetimeEarned || 0,
    );
    const lifetimeCoinsRedeemed = toCoinNumber(
      balanceAggs._sum.lifetimeBurned || 0,
    );
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
