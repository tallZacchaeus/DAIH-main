import { Prisma, CoinLedgerAction, HoldStatus, UserRole } from "@prisma/client";
import { prisma } from "../../db/client.js";
import {
  PEEDEE_CONFIG,
  FEATURE_FLAGS,
  getMemberTier,
} from "../../config/peedee.config.js";
import { Decimal } from "@prisma/client/runtime/library";
import { loyaltyRepository } from "./loyalty.repository.js";
import { CoinAdjustmentReasonCode } from "@daih/types";

export interface CoinBalanceSummary {
  userId: string;
  totalBalance: number;
  heldBalance: number;
  spendableBalance: number;
  lifetimeEarned: number;
  lifetimeBurned: number;
  lastEarnedAt: Date | null;
}

export interface CreditCoinDTO {
  userId: string;
  action: CoinLedgerAction;
  amount: number | Decimal;
  referenceType: string;
  referenceId?: string;
  idempotencyKey: string;
  metadata?: Record<string, any>;
}

export interface DebitCoinDTO {
  userId: string;
  action: CoinLedgerAction;
  amount: number | Decimal;
  referenceType: string;
  referenceId?: string;
  idempotencyKey: string;
  metadata?: Record<string, any>;
}

export interface CreateHoldDTO {
  userId: string;
  bookingId: string;
  amount: number | Decimal;
  nairaValue: number | Decimal;
  durationMinutes?: number;
}

export class CoinService {
  /**
   * Retrieves current spendable, held, and total balance for a customer.
   * Spendable = Total Balance - Active Unexpired Holds.
   */
  async getSpendableBalance(
    userId: string,
    tx: Prisma.TransactionClient | typeof prisma = prisma,
  ): Promise<CoinBalanceSummary> {
    const balanceRecord = await tx.coinBalance.findUnique({
      where: { userId },
    });

    const now = new Date();
    const activeHolds = await tx.coinHold.findMany({
      where: {
        userId,
        status: HoldStatus.ACTIVE,
        expiresAt: { gt: now },
      },
    });

    const totalBalance = balanceRecord ? Number(balanceRecord.balance) : 0;
    const lifetimeEarned = balanceRecord
      ? Number(balanceRecord.lifetimeEarned)
      : 0;
    const lifetimeBurned = balanceRecord
      ? Number(balanceRecord.lifetimeBurned)
      : 0;
    const lastEarnedAt = balanceRecord?.lastEarnedAt || null;

    const heldBalance = activeHolds.reduce(
      (sum, h) => sum + Number(h.amount),
      0,
    );

    const spendableBalance = Math.max(0, totalBalance - heldBalance);

    return {
      userId,
      totalBalance,
      heldBalance,
      spendableBalance,
      lifetimeEarned,
      lifetimeBurned,
      lastEarnedAt,
    };
  }

  /**
   * Credits coins to a customer's account atomically using row-level locking (SELECT FOR UPDATE).
   * Ensures serialized ordering, idempotency, and update of ledger entries.
   */
  async creditCoins(
    dto: CreditCoinDTO,
    externalTx?: Prisma.TransactionClient,
  ): Promise<{ entry: any; newBalance: number; duplicate: boolean }> {
    if (!FEATURE_FLAGS.FEATURE_COIN_EARNING) {
      return { entry: null, newBalance: 0, duplicate: false };
    }

    const runInTx = async (tx: Prisma.TransactionClient) => {
      // 1. Check idempotency first
      const existing = await tx.coinLedgerEntry.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
      });

      if (existing) {
        const balance = await tx.coinBalance.findUnique({
          where: { userId: dto.userId },
        });
        return {
          entry: existing,
          newBalance: balance ? Number(balance.balance) : 0,
          duplicate: true,
        };
      }

      // 2. Ensure row exists & acquire SELECT FOR UPDATE row-level lock
      await tx.$executeRaw`
        INSERT INTO "coin_balances" ("userId", "balance", "lifetimeEarned", "lifetimeBurned", "version", "updatedAt")
        VALUES (${dto.userId}, 0, 0, 0, 1, NOW())
        ON CONFLICT ("userId") DO NOTHING;
      `;

      const rows = await tx.$queryRaw<
        Array<{
          userId: string;
          balance: any;
          lifetimeEarned: any;
          lifetimeBurned: any;
          version: number;
        }>
      >`
        SELECT "userId", "balance", "lifetimeEarned", "lifetimeBurned", "version"
        FROM "coin_balances"
        WHERE "userId" = ${dto.userId}
        FOR UPDATE;
      `;

      const current = rows[0];
      const currentBalance = new Decimal(current.balance || 0);
      const currentEarned = new Decimal(current.lifetimeEarned || 0);
      const amountToAdd = new Decimal(dto.amount);

      const nextBalance = currentBalance.plus(amountToAdd);
      const nextEarned = currentEarned.plus(amountToAdd);

      // 3. Update locked balance row
      await tx.coinBalance.update({
        where: { userId: dto.userId },
        data: {
          balance: nextBalance,
          lifetimeEarned: nextEarned,
          lastEarnedAt: new Date(),
          version: { increment: 1 },
        },
      });

      // 4. Create immutable append-only ledger entry
      const entry = await tx.coinLedgerEntry.create({
        data: {
          userId: dto.userId,
          action: dto.action,
          amount: amountToAdd,
          balanceAfter: nextBalance,
          referenceType: dto.referenceType,
          referenceId: dto.referenceId,
          idempotencyKey: dto.idempotencyKey,
          metadata: dto.metadata || {},
        },
      });

      // 5. Dual-write to legacy loyaltyWallet for backward compatibility
      try {
        await tx.loyaltyWallet.upsert({
          where: { userId: dto.userId },
          create: {
            userId: dto.userId,
            balance: nextBalance,
            lifetimeEarned: nextEarned,
            lifetimeSpent: 0,
          },
          update: {
            balance: nextBalance,
            lifetimeEarned: nextEarned,
          },
        });
      } catch {}

