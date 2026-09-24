import { describe, it, expect, vi, beforeEach } from "vitest";
import { loyaltyRepository } from "./loyalty.repository.js";
import { prisma } from "../../db/client.js";
import { CoinLedgerAction, HoldStatus } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

vi.mock("../../db/client.js", () => {
  return {
    prisma: {
      coinBalance: {
        findUnique: vi.fn(),
        aggregate: vi.fn(),
        count: vi.fn(),
      },
      coinHold: {
        findMany: vi.fn(),
      },
      coinLedgerEntry: {
        count: vi.fn(),
        findMany: vi.fn(),
      },
      loyaltySetting: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
    },
  };
});

describe("Loyalty Parity & DTO Contract Verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock settings
    vi.mocked(prisma.loyaltySetting.findUnique).mockResolvedValue({
      id: "default",
      isProgramActive: true,
      coinName: "PD Coin",
      coinSymbol: "PDC",
      isTransactionRewardEnabled: true,
      formulaMode: "SPEND_RATIO",
      spendRatioNgn: new Decimal("100"),
      percentageRate: new Decimal("1.0"),
      fixedAmountCoins: new Decimal("50"),
      minSpendThreshold: new Decimal("500"),
      maxCoinsPerTransaction: null,
      isReferralRewardEnabled: false,
      coinsPerActiveReferral: new Decimal("100"),
      refereeWelcomeBonus: new Decimal("0"),
      referralRewardPercent: new Decimal("5.0"),
      referralFloorCoins: new Decimal("50"),
      referralCapCoins: new Decimal("1000"),
      referralWindowDays: 90,
      isRedemptionEnabled: true,
      redemptionRateCoins: new Decimal("100"),
      redemptionRateNgn: new Decimal("100"),
      minCoinsToRedeem: new Decimal("100"),
      maxDiscountPercent: new Decimal("50"),
      isBirthdayBonusEnabled: true,
      birthdayBonusCoins: new Decimal("500"),
      isStreakBonusEnabled: true,
      streakBonusCoins: new Decimal("200"),
      streakThresholdCount: 3,
      streakWindowDays: 30,
      isSignupBonusEnabled: true,
      signupBonusCoins: new Decimal("500"),
      isExpiryEnabled: true,
      expiryMonths: 12,
      dailyAdjustmentLimitCoins: new Decimal("20000"),
      holdExpiryMinutes: 15,
      updatedAt: new Date(),
      updatedBy: null,
    } as any);
  });

  describe("getWalletDTO Parity", () => {
    it("returns zero wallet without database writes when user has no coin balance record", async () => {
      vi.mocked(prisma.coinBalance.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.coinHold.findMany).mockResolvedValue([]);

      const wallet = await loyaltyRepository.getWalletDTO("user-empty");

      expect(wallet).toEqual({
        id: "user-empty",
        userId: "user-empty",
        balance: 0,
        reservedCoins: 0,
        availableBalance: 0,
        lifetimeEarned: 0,
        lifetimeSpent: 0,
        equivalentNgnValue: 0,
        coinSymbol: "PDC",
        coinName: "PD Coin",
        tier: "BRONZE",
        tierMultiplier: 1.0,
      });
    });

    it("correctly includes active holds and computes available balance", async () => {
      vi.mocked(prisma.coinBalance.findUnique).mockResolvedValue({
        userId: "user-1",
        balance: new Decimal("150.00"),
        lifetimeEarned: new Decimal("500.00"),
        lifetimeBurned: new Decimal("350.00"),
        version: 1,
        lastEarnedAt: new Date(),
        updatedAt: new Date(),
      });

      // Active unexpired hold of 50 PDC
      vi.mocked(prisma.coinHold.findMany).mockResolvedValue([
        {
          id: "hold-1",
          userId: "user-1",
          bookingId: "bk-1",
          amount: new Decimal("50.00"),
          nairaValue: new Decimal("50.00"),
          status: HoldStatus.ACTIVE,
          expiresAt: new Date(Date.now() + 600000),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const wallet = await loyaltyRepository.getWalletDTO("user-1");

      expect(wallet.balance).toBe(150);
      expect(wallet.reservedCoins).toBe(50);
      expect(wallet.availableBalance).toBe(100);
      expect(wallet.lifetimeEarned).toBe(500);
      expect(wallet.lifetimeSpent).toBe(350);
      expect(wallet.equivalentNgnValue).toBe(100);
      expect(wallet.tier).toBe("SILVER");
      expect(wallet.tierMultiplier).toBe(1.25);
    });

    it("excludes expired holds from reservedCoins", async () => {
      vi.mocked(prisma.coinBalance.findUnique).mockResolvedValue({
        userId: "user-2",
        balance: new Decimal("200.00"),
        lifetimeEarned: new Decimal("2000.00"),
        lifetimeBurned: new Decimal("1800.00"),
        version: 1,
        lastEarnedAt: new Date(),
        updatedAt: new Date(),
      });

      // Prisma query for holds filters `expiresAt: { gt: new Date() }`, so DB returns empty list for expired holds
      vi.mocked(prisma.coinHold.findMany).mockResolvedValue([]);

      const wallet = await loyaltyRepository.getWalletDTO("user-2");

      expect(wallet.balance).toBe(200);
      expect(wallet.reservedCoins).toBe(0);
      expect(wallet.availableBalance).toBe(200);
      expect(wallet.tier).toBe("GOLD"); // >= 1000 lifetime earned
      expect(wallet.tierMultiplier).toBe(1.5);
    });
  });

  describe("getLedger Customer View & Privacy", () => {
    it("sanitizes customer metadata and excludes 0-amount shortfall entries", async () => {
      const entries = [
        {
          id: "entry-1",
          userId: "user-1",
          action: CoinLedgerAction.BOOKING_EARN,
          amount: new Decimal("15.00"),
          balanceAfter: new Decimal("15.00"),
          referenceType: "BOOKING",
          referenceId: "BK-100",
          idempotencyKey: "earn_1",
          metadata: {
            description: "Earned 15 PDC for Booking",
            bookingReference: "DAIH-BK-001",
            internalSecretFlag: "SHOULD_NOT_LEAK",
            legacy: { rawDump: true },
          },
          createdAt: new Date("2026-09-20T10:00:00Z"),
        },
      ];

      vi.mocked(prisma.coinLedgerEntry.count).mockResolvedValue(1);
      vi.mocked(prisma.coinLedgerEntry.findMany).mockResolvedValue(
        entries as any,
      );

      const res = await loyaltyRepository.getLedger("user-1", {
        page: 1,
        limit: 10,
      });

      expect(res.total).toBe(1);
      expect(res.items).toHaveLength(1);
      const item = res.items[0];

      // Exact DTO shape
      expect(item.id).toBe("entry-1");
      expect(item.walletId).toBe("user-1");
      expect(item.userId).toBe("user-1");
      expect(item.amount).toBe(15);
      expect(item.balanceAfter).toBe(15);
      expect(item.type).toBe("TRANSACTION_REWARD");
      expect(item.referenceId).toBe("BK-100");

      // Privacy: verify sensitive keys are stripped, allowed keys preserved
      expect(item.metadata).toEqual({
        description: "Earned 15 PDC for Booking",
        bookingReference: "DAIH-BK-001",
      });
      expect(item.metadata?.internalSecretFlag).toBeUndefined();
      expect(item.metadata?.legacy).toBeUndefined();

      // Verify DB query applied amount != 0 and stable ordering
      expect(prisma.coinLedgerEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: "user-1",
            amount: { not: 0 },
          }),
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        }),
      );
    });
  });

  describe("getAdminGlobalLedger Support & Audit View", () => {
    it("includes 0-amount shortfall clawback entries with user details", async () => {
      const adminEntries = [
        {
          id: "clawback-0",
          userId: "user-2",
          action: CoinLedgerAction.REFUND_CLAWBACK,
          amount: new Decimal("0.00"),
          balanceAfter: new Decimal("0.00"),
          referenceType: "BOOKING",
          referenceId: "BK-REFUND-001",
          idempotencyKey: "clawback_001",
          metadata: {
            requestedAmount: "15.00",
            shortfall: "15.00",
            reason: "BOOKING_REFUND",
          },
          createdAt: new Date("2026-09-22T14:00:00Z"),
          user: {
            firstName: "Peter",
            lastName: "Ajao",
            email: "peter@daih.ng",
            clientId: "DAIH-2026-000002",
          },
        },
      ];

      vi.mocked(prisma.coinLedgerEntry.count).mockResolvedValue(1);
      vi.mocked(prisma.coinLedgerEntry.findMany).mockResolvedValue(
        adminEntries as any,
      );

      const res = await loyaltyRepository.getAdminGlobalLedger({
        page: 1,
        limit: 10,
      });

      expect(res.total).toBe(1);
      const item = res.items[0];
      expect(item.id).toBe("clawback-0");
      expect(item.amount).toBe(0);
      expect(item.type).toBe("REFUND_CLAWBACK");
      expect(item.userName).toBe("Peter Ajao");
      expect(item.userEmail).toBe("peter@daih.ng");
      expect(item.userClientId).toBe("DAIH-2026-000002");
      expect(item.metadata?.shortfall).toBe("15.00");
      expect(item.metadata?.requestedAmount).toBe("15.00");
    });
  });

  describe("getAdminStats Parity", () => {
    it("accurately aggregates across coin balances and counts ledger entries", async () => {
      vi.mocked(prisma.coinBalance.aggregate).mockResolvedValue({
        _sum: {
          balance: new Decimal("12500.50"),
          lifetimeEarned: new Decimal("45000.00"),
          lifetimeBurned: new Decimal("32499.50"),
        },
      } as any);

      vi.mocked(prisma.coinBalance.count).mockResolvedValue(42);
      vi.mocked(prisma.coinLedgerEntry.count).mockResolvedValue(187);

      const stats = await loyaltyRepository.getAdminStats();

      expect(stats.totalCirculationCoins).toBe(12500.5);
      expect(stats.totalCirculationNgn).toBe(12500.5);
      expect(stats.lifetimeCoinsEarned).toBe(45000);
      expect(stats.lifetimeCoinsRedeemed).toBe(32499.5);
      expect(stats.activeEarnersCount).toBe(42);
      expect(stats.totalTransactionsCount).toBe(187);
      expect(stats.redemptionRateNgnPerCoin).toBe(1);
    });
  });
});