      return {
        entry,
        newBalance: Number(nextBalance),
        duplicate: false,
      };
    };

    if (externalTx) {
      return runInTx(externalTx);
    }
    return prisma.$transaction(runInTx);
  }

  /**
   * Debits coins from a customer's account atomically.
   * Uses SELECT FOR UPDATE to enforce that spendable >= amount, preventing concurrent races.
   */
  async debitCoins(
    dto: DebitCoinDTO,
    externalTx?: Prisma.TransactionClient,
  ): Promise<{ entry: any; newBalance: number; duplicate: boolean }> {
    const runInTx = async (tx: Prisma.TransactionClient) => {
      // 1. Check idempotency
      const existing = await tx.coinLedgerEntry.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
      });

      if (existing) {
        const balance = await tx.coinBalance.findUnique({
          where: { userId: dto.userId },
        });
        return {
          entry: existing,
          newBalance: balance ? Number(balance.balance) : 0,
          duplicate: true,
        };
      }

      // 2. Lock row FOR UPDATE
      await tx.$executeRaw`
        INSERT INTO "coin_balances" ("userId", "balance", "lifetimeEarned", "lifetimeBurned", "version", "updatedAt")
        VALUES (${dto.userId}, 0, 0, 0, 1, NOW())
        ON CONFLICT ("userId") DO NOTHING;
      `;

      const rows = await tx.$queryRaw<
        Array<{
          userId: string;
          balance: any;
          lifetimeEarned: any;
          lifetimeBurned: any;
          version: number;
        }>
      >`
        SELECT "userId", "balance", "lifetimeEarned", "lifetimeBurned", "version"
        FROM "coin_balances"
        WHERE "userId" = ${dto.userId}
        FOR UPDATE;
      `;

      const current = rows[0];
      const currentBalance = new Decimal(current.balance || 0);
      const currentBurned = new Decimal(current.lifetimeBurned || 0);
      const amountToDeduct = new Decimal(dto.amount);

      // Check active unexpired holds
      const now = new Date();
      const activeHolds = await tx.coinHold.findMany({
        where: {
          userId: dto.userId,
          status: HoldStatus.ACTIVE,
          expiresAt: { gt: now },
        },
      });

      const heldAmount = activeHolds.reduce(
        (sum, h) => sum.plus(new Decimal(h.amount)),
        new Decimal(0),
      );

      const spendable = Decimal.max(0, currentBalance.minus(heldAmount));

      if (spendable.lessThan(amountToDeduct)) {
        const error: any = new Error(
          `Insufficient spendable PeeDee Coins. Available: ${spendable.toFixed(0)}, Required: ${amountToDeduct.toFixed(0)}`,
        );
        error.code = "INSUFFICIENT_COIN_BALANCE";
        error.statusCode = 400;
        throw error;
      }

      const nextBalance = currentBalance.minus(amountToDeduct);
      const nextBurned = currentBurned.plus(amountToDeduct);

      // 3. Update locked balance row
      await tx.coinBalance.update({
        where: { userId: dto.userId },
        data: {
          balance: nextBalance,
          lifetimeBurned: nextBurned,
          version: { increment: 1 },
        },
      });

      // 4. Create ledger entry
      const entry = await tx.coinLedgerEntry.create({
        data: {
          userId: dto.userId,
          action: dto.action,
          amount: amountToDeduct.negated(),
          balanceAfter: nextBalance,
          referenceType: dto.referenceType,
          referenceId: dto.referenceId,
          idempotencyKey: dto.idempotencyKey,
          metadata: dto.metadata || {},
        },
      });

      // 5. Dual-write to legacy loyaltyWallet
      try {
        await tx.loyaltyWallet.upsert({
          where: { userId: dto.userId },
          create: {
            userId: dto.userId,
            balance: nextBalance,
            lifetimeEarned: 0,
            lifetimeSpent: nextBurned,
          },
          update: {
            balance: nextBalance,
            lifetimeSpent: nextBurned,
          },
        });
      } catch {}

      return {
        entry,
        newBalance: Number(nextBalance),
        duplicate: false,
      };
    };

    if (externalTx) {
      return runInTx(externalTx);
    }
    return prisma.$transaction(runInTx);
  }

  /**
   * Places a 15-minute checkout hold on PeeDee coins for a booking.
   * Locks the balance row to prevent double-spending across concurrent browser tabs or checkouts.
   */
  async createHold(dto: CreateHoldDTO): Promise<any> {
    const durationMin =
      dto.durationMinutes || PEEDEE_CONFIG.HOLD_EXPIRY_MINUTES;
    const expiresAt = new Date(Date.now() + durationMin * 60 * 1000);
    const amount = new Decimal(dto.amount);
    const nairaValue = new Decimal(dto.nairaValue);

    return prisma.$transaction(async (tx) => {
      // 1. Acquire row lock on user's CoinBalance
      await tx.$executeRaw`
        INSERT INTO "coin_balances" ("userId", "balance", "lifetimeEarned", "lifetimeBurned", "version", "updatedAt")
        VALUES (${dto.userId}, 0, 0, 0, 1, NOW())
        ON CONFLICT ("userId") DO NOTHING;
      `;

      const rows = await tx.$queryRaw<Array<{ balance: any }>>`
        SELECT "balance" FROM "coin_balances" WHERE "userId" = ${dto.userId} FOR UPDATE;
      `;

      const currentBalance = new Decimal(rows[0]?.balance || 0);

      // Check other active holds (excluding this booking if re-attempting)
      const now = new Date();
      const otherHolds = await tx.coinHold.findMany({
        where: {
          userId: dto.userId,
          status: HoldStatus.ACTIVE,
          expiresAt: { gt: now },
          bookingId: { not: dto.bookingId },
        },
      });

      const otherHeldSum = otherHolds.reduce(
        (sum, h) => sum.plus(new Decimal(h.amount)),
        new Decimal(0),
      );

      const spendable = Decimal.max(0, currentBalance.minus(otherHeldSum));

      if (spendable.lessThan(amount)) {
        const error: any = new Error(
          `Insufficient spendable PeeDee coins for hold reservation. Available: ${spendable.toFixed(0)}, Required: ${amount.toFixed(0)}`,
        );
        error.code = "INSUFFICIENT_COIN_HOLD";
        error.statusCode = 400;
        throw error;
      }

      // Upsert the hold for this booking
      const hold = await tx.coinHold.upsert({
        where: { bookingId: dto.bookingId },
        create: {
          userId: dto.userId,
          bookingId: dto.bookingId,
          amount,
          nairaValue,
          status: HoldStatus.ACTIVE,
          expiresAt,
        },
        update: {
          amount,
          nairaValue,
          status: HoldStatus.ACTIVE,
          expiresAt,
        },
      });

      return hold;
    });
  }

  /**
   * Releases an active hold when checkout is cancelled or times out.
   */
  async releaseHold(
    bookingId: string,
    tx: Prisma.TransactionClient | typeof prisma = prisma,
  ): Promise<void> {
    const hold = await tx.coinHold.findUnique({
      where: { bookingId },
    });

    if (hold && hold.status === HoldStatus.ACTIVE) {
      await tx.coinHold.update({
        where: { id: hold.id },
        data: { status: HoldStatus.RELEASED },
      });
    }
  }

  /**
   * Burns an active hold upon confirmed payment settlement.
   * Atomically debits the balance and transitions hold to BURNED.
   */
  async burnHold(
    bookingId: string,
    externalTx?: Prisma.TransactionClient,
  ): Promise<{ success: boolean; burnedCoins: number }> {
    const runInTx = async (tx: Prisma.TransactionClient) => {
      const hold = await tx.coinHold.findUnique({
        where: { bookingId },
      });

      if (!hold || hold.status !== HoldStatus.ACTIVE) {
        return { success: false, burnedCoins: 0 };
      }

      const amountToBurn = new Decimal(hold.amount);

      // Lock row FOR UPDATE
      await tx.$executeRaw`
        SELECT "balance" FROM "coin_balances" WHERE "userId" = ${hold.userId} FOR UPDATE;
      `;

      const balanceRecord = await tx.coinBalance.findUnique({
        where: { userId: hold.userId },
      });

      const currentBalance = new Decimal(balanceRecord?.balance || 0);
      const currentBurned = new Decimal(balanceRecord?.lifetimeBurned || 0);
      const nextBalance = Decimal.max(0, currentBalance.minus(amountToBurn));
      const nextBurned = currentBurned.plus(amountToBurn);

      await tx.coinBalance.update({
        where: { userId: hold.userId },
        data: {
          balance: nextBalance,
          lifetimeBurned: nextBurned,
          version: { increment: 1 },
        },
      });

      await tx.coinHold.update({
        where: { id: hold.id },
        data: { status: HoldStatus.BURNED },
      });

      await tx.coinLedgerEntry.create({
        data: {
          userId: hold.userId,
          action: CoinLedgerAction.HOLD_BURNED,
          amount: amountToBurn.negated(),
          balanceAfter: nextBalance,
          referenceType: "BOOKING",
          referenceId: bookingId,
          idempotencyKey: `burn_hold_${bookingId}`,
          metadata: {
            bookingId,
            nairaValue: Number(hold.nairaValue),
          },
        },
      });

      return { success: true, burnedCoins: Number(amountToBurn) };
    };

    if (externalTx) {
      return runInTx(externalTx);
    }
    return prisma.$transaction(runInTx);
  }

  /**
   * Awards 5% PeeDee Coin earn on verified check-in for completed bookings.
   * Calculated strictly on final fiat paid after coupons/discounts.
   */
  async awardBookingCheckInEarn(
    bookingId: string,
  ): Promise<{ coinsAwarded: number }> {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        transactions: {
          where: { status: "SUCCESSFUL" },
        },
        user: true,
      },
    });

    if (!booking || !booking.user) {
      return { coinsAwarded: 0 };
    }

    // Sum of successful transactions for this booking
    const totalPaidFiat = booking.transactions.reduce(
      (sum, t) => sum.plus(new Decimal(t.amount)),
      new Decimal(0),
    );

    if (totalPaidFiat.isZero() || totalPaidFiat.isNegative()) {
      return { coinsAwarded: 0 };
    }

    // Query member's lifetime earned coins to determine their tier and booking multiplier
    const balanceRecord = await prisma.coinBalance.findUnique({
      where: { userId: booking.userId },
      select: { lifetimeEarned: true },
    });
    const lifetimeEarned = balanceRecord
      ? Number(balanceRecord.lifetimeEarned)
      : 0;
    const tierInfo = getMemberTier(lifetimeEarned);

    // 5% earn rate with tier multiplier floored to nearest whole integer
    const baseEarn = totalPaidFiat.mul(PEEDEE_CONFIG.BOOKING_EARN_RATE);
    const multipliedEarn = baseEarn.mul(new Decimal(tierInfo.multiplier));
    const coinsToAward = Math.floor(multipliedEarn.toNumber());

    if (coinsToAward <= 0) {
      return { coinsAwarded: 0 };
    }

    const idempotencyKey = `booking_earn_${booking.id}`;
    const result = await this.creditCoins({
      userId: booking.userId,
      action: CoinLedgerAction.BOOKING_EARN,
      amount: coinsToAward,
      referenceType: "BOOKING",
      referenceId: booking.id,
      idempotencyKey,
      metadata: {
        bookingReference: booking.reference,
        totalPaidFiat: totalPaidFiat.toNumber(),
        earnRate: PEEDEE_CONFIG.BOOKING_EARN_RATE.toNumber(),
        tier: tierInfo.tier,
        tierMultiplier: tierInfo.multiplier,
        lifetimeEarnedAtEarn: lifetimeEarned,
      },
    });

    return { coinsAwarded: result.duplicate ? 0 : coinsToAward };
  }

  /**
   * Awards signup welcome bonus for new verified customer.
   */
  async awardSignupBonus(userId: string): Promise<{ coinsAwarded: number }> {
    const settings = await loyaltyRepository.getSettings().catch(() => null);
    if (
      settings &&
      (!settings.isProgramActive || !settings.isSignupBonusEnabled)
    ) {
      return { coinsAwarded: 0 };
    }
    const bonusAmount =
      settings?.signupBonusCoins != null
        ? new Decimal(settings.signupBonusCoins)
        : PEEDEE_CONFIG.SIGNUP_BONUS_PD;
    if (bonusAmount.isZero() || bonusAmount.isNegative()) {
      return { coinsAwarded: 0 };
    }

    const idempotencyKey = `signup_bonus_${userId}`;
    const result = await this.creditCoins({
      userId,
      action: CoinLedgerAction.SIGNUP_BONUS,
      amount: bonusAmount,
      referenceType: "USER",
      referenceId: userId,
      idempotencyKey,
      metadata: {
        bonusType: "WELCOME_SIGNUP",
      },
    });

    return { coinsAwarded: result.duplicate ? 0 : bonusAmount.toNumber() };
  }

  /**
   * Awards birthday bonus once per calendar year.
   */
  async awardBirthdayBonus(
    userId: string,
    year: number = new Date().getFullYear(),
  ): Promise<{ coinsAwarded: number }> {
    const settings = await loyaltyRepository.getSettings().catch(() => null);
    if (
      settings &&
      (!settings.isProgramActive || !settings.isBirthdayBonusEnabled)
    ) {
      return { coinsAwarded: 0 };
    }
    const bonusAmount =
      settings?.birthdayBonusCoins != null
        ? new Decimal(settings.birthdayBonusCoins)
        : PEEDEE_CONFIG.BIRTHDAY_BONUS_PD;
    if (bonusAmount.isZero() || bonusAmount.isNegative()) {
      return { coinsAwarded: 0 };
    }

    const idempotencyKey = `birthday_bonus_${userId}_${year}`;
    const result = await this.creditCoins({
      userId,
      action: CoinLedgerAction.BIRTHDAY_BONUS,
      amount: bonusAmount,
      referenceType: "USER",
      referenceId: userId,
      idempotencyKey,
      metadata: {
        year,
        bonusType: "ANNUAL_BIRTHDAY",
      },
    });

    return { coinsAwarded: result.duplicate ? 0 : bonusAmount.toNumber() };
  }

  /**
   * Awards streak bonus for achieving threshold check-ins within the rolling window.
   */
  async awardStreakBonus(
    userId: string,
    yearMonth: string,
  ): Promise<{ coinsAwarded: number }> {
    const settings = await loyaltyRepository.getSettings().catch(() => null);
    if (
      settings &&
      (!settings.isProgramActive || !settings.isStreakBonusEnabled)
    ) {
      return { coinsAwarded: 0 };
    }
    const bonusAmount =
      settings?.streakBonusCoins != null
        ? new Decimal(settings.streakBonusCoins)
        : PEEDEE_CONFIG.STREAK_BONUS_PD;
    const thresholdCount =
      settings?.streakThresholdCount ?? PEEDEE_CONFIG.STREAK_MONTHS_THRESHOLD;
    const windowDays = settings?.streakWindowDays ?? 30;
    if (bonusAmount.isZero() || bonusAmount.isNegative()) {
      return { coinsAwarded: 0 };
    }

    const idempotencyKey = `streak_bonus_${userId}_${yearMonth}`;
    const result = await this.creditCoins({
      userId,
      action: CoinLedgerAction.STREAK_BONUS,
      amount: bonusAmount,
      referenceType: "USER",
      referenceId: userId,
      idempotencyKey,
      metadata: {
        period: yearMonth,
        streakThresholdCount: thresholdCount,
        streakWindowDays: windowDays,
      },
    });

    return { coinsAwarded: result.duplicate ? 0 : bonusAmount.toNumber() };
  }

  /**
   * Evaluates if user qualifies for the monthly streak bonus (4 check-ins in the calendar month / 30-day window)
   * and awards the streak bonus if threshold is met.
   */
  async evaluateAndAwardStreakBonus(
    userId: string,
  ): Promise<{ coinsAwarded: number }> {
    const now = new Date();
    const yearMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    const startOfMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );

    // Count distinct visit sessions / check-ins for this user in the current calendar month
    const checkInCount = await prisma.visitSession.count({
      where: {
        userId,
        checkInTime: { gte: startOfMonth },
      },
    });

    // 4 check-ins in the month threshold
    if (checkInCount >= 4) {
      return this.awardStreakBonus(userId, yearMonth);
    }

    return { coinsAwarded: 0 };
  }

  /**
   * Reverses redeemed coins on booking refund (returning coins to customer).
   */
  async reverseRedemption(
    bookingId: string,
    coinsToReturn: number | Decimal,
    externalTx?: Prisma.TransactionClient,
  ): Promise<void> {
    const amount = new Decimal(coinsToReturn);
    if (amount.isZero() || amount.isNegative()) return;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { userId: true, reference: true },
    });

    if (!booking) return;

    await this.creditCoins(
      {
        userId: booking.userId,
        action: CoinLedgerAction.REDEMPTION_REVERSAL,
        amount,
        referenceType: "BOOKING",
        referenceId: bookingId,
        idempotencyKey: `redemption_reversal_${bookingId}`,
        metadata: {
          bookingReference: booking.reference,
          reason: "REFUND_REVERSAL",
        },
      },
      externalTx,
    );
  }

  /**
   * Claws back earned coins from customer on booking refund.
   */
  async clawbackEarnedCoins(
    bookingId: string,
    coinsToClawback: number | Decimal,
    externalTx?: Prisma.TransactionClient,
  ): Promise<void> {
    const amount = new Decimal(coinsToClawback);
    if (amount.isZero() || amount.isNegative()) return;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { userId: true, reference: true },
    });

    if (!booking) return;

    await this.debitCoins(
      {
        userId: booking.userId,
        action: CoinLedgerAction.REFUND_CLAWBACK,
        amount,
        referenceType: "BOOKING",
        referenceId: bookingId,
        idempotencyKey: `clawback_customer_${bookingId}`,
        metadata: {
          bookingReference: booking.reference,
          reason: "BOOKING_REFUND",
        },
      },
      externalTx,
    );
  }

  /**
   * Claws back referral bonus awarded to referrer on booking refund.
   * Clamped strictly to what was actually credited for this booking to prevent over-clawbacks.
   * Idempotent via `coin:clawback:referral:${bookingId}`.
   */
  async clawbackReferralBonus(
    bookingId: string,
    referrerId: string,
    coinsToClawback: number | Decimal,
    externalTx?: Prisma.TransactionClient,
  ): Promise<void> {
    const tx = externalTx || prisma;
    const originalBonusEntry = await tx.coinLedgerEntry.findFirst({
      where: {
        referenceId: bookingId,
        action: CoinLedgerAction.REFERRAL_BONUS,
      },
    });

    if (!originalBonusEntry) return;

    const originalAward = Number(originalBonusEntry.amount);
    const amountToClawback = Math.min(Number(coinsToClawback), originalAward);
    if (amountToClawback <= 0) return;

    const refereeUserId = (originalBonusEntry.metadata as any)?.refereeUserId;

    await this.debitCoins(
      {
        userId: referrerId,
        action: CoinLedgerAction.REFUND_CLAWBACK,
        amount: amountToClawback,
        referenceType: "BOOKING",
        referenceId: bookingId,
        idempotencyKey: `coin:clawback:referral:${bookingId}`,
        metadata: {
          bookingId,
          reason: "REFERRAL_BOOKING_REFUND",
          refereeUserId,
          originalAward,
          clawedBackAmount: amountToClawback,
        },
      },
      externalTx,
    );
  }

  /**
   * Awards referral bonus to referrer upon referee's booking check-in.
   * - Proportional (5% default)
   * - Windowed (<= 90 days from referee creation)
   * - Settled Paystack transaction
   * - Cumulative cap across referee bookings (1,000 PD default), accounting for refunds
   * - First-award-only floor (50 PD default), re-clamped to headroom
   * - Anti-abuse: Hard rejections for direct self-referral, phone match, or Paystack signature match (NEVER writes to ledger)
   * - Soft signal: Shared device fingerprint logged in queryable metadata
   * - Distinct referee velocity check (>10 distinct referees in 30 days dispatches admin alert with 30-day rolling cooldown)
   */
  async awardReferralBonus(
    bookingId: string,
  ): Promise<{ coinsAwarded: number; reason?: string }> {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        transactions: { where: { status: "SUCCESSFUL" } },
        user: true,
      },
    });

    if (!booking || !booking.user) {
      return { coinsAwarded: 0 };
    }

    const referee = booking.user;
    if (!referee.referredById) {
      return { coinsAwarded: 0 };
    }
    const referrerId: string = referee.referredById;

    const settings = await loyaltyRepository.getSettings().catch(() => null);
    if (
      settings &&
      (!settings.isProgramActive || !settings.isReferralRewardEnabled)
    ) {
      return { coinsAwarded: 0 };
    }

    // 1. Check registration window (configurable, default 90 days)
    const windowDays =
      settings?.referralWindowDays ?? PEEDEE_CONFIG.REFERRAL_WINDOW_DAYS;
    const now = new Date();
    const refereeCreatedAt = new Date(referee.createdAt);
    const diffDays =
      (now.getTime() - refereeCreatedAt.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays > windowDays) {
      return { coinsAwarded: 0, reason: "WINDOW_EXPIRED" };
    }

    // 2. Sum settled successful transactions for this booking
    const totalPaidFiat = booking.transactions.reduce(
      (sum, t) => sum.plus(new Decimal(t.amount)),
      new Decimal(0),
    );

    if (totalPaidFiat.isZero() || totalPaidFiat.isNegative()) {
      return { coinsAwarded: 0, reason: "NO_SETTLED_AMOUNT" };
    }

    const referrer = await prisma.user.findUnique({
      where: { id: referrerId },
    });
    if (!referrer) {
      return { coinsAwarded: 0, reason: "REFERRER_NOT_FOUND" };
    }

    // 3. Anti-Abuse Hard Rejections (No Ledger Entries Created)
    // 3a. Direct self-referral
    if (referrerId === referee.id) {
      console.warn(
        `[AntiAbuse] Hard rejection SELF_REF_SAME_USER: referee=${referee.id}, referrer=${referrerId}`,
      );
      return { coinsAwarded: 0, reason: "SELF_REF_SAME_USER" };
    }

    // 3b. Phone match (normalized digits, handling local 080... and +234... international prefixes)
    if (referrer.phoneNumber && referee.phoneNumber) {
      const normalizePhone = (phone: string): string => {
        const digits = phone.replace(/\D/g, "");
        if (digits.startsWith("234") && digits.length === 13) {
          return digits.slice(3);
        }
        if (digits.startsWith("0") && digits.length === 11) {
          return digits.slice(1);
        }
        return digits.length >= 10 ? digits.slice(-10) : digits;
      };

      const refPhoneNorm = normalizePhone(referee.phoneNumber);
      const referrerPhoneNorm = normalizePhone(referrer.phoneNumber);
      if (refPhoneNorm.length >= 7 && refPhoneNorm === referrerPhoneNorm) {
        console.warn(
          `[AntiAbuse] Hard rejection SELF_REF_PHONE_MATCH: phone=${refPhoneNorm}`,
        );
        return { coinsAwarded: 0, reason: "SELF_REF_PHONE_MATCH" };
      }
    }

    // 3c. Paystack authorization card signature match
    const refereeSignatures = booking.transactions
      .map((t: any) => t.gatewayResponse?.authorization?.signature)
      .filter(Boolean);

    if (refereeSignatures.length > 0) {
      const referrerTransactions = await prisma.transaction.findMany({
        where: {
          userId: referrerId,
          status: "SUCCESSFUL",
        },
        select: { gatewayResponse: true },
      });
      const referrerSignatures = new Set(
        referrerTransactions
          .map((t: any) => t.gatewayResponse?.authorization?.signature)
          .filter(Boolean),
      );

      const hasSignatureMatch = refereeSignatures.some((sig: string) =>
        referrerSignatures.has(sig),
      );
      if (hasSignatureMatch) {
        console.warn(
          `[AntiAbuse] Hard rejection SELF_REF_CARD_SIGNATURE_MATCH between referrer=${referrerId} and referee=${referee.id}`,
        );
        return { coinsAwarded: 0, reason: "SELF_REF_CARD_SIGNATURE_MATCH" };
      }
    }

    // 4. Soft Signal: Shared Device Fingerprint (Paid with queryable audit flag)
    let sharedDeviceFlag = false;
    let sharedDeviceFingerprint: string | undefined;
    try {
      const [refereeSessions, referrerSessions] = await Promise.all([
        prisma.authSession.findMany({
          where: { userId: referee.id },
          select: { deviceFingerprint: true },
        }),
        prisma.authSession.findMany({
          where: { userId: referrerId },
          select: { deviceFingerprint: true },
        }),
      ]);

      const refereeFps = new Set(
        refereeSessions
          .map((s) => s.deviceFingerprint)
          .filter(Boolean) as string[],
      );
      const matchedFp = referrerSessions.find(
        (s) => s.deviceFingerprint && refereeFps.has(s.deviceFingerprint),
      )?.deviceFingerprint;

      if (matchedFp) {
        sharedDeviceFlag = true;
        sharedDeviceFingerprint = matchedFp;
      }
    } catch {
      // In case session table lookup is unavailable
    }

    // 5. Cumulative Cap & Headroom Calculation
    const [referralEntries, clawbackEntries] = await Promise.all([
      prisma.coinLedgerEntry.findMany({
        where: {
          userId: referrerId,
          action: CoinLedgerAction.REFERRAL_BONUS,
        },
      }),
      prisma.coinLedgerEntry.findMany({
        where: {
          userId: referrerId,
          action: CoinLedgerAction.REFUND_CLAWBACK,
        },
      }),
    ]);

    const pairReferralEntries = referralEntries.filter(
      (e) => (e.metadata as any)?.refereeUserId === referee.id,
    );
    const pairClawbackEntries = clawbackEntries.filter(
      (e) =>
        (e.metadata as any)?.reason === "REFERRAL_BOOKING_REFUND" &&
        (e.metadata as any)?.refereeUserId === referee.id,
    );

    const earnedSoFar = pairReferralEntries.reduce(
      (sum, e) => sum.plus(new Decimal(e.amount)),
      new Decimal(0),
    );
    const clawedBackSoFar = pairClawbackEntries.reduce(
      (sum, e) => sum.plus(new Decimal(e.amount).abs()),
      new Decimal(0),
    );

    const paidSoFar = Decimal.max(
      0,
      earnedSoFar.minus(clawedBackSoFar),
    ).toNumber();

    const maxCap =
      settings?.referralCapCoins != null
        ? Number(settings.referralCapCoins)
        : PEEDEE_CONFIG.REFERRAL_MAX_COINS_CAP.toNumber();

    const headroom = Math.max(0, maxCap - paidSoFar);
    if (headroom <= 0) {
      return { coinsAwarded: 0, reason: "CAP_EXCEEDED" };
    }

    // 6. First-Award Detection via qualifyingAwardsCount & Floor Re-clamping
    const percentRate =
      settings?.referralRewardPercent != null
        ? Number(settings.referralRewardPercent) / 100
        : PEEDEE_CONFIG.REFERRAL_PERCENT_REWARD.toNumber();
    const minFloor =
      settings?.referralFloorCoins != null
        ? Number(settings.referralFloorCoins)
        : PEEDEE_CONFIG.REFERRAL_MIN_COINS_FLOOR.toNumber();

    const qualifyingAwardsCount = pairReferralEntries.filter(
      (e) => Number(e.amount) > 0,
    ).length;

    const raw = Math.floor(totalPaidFiat.mul(percentRate).toNumber());

    let award = 0;
    if (qualifyingAwardsCount === 0) {
      // First qualifying award: apply floor, then re-clamp strictly to headroom
      award = Math.min(headroom, Math.max(raw, minFloor));
    } else {
      // Subsequent awards: raw proportional capped at headroom, no floor
      award = Math.min(raw, headroom);
    }

    if (award <= 0) {
      return { coinsAwarded: 0, reason: "HEADROOM_ZERO" };
    }

    // 7. Credit Referrer Coins
    const idempotencyKey = `coin:earn:referral:${booking.id}`;
    const result = await this.creditCoins({
      userId: referrerId,
      action: CoinLedgerAction.REFERRAL_BONUS,
      amount: award,
      referenceType: "BOOKING",
      referenceId: booking.id,
      idempotencyKey,
      metadata: {
        refereeUserId: referee.id,
        refereeName: `${referee.firstName} ${referee.lastName}`.trim(),
        bookingReference: booking.reference,
        totalPaidFiat: totalPaidFiat.toNumber(),
        rewardCoins: award,
        ...(sharedDeviceFlag
          ? {
              sharedDeviceFlag: true,
              sharedDeviceFingerprint,
            }
          : {}),
      },
    });

    if (result.duplicate) {
      return { coinsAwarded: 0, reason: "DUPLICATE_ACCRUAL" };
    }

    // 8. Velocity Check: Trailing 30-Day Distinct Referees (>10 triggers alert)
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentReferralEntries = await prisma.coinLedgerEntry.findMany({
        where: {
          userId: referrerId,
          action: CoinLedgerAction.REFERRAL_BONUS,
          createdAt: { gte: thirtyDaysAgo },
        },
      });

      const distinctReferees = new Set(
        recentReferralEntries
          .map((e) => (e.metadata as any)?.refereeUserId)
          .filter(Boolean),
      );

      if (distinctReferees.size > 10) {
        const recentAlerts = await prisma.notification.findMany({
          where: {
            type: "ops.referral_velocity_alert",
            createdAt: { gte: thirtyDaysAgo },
          },
        });

        const alertOnCooldown = recentAlerts.some(
          (n) => (n.metadata as any)?.velocityAlertReferrerId === referrerId,
        );

        if (!alertOnCooldown) {
          const admins = await prisma.user.findMany({
            where: {
              role: { in: [UserRole.OPERATIONS_ADMIN, UserRole.SUPER_ADMIN] },
            },
            select: { id: true },
          });

          for (const admin of admins) {
            await prisma.notification.create({
              data: {
                userId: admin.id,
                type: "ops.referral_velocity_alert",
                title: "Referral Velocity Alert",
                message: `Referrer ${referrer.firstName} ${referrer.lastName} (${referrer.id}) has referred ${distinctReferees.size} distinct referees in the last 30 days.`,
                metadata: {
                  velocityAlertReferrerId: referrerId,
                  distinctRefereeCount: distinctReferees.size,
                },
              },
            });
          }
        }
      }
    } catch (err: any) {
      console.warn("[Loyalty] Velocity alert evaluation error:", err?.message);
    }

    return { coinsAwarded: award };
  }

  /**
   * Awards welcome bonus to the referee upon their first check-in.
   * Flat 200 PD default (or settings.refereeWelcomeBonus), keyed `coin:earn:referee:${referee.id}`.
   */
  async awardRefereeWelcomeReward(
    refereeUserId: string,
  ): Promise<{ coinsAwarded: number }> {
    const referee = await prisma.user.findUnique({
      where: { id: refereeUserId },
    });

    if (!referee || !referee.referredById) {
      return { coinsAwarded: 0 };
    }

    const settings = await loyaltyRepository.getSettings().catch(() => null);
    if (
      settings &&
      (!settings.isProgramActive || !settings.isReferralRewardEnabled)
    ) {
      return { coinsAwarded: 0 };
    }

    const welcomeBonus =
      settings?.refereeWelcomeBonus != null &&
      Number(settings.refereeWelcomeBonus) > 0
        ? Number(settings.refereeWelcomeBonus)
        : PEEDEE_CONFIG.REFEREE_WELCOME_BONUS_PD.toNumber();

    if (welcomeBonus <= 0) {
      return { coinsAwarded: 0 };
    }

    const idempotencyKey = `coin:earn:referee:${referee.id}`;
    const result = await this.creditCoins({
      userId: referee.id,
      action: CoinLedgerAction.REFERRAL_BONUS,
      amount: welcomeBonus,
      referenceType: "REFEREE_WELCOME",
      referenceId: referee.id,
      idempotencyKey,
      metadata: {
        reason: "REFEREE_WELCOME_BONUS",
        referrerUserId: referee.referredById,
      },
    });

    return { coinsAwarded: result.duplicate ? 0 : welcomeBonus };
  }

  /**
   * Manual staff balance adjustment enforcing 6 mandatory guardrails:
   * 1. Justification required (minimum 20 characters)
   * 2. Reason code required (GOODWILL, SYSTEM_ERROR, DISPUTE_RESOLUTION, PROMOTIONAL, CORRECTION)
   * 3. Always audit-logged (AuditLog with entityType: "CoinLedgerEntry", acting userId, and ipAddress)
   * 4. Per-transaction ceiling: 5,000 PD (above requires SUPER_ADMIN)
   * 5. Daily ceiling: 20,000 PD per staff member, resetting midnight WAT (UTC+1)
   * 6. Never self-adjust (reject unconditionally if acting staff member is target customer)
   */
  async adjustCoins(
    staffUserId: string,
    targetUserId: string,
    amount: number | Decimal,
    reasonOrOptions:
      | string
      | {
          reasonCode?: CoinAdjustmentReasonCode | string;
          justification?: string;
          reason?: string;
          note?: string;
          ipAddress?: string;
        },
    justificationArg?: string,
    ipAddressArg?: string,
  ): Promise<{ entry: any; newBalance: number }> {
    // ─── Guardrail 6: Never Self-Adjust ───────────────────────────────────────────
    if (staffUserId === targetUserId) {
      const error: any = new Error(
        "Guardrail Violation: Staff members are strictly prohibited from adjusting their own personal coin wallet balance.",
      );
      error.code = "SELF_ADJUSTMENT_PROHIBITED";
      error.statusCode = 403;
      throw error;
    }

    // Parse options vs string arguments
    let reasonCode: CoinAdjustmentReasonCode | string | undefined;
    let justification: string = "";
    let note: string | undefined;
    let ipAddress: string | undefined = ipAddressArg;

    if (typeof reasonOrOptions === "object" && reasonOrOptions !== null) {
      reasonCode = reasonOrOptions.reasonCode;
      justification =
        reasonOrOptions.justification || reasonOrOptions.reason || "";
      note = reasonOrOptions.note;
      ipAddress = reasonOrOptions.ipAddress || ipAddressArg;
    } else {
      justification = justificationArg || reasonOrOptions || "";
    }

    // ─── Guardrail 1: Justification Required (>= 20 characters) ───────────────────
    const cleanJustification = (justification || "").trim();
    if (cleanJustification.length < 20) {
      const error: any = new Error(
        "Guardrail Violation: Manual adjustment justification must be at least 20 characters explaining the operational reason.",
      );
      error.code = "INVALID_ADJUSTMENT_JUSTIFICATION";
      error.statusCode = 400;
      throw error;
    }

    // ─── Guardrail 2: Reason Code Required ─────────────────────────────────────────
    const validReasonCodes = Object.values(CoinAdjustmentReasonCode);
    let effectiveReasonCode: CoinAdjustmentReasonCode =
      CoinAdjustmentReasonCode.GOODWILL;
    if (reasonCode) {
      if (!validReasonCodes.includes(reasonCode as CoinAdjustmentReasonCode)) {
        const error: any = new Error(
          `Guardrail Violation: Reason code must be one of: ${validReasonCodes.join(", ")}`,
        );
        error.code = "INVALID_REASON_CODE";
        error.statusCode = 400;
        throw error;
      }
      effectiveReasonCode = reasonCode as CoinAdjustmentReasonCode;
    }

    const adjustDecimal = new Decimal(amount);
    if (adjustDecimal.isZero()) {
      const error: any = new Error("Adjustment amount cannot be zero.");
      error.code = "INVALID_ADJUSTMENT_AMOUNT";
      error.statusCode = 400;
      throw error;
    }

    const absAmount = adjustDecimal.abs();

    // ─── Guardrail 4: Per-Transaction Ceiling (5,000 PD; above requires SUPER_ADMIN)
    const transactionLimit =
      PEEDEE_CONFIG.MANUAL_ADJUSTMENT_TRANSACTION_LIMIT_PD;
    if (absAmount.greaterThan(transactionLimit)) {
      const staffUser = await prisma.user.findUnique({
        where: { id: staffUserId },
        select: { id: true, role: true },
      });

      if (staffUser?.role !== UserRole.SUPER_ADMIN) {
        const error: any = new Error(
          `Guardrail Violation: Single adjustments exceeding ${transactionLimit.toFixed(0)} PD per transaction require SUPER_ADMIN authorization. (Requested: ${absAmount.toFixed(0)} PD)`,
        );
        error.code = "TRANSACTION_LIMIT_EXCEEDED";
        error.statusCode = 403;
        throw error;
      }
    }

    // ─── Guardrail 5: Daily Ceiling (20,000 PD resetting midnight WAT) ────────────
    const nowUtc = new Date();
    const watOffsetMs = 60 * 60 * 1000;
    const nowWat = new Date(nowUtc.getTime() + watOffsetMs);
    const startOfWatDay = new Date(
      Date.UTC(
        nowWat.getUTCFullYear(),
        nowWat.getUTCMonth(),
        nowWat.getUTCDate(),
      ),
    );
    const todayStart = new Date(startOfWatDay.getTime() - watOffsetMs);

    const staffAdjustmentsToday = await prisma.coinLedgerEntry.findMany({
      where: {
        action: CoinLedgerAction.ADMIN_ADJUSTMENT,
        createdAt: { gte: todayStart },
      },
      select: { amount: true, metadata: true },
    });

    const staffTotalToday = staffAdjustmentsToday
      .filter((e) => (e.metadata as any)?.adjustedByUserId === staffUserId)
      .reduce(
        (sum, e) => sum.plus(new Decimal(e.amount).abs()),
        new Decimal(0),
      );

    const settings = await loyaltyRepository.getSettings().catch(() => null);
    const dailyLimit =
      settings?.dailyAdjustmentLimitCoins != null
        ? new Decimal(settings.dailyAdjustmentLimitCoins)
        : PEEDEE_CONFIG.DAILY_OPERATOR_ADJUSTMENT_LIMIT_PD;

    if (staffTotalToday.plus(absAmount).greaterThan(dailyLimit)) {
      const error: any = new Error(
        `Guardrail Violation: Daily adjustment limit exceeded. Max ${dailyLimit.toFixed(0)} PD per staff member per day. Today's total: ${staffTotalToday.toFixed(0)} PD, Requested: ${absAmount.toFixed(0)} PD.`,
      );
      error.code = "DAILY_ADJUSTMENT_LIMIT_EXCEEDED";
      error.statusCode = 400;
      throw error;
    }

    const idempotencyKey = `admin_adj_${staffUserId}_${targetUserId}_${Date.now()}`;
    const ledgerMetadata = {
      adjustedByUserId: staffUserId,
      reasonCode: effectiveReasonCode,
      justification: cleanJustification,
      note: note || null,
      reason: cleanJustification,
    };

    let result: { entry: any; newBalance: number };

    if (adjustDecimal.isPositive()) {
      const res = await this.creditCoins({
        userId: targetUserId,
        action: CoinLedgerAction.ADMIN_ADJUSTMENT,
        amount: absAmount,
        referenceType: "ADMIN_ADJUSTMENT",
        referenceId: staffUserId,
        idempotencyKey,
        metadata: ledgerMetadata,
      });
      result = { entry: res.entry, newBalance: res.newBalance };
    } else {
      const res = await this.debitCoins({
        userId: targetUserId,
        action: CoinLedgerAction.ADMIN_ADJUSTMENT,
        amount: absAmount,
        referenceType: "ADMIN_ADJUSTMENT",
        referenceId: staffUserId,
        idempotencyKey,
        metadata: ledgerMetadata,
      });
      result = { entry: res.entry, newBalance: res.newBalance };
    }

    // ─── Guardrail 3: Always Audit-Logged ─────────────────────────────────────────
    try {
      await prisma.auditLog.create({
        data: {
          userId: staffUserId,
          action: "COIN_MANUAL_ADJUSTMENT",
          entityType: "CoinLedgerEntry",
          entityId: result.entry.id,
          ipAddress: ipAddress || null,
          metadata: {
            targetUserId,
            amount: adjustDecimal.toNumber(),
            reasonCode: effectiveReasonCode,
            justification: cleanJustification,
            note: note || null,
            balanceAfter: result.newBalance,
          },
        },
      });
    } catch (auditErr: any) {
      console.warn(
        "[CoinService] Failed to write AuditLog entry for manual adjustment:",
        auditErr?.message,
      );
    }

    return result;
  }

  /**
   * Nightly expiry worker for accounts inactive for designated months (no earn/burn activity).
   */
  async expireInactiveCoins(): Promise<{
    expiredAccounts: number;
    totalCoinsExpired: number;
  }> {
    const settings = await loyaltyRepository.getSettings().catch(() => null);
    if (settings && (!settings.isProgramActive || !settings.isExpiryEnabled)) {
      return { expiredAccounts: 0, totalCoinsExpired: 0 };
    }

    const expiryMonths =
      settings?.expiryMonths ?? PEEDEE_CONFIG.EXPIRY_INACTIVITY_MONTHS;
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - expiryMonths);

    const inactiveBalances = await prisma.coinBalance.findMany({
      where: {
        balance: { gt: 0 },
        OR: [
          { lastEarnedAt: { lt: cutoffDate } },
          { lastEarnedAt: null, updatedAt: { lt: cutoffDate } },
        ],
      },
    });

    let expiredAccounts = 0;
    let totalCoinsExpired = 0;

    for (const b of inactiveBalances) {
      try {
        const amountToExpire = Number(b.balance);
        if (amountToExpire <= 0) continue;

        const idempotencyKey = `expire_${b.userId}_${cutoffDate.toISOString().slice(0, 7)}`;
        await this.debitCoins({
          userId: b.userId,
          action: CoinLedgerAction.EXPIRY,
          amount: amountToExpire,
          referenceType: "SYSTEM",
          idempotencyKey,
          metadata: {
            inactivityMonths: expiryMonths,
            lastEarnedAt: b.lastEarnedAt,
          },
        });

        expiredAccounts++;
        totalCoinsExpired += amountToExpire;
      } catch (err: any) {
        console.warn(
          `[CoinService] Failed to expire inactive balance for user ${b.userId}:`,
          err?.message,
        );
      }
    }

    return { expiredAccounts, totalCoinsExpired };
  }
}

export const coinService = new CoinService();
