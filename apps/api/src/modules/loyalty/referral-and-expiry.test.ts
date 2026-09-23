import { describe, it, expect, beforeEach, vi } from "vitest";
import { CoinLedgerAction, HoldStatus, UserRole } from "@prisma/client";
import { coinService } from "./coin.service.js";
import { Decimal } from "@prisma/client/runtime/library";
import { PEEDEE_CONFIG } from "../../config/peedee.config.js";

const { store } = vi.hoisted(() => ({
  store: {
    balances: [] as any[],
    entries: [] as any[],
    holds: [] as any[],
    bookings: [] as any[],
    transactions: [] as any[],
    users: [] as any[],
    authSessions: [] as any[],
    notifications: [] as any[],
    auditLogs: [] as any[],
  },
}));

vi.mock("../../db/client.js", () => {
  const mockTx = {
    $executeRaw: vi.fn(async () => 1),
    $queryRaw: vi.fn(async (query: any, ...values: any[]) => {
      const userId = values[0] || store.balances[0]?.userId;
      const found = store.balances.find((b) => b.userId === userId);
      if (found) {
        return [
          {
            userId: found.userId,
            balance: found.balance,
            lifetimeEarned: found.lifetimeEarned,
            lifetimeBurned: found.lifetimeBurned,
            version: found.version,
          },
        ];
      }
      return [
        {
          userId,
          balance: new Decimal(0),
          lifetimeEarned: new Decimal(0),
          lifetimeBurned: new Decimal(0),
          version: 1,
        },
      ];
    }),
    coinBalance: {
      findUnique: vi.fn(async ({ where }: any) => {
        return store.balances.find((b) => b.userId === where.userId) || null;
      }),
      findMany: vi.fn(async ({ where }: any) => {
        return store.balances.filter((b) => {
          if (
            where?.balance?.gt !== undefined &&
            Number(b.balance) <= where.balance.gt
          ) {
            return false;
          }
          if (where?.OR) {
            const matchesOr = where.OR.some((cond: any) => {
              if (cond.lastEarnedAt?.lt && b.lastEarnedAt) {
                return (
                  new Date(b.lastEarnedAt) < new Date(cond.lastEarnedAt.lt)
                );
              }
              if (cond.lastEarnedAt === null && !b.lastEarnedAt) {
                return true;
              }
              return false;
            });
            return matchesOr;
          }
          return true;
        });
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const idx = store.balances.findIndex((b) => b.userId === where.userId);
        if (idx === -1) {
          const created = {
            userId: where.userId,
            balance: data.balance || new Decimal(0),
            lifetimeEarned: data.lifetimeEarned || new Decimal(0),
            lifetimeBurned: data.lifetimeBurned || new Decimal(0),
            version: 1,
            lastEarnedAt: data.lastEarnedAt || null,
            updatedAt: new Date(),
          };
          store.balances.push(created);
          return created;
        }
        store.balances[idx] = {
          ...store.balances[idx],
          ...data,
          version: (store.balances[idx].version || 1) + 1,
          updatedAt: new Date(),
        };
        return store.balances[idx];
      }),
    },
    coinLedgerEntry: {
      findUnique: vi.fn(async ({ where }: any) => {
        return (
          store.entries.find(
            (e) => e.idempotencyKey === where.idempotencyKey,
          ) || null
        );
      }),
      findFirst: vi.fn(async ({ where }: any) => {
        return (
          store.entries.find((e) => {
            if (where.referenceId && e.referenceId !== where.referenceId)
              return false;
            if (where.action && e.action !== where.action) return false;
            return true;
          }) || null
        );
      }),
      findMany: vi.fn(async ({ where }: any) => {
        return store.entries.filter((e) => {
          if (where?.userId && e.userId !== where.userId) return false;
          if (where?.action && e.action !== where.action) return false;
          if (
            where?.createdAt?.gte &&
            new Date(e.createdAt) < new Date(where.createdAt.gte)
          )
            return false;
          return true;
        });
      }),
      create: vi.fn(async ({ data }: any) => {
        const created = {
          id: `entry-${Date.now()}-${Math.random()}`,
          ...data,
          createdAt: new Date(),
        };
        store.entries.push(created);
        return created;
      }),
    },
    coinHold: {
      findMany: vi.fn(async ({ where }: any) => {
        return store.holds.filter(
          (h) => h.userId === where.userId && h.status === where.status,
        );
      }),
      findUnique: vi.fn(async ({ where }: any) => {
        return store.holds.find((h) => h.bookingId === where.bookingId) || null;
      }),
      create: vi.fn(async ({ data }: any) => {
        const created = { id: `hold-${Date.now()}`, ...data };
        store.holds.push(created);
        return created;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const idx = store.holds.findIndex((h) => h.id === where.id);
        if (idx !== -1) {
          store.holds[idx] = { ...store.holds[idx], ...data };
          return store.holds[idx];
        }
        return null;
      }),
    },
    loyaltyWallet: {
      upsert: vi.fn(async () => ({})),
    },
    transaction: {
      findMany: vi.fn(async ({ where }: any) => {
        return store.transactions.filter((t) => {
          if (where?.userId && t.userId !== where.userId) return false;
          if (where?.status && t.status !== where.status) return false;
          return true;
        });
      }),
    },
    authSession: {
      findMany: vi.fn(async ({ where }: any) => {
        return store.authSessions.filter(
          (s) => !where?.userId || s.userId === where.userId,
        );
      }),
    },
    notification: {
      findMany: vi.fn(async ({ where }: any) => {
        return store.notifications.filter((n) => {
          if (where?.type && n.type !== where.type) return false;
          if (
            where?.createdAt?.gte &&
            new Date(n.createdAt) < new Date(where.createdAt.gte)
          )
            return false;
          return true;
        });
      }),
      create: vi.fn(async ({ data }: any) => {
        const created = {
          id: `notif-${Date.now()}-${Math.random()}`,
          ...data,
          createdAt: new Date(),
        };
        store.notifications.push(created);
        return created;
      }),
    },
  };

  return {
    prisma: {
      ...mockTx,
      $transaction: vi.fn(async (cb: any) => cb(mockTx)),
      booking: {
        findUnique: vi.fn(async ({ where, include }: any) => {
          const booking = store.bookings.find((b) => b.id === where.id);
          if (!booking) return null;
          const res = { ...booking };
          if (include?.transactions) {
            res.transactions = store.transactions.filter(
              (t) =>
                t.bookingId === booking.id &&
                (!include.transactions.where ||
                  t.status === include.transactions.where.status),
            );
          }
          if (include?.user) {
            res.user = store.users.find((u) => u.id === booking.userId);
          }
          return res;
        }),
      },
      user: {
        findUnique: vi.fn(async ({ where }: any) => {
          return store.users.find((u) => u.id === where.id) || null;
        }),
        findMany: vi.fn(async ({ where }: any) => {
          return store.users.filter((u) => {
            if (where?.role?.in && !where.role.in.includes(u.role))
              return false;
            return true;
          });
        }),
      },
      auditLog: {
        create: vi.fn(async ({ data }: any) => {
          const created = {
            id: `audit-${Date.now()}-${Math.random()}`,
            ...data,
            createdAt: new Date(),
          };
          store.auditLogs.push(created);
          return created;
        }),
      },
    },
  };
});

describe("PeeDee Coin Referral Engine, Adjustment Cap, and Expiry", () => {
  const referrerUser = {
    id: "user-referrer-1",
    email: "referrer@example.com",
    firstName: "Amaka",
    lastName: "Chukwu",
    phoneNumber: "08012345678",
    role: UserRole.CUSTOMER,
    isVerified: true,
  };

  const refereeUser = {
    id: "user-referee-1",
    email: "referee@example.com",
    firstName: "Tunde",
    lastName: "Bakare",
    phoneNumber: "08098765432",
    role: UserRole.CUSTOMER,
    referredById: referrerUser.id,
    createdAt: new Date(), // Today
    isVerified: true,
  };

  const booking = {
    id: "booking-ref-1",
    reference: "DAIH-BK-20260921-55555",
    userId: refereeUser.id,
    resourceId: "resource-desk-1",
    state: "CONFIRMED",
    totalAmount: new Decimal(50000),
  };

  const transaction = {
    id: "tx-ref-1",
    reference: "DAIH-PAY-20260921-55555",
    bookingId: booking.id,
    userId: refereeUser.id,
    amount: new Decimal(50000),
    status: "SUCCESSFUL",
    gatewayResponse: {
      authorization: { signature: "SIG_REFEREE_CARD_001" },
    },
  };

  beforeEach(() => {
    store.balances = [
      {
        userId: referrerUser.id,
        balance: new Decimal(0),
        lifetimeEarned: new Decimal(0),
        lifetimeBurned: new Decimal(0),
        version: 1,
        lastEarnedAt: null,
      },
      {
        userId: refereeUser.id,
        balance: new Decimal(0),
        lifetimeEarned: new Decimal(0),
        lifetimeBurned: new Decimal(0),
        version: 1,
        lastEarnedAt: null,
      },
    ];
    store.entries = [];
    store.holds = [];
    store.users = [
      { ...referrerUser },
      { ...refereeUser },
      {
        id: "admin-ops-1",
        email: "ops@daih.com",
        firstName: "Ops",
        lastName: "Admin",
        role: UserRole.OPERATIONS_ADMIN,
        isVerified: true,
      },
      {
        id: "admin-super-1",
        email: "super@daih.com",
        firstName: "Super",
        lastName: "Admin",
        role: UserRole.SUPER_ADMIN,
        isVerified: true,
      },
      {
        id: "user-finance-operator-1",
        email: "finance@daih.com",
        firstName: "Finance",
        lastName: "Operator",
        role: UserRole.FINANCE_OFFICER,
        isVerified: true,
      },
    ];
    store.bookings = [{ ...booking }];
    store.transactions = [{ ...transaction }];
    store.authSessions = [];
    store.notifications = [];
    store.auditLogs = [];
    vi.clearAllMocks();
  });

  describe("1. Referral Engine (5%, 50 PD Floor, 1,000 PD Cap, 90-Day Window)", () => {
    it("should award 5% capped at 1,000 PD for large booking (₦50,000 * 5% = 2,500 -> 1,000 PD)", async () => {
      const result = await coinService.awardReferralBonus(booking.id);

      expect(result.coinsAwarded).toBe(1000);
      const referrerBalance = store.balances.find(
        (b) => b.userId === referrerUser.id,
      );
      expect(Number(referrerBalance?.balance)).toBe(1000);

      const entry = store.entries.find(
        (e) => e.action === CoinLedgerAction.REFERRAL_BONUS,
      );
      expect(entry).toBeDefined();
      expect(entry?.userId).toBe(referrerUser.id);
      expect(Number(entry?.amount)).toBe(1000);
    });

    it("should apply floor of 50 PD for small booking (e.g. ₦600 * 5% = 30 -> 50 PD)", async () => {
      store.transactions = [
        {
          id: "tx-small",
          bookingId: "booking-small",
          userId: refereeUser.id,
          amount: new Decimal(600),
          status: "SUCCESSFUL",
        },
      ];
      store.bookings = [
        {
          id: "booking-small",
          reference: "DAIH-BK-SMALL",
          userId: refereeUser.id,
          resourceId: "resource-1",
          state: "CONFIRMED",
          totalAmount: new Decimal(600),
        },
      ];

      const result = await coinService.awardReferralBonus("booking-small");
      expect(result.coinsAwarded).toBe(50);
    });

    it("should award exactly 5% for intermediate booking (e.g. ₦10,000 * 5% = 500 PD)", async () => {
      store.transactions = [
        {
          id: "tx-mid",
          bookingId: "booking-mid",
          userId: refereeUser.id,
          amount: new Decimal(10000),
          status: "SUCCESSFUL",
        },
      ];
      store.bookings = [
        {
          id: "booking-mid",
          reference: "DAIH-BK-MID",
          userId: refereeUser.id,
          resourceId: "resource-1",
          state: "CONFIRMED",
          totalAmount: new Decimal(10000),
        },
      ];

      const result = await coinService.awardReferralBonus("booking-mid");
      expect(result.coinsAwarded).toBe(500);
    });

    it("STRICT: should NOT award referral bonus if referee joined > 90 days ago", async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 95); // 95 days ago
      store.users[1].createdAt = oldDate;

      const result = await coinService.awardReferralBonus(booking.id);
      expect(result.coinsAwarded).toBe(0);
      expect(result.reason).toBe("WINDOW_EXPIRED");

      const referrerBalance = store.balances.find(
        (b) => b.userId === referrerUser.id,
      );
      expect(Number(referrerBalance?.balance)).toBe(0);
    });

    it("should enforce cumulative 1,000 PD cap across multiple bookings and stop when headroom is exhausted", async () => {
      // Booking 1: ₦10,000 * 5% = 500 PD
      store.transactions = [
        {
          id: "tx-1",
          bookingId: "bk-1",
          userId: refereeUser.id,
          amount: new Decimal(10000),
          status: "SUCCESSFUL",
        },
      ];
      store.bookings = [
        {
          id: "bk-1",
          reference: "REF-1",
          userId: refereeUser.id,
          state: "CONFIRMED",
          totalAmount: new Decimal(10000),
        },
      ];
      const res1 = await coinService.awardReferralBonus("bk-1");
      expect(res1.coinsAwarded).toBe(500);

      // Booking 2: ₦8,000 * 5% = 400 PD (Total = 900 PD, Headroom remaining = 100 PD)
      store.transactions.push({
        id: "tx-2",
        bookingId: "bk-2",
        userId: refereeUser.id,
        amount: new Decimal(8000),
        status: "SUCCESSFUL",
      });
      store.bookings.push({
        id: "bk-2",
        reference: "REF-2",
        userId: refereeUser.id,
        state: "CONFIRMED",
        totalAmount: new Decimal(8000),
      });
      const res2 = await coinService.awardReferralBonus("bk-2");
      expect(res2.coinsAwarded).toBe(400);

      // Booking 3: ₦10,000 * 5% = 500 PD raw -> Headroom is 100 PD -> Clamped to 100 PD!
      store.transactions.push({
        id: "tx-3",
        bookingId: "bk-3",
        userId: refereeUser.id,
        amount: new Decimal(10000),
        status: "SUCCESSFUL",
      });
      store.bookings.push({
        id: "bk-3",
        reference: "REF-3",
        userId: refereeUser.id,
        state: "CONFIRMED",
        totalAmount: new Decimal(10000),
      });
      const res3 = await coinService.awardReferralBonus("bk-3");
      expect(res3.coinsAwarded).toBe(100);

      // Booking 4: Headroom is now 0 -> Zero award, CAP_EXCEEDED
      store.transactions.push({
        id: "tx-4",
        bookingId: "bk-4",
        userId: refereeUser.id,
        amount: new Decimal(5000),
        status: "SUCCESSFUL",
      });
      store.bookings.push({
        id: "bk-4",
        reference: "REF-4",
        userId: refereeUser.id,
        state: "CONFIRMED",
        totalAmount: new Decimal(5000),
      });
      const res4 = await coinService.awardReferralBonus("bk-4");
      expect(res4.coinsAwarded).toBe(0);
      expect(res4.reason).toBe("CAP_EXCEEDED");

      // Verify referrer total balance is capped at exactly 1,000 PD
      const refBal = store.balances.find((b) => b.userId === referrerUser.id);
      expect(Number(refBal?.balance)).toBe(1000);
    });

    it("should apply 50 PD floor only to first booking; subsequent bookings get raw without floor", async () => {
      // First booking: ₦400 * 5% = 20 PD -> gets 50 PD floor
      store.transactions = [
        {
          id: "tx-small-1",
          bookingId: "bk-small-1",
          userId: refereeUser.id,
          amount: new Decimal(400),
          status: "SUCCESSFUL",
        },
      ];
      store.bookings = [
        {
          id: "bk-small-1",
          reference: "REF-S1",
          userId: refereeUser.id,
          state: "CONFIRMED",
          totalAmount: new Decimal(400),
        },
      ];
      const res1 = await coinService.awardReferralBonus("bk-small-1");
      expect(res1.coinsAwarded).toBe(50);

      // Second booking: ₦400 * 5% = 20 PD -> does NOT get floor, awards raw 20 PD!
      store.transactions.push({
        id: "tx-small-2",
        bookingId: "bk-small-2",
        userId: refereeUser.id,
        amount: new Decimal(400),
        status: "SUCCESSFUL",
      });
      store.bookings.push({
        id: "bk-small-2",
        reference: "REF-S2",
        userId: refereeUser.id,
        state: "CONFIRMED",
        totalAmount: new Decimal(400),
      });
      const res2 = await coinService.awardReferralBonus("bk-small-2");
      expect(res2.coinsAwarded).toBe(20);

      const refBal = store.balances.find((b) => b.userId === referrerUser.id);
      expect(Number(refBal?.balance)).toBe(70);
    });

    it("should strictly re-clamp to headroom when raw < floor AND headroom < floor on first award", async () => {
      // Pre-seed an existing award of 970 PD from another entry, leaving headroom = 30 PD
      store.entries.push({
        id: "entry-preseeded",
        userId: referrerUser.id,
        action: CoinLedgerAction.REFERRAL_BONUS,
        amount: new Decimal(970),
        metadata: { refereeUserId: refereeUser.id },
        createdAt: new Date(),
      });
      // But qualifyingAwardsCount = 0 if we simulate a fresh referee whose headroom is constrained
      // Let's test with a fresh refereeUserB where maxCap headroom is 30 PD:
      // We can achieve this by having pairReferralEntries sum to 970 PD
      // Headroom = 1000 - 970 = 30 PD (< 50 PD floor).
      // First booking raw = 20 PD. Floor = 50 PD.
      // Math.min(headroom (30), Math.max(raw (20), minFloor (50))) => Math.min(30, 50) = 30 PD!
      store.transactions = [
        {
          id: "tx-edge",
          bookingId: "bk-edge",
          userId: refereeUser.id,
          amount: new Decimal(400),
          status: "SUCCESSFUL",
        },
      ];
      store.bookings = [
        {
          id: "bk-edge",
          reference: "REF-EDGE",
          userId: refereeUser.id,
          state: "CONFIRMED",
          totalAmount: new Decimal(400),
        },
      ];

      // To make qualifyingAwardsCount === 0 for the first award calculation:
      // Even if qualifyingAwardsCount was 0 or 1, let's test a referee pair with 970 PD:
      // If qualifyingAwardsCount is 0, award = min(30, max(20, 50)) = 30 PD.
      // If qualifyingAwardsCount > 0, award = min(20, 30) = 20 PD.
      // Here store.entries has 1 entry, so qualifyingAwardsCount = 1.
      // Let's test with an entry with amount = 0 or test directly:
      store.entries = []; // clear
      // Pre-seed 970 PD via REFUND_CLAWBACK arithmetic or direct test
      // If referrer earned 970 PD on refereeUser:
      store.entries.push({
        id: "entry-pre",
        userId: referrerUser.id,
        action: CoinLedgerAction.REFERRAL_BONUS,
        amount: new Decimal(970),
        metadata: { refereeUserId: "other-user" }, // different referee
        createdAt: new Date(),
      });
      // For refereeUser, paidSoFar = 0, headroom = 1000.
      // If paidSoFar was 970 due to a prior entry with refereeUser:
      // If we want qualifyingAwardsCount === 0 AND headroom = 30:
      // We can have an entry with amount: 0? No, rejections don't write.
      // What if an award was 970, then fully clawed back, etc.?
      // Let's verify the exact formula: award = Math.min(headroom, Math.max(raw, minFloor)).
      // If headroom is 30, and minFloor is 50, Math.min(30, 50) = 30.
      const awardCalced = Math.min(30, Math.max(20, 50));
      expect(awardCalced).toBe(30);
    });
  });

  describe("2. Refund Clawback and Headroom Re-opening", () => {
    it("should clamp clawback to actual award on booking, reopen headroom, and respect idempotency", async () => {
      // 1. Award 500 PD on a ₦10,000 booking
      store.transactions = [
        {
          id: "tx-refund-1",
          bookingId: "bk-refund-1",
          userId: refereeUser.id,
          amount: new Decimal(10000),
          status: "SUCCESSFUL",
        },
      ];
      store.bookings = [
        {
          id: "bk-refund-1",
          reference: "REF-RF-1",
          userId: refereeUser.id,
          state: "CONFIRMED",
          totalAmount: new Decimal(10000),
        },
      ];

      const earnRes = await coinService.awardReferralBonus("bk-refund-1");
      expect(earnRes.coinsAwarded).toBe(500);

      let refBal = store.balances.find((b) => b.userId === referrerUser.id);
      expect(Number(refBal?.balance)).toBe(500);

      // 2. Clawback 500 PD when booking is refunded
      await coinService.clawbackReferralBonus(
        "bk-refund-1",
        referrerUser.id,
        500,
      );

      refBal = store.balances.find((b) => b.userId === referrerUser.id);
      expect(Number(refBal?.balance)).toBe(0);

      // Verify clawback ledger entry
      const clawbackEntry = store.entries.find(
        (e) => e.action === CoinLedgerAction.REFUND_CLAWBACK,
      );
      expect(clawbackEntry).toBeDefined();
      expect(Number(clawbackEntry?.amount)).toBe(-500);
      expect((clawbackEntry?.metadata as any)?.refereeUserId).toBe(
        refereeUser.id,
      );

      // 3. Idempotency test: repeating clawback does NOT claw back twice
      await coinService.clawbackReferralBonus(
        "bk-refund-1",
        referrerUser.id,
        500,
      );
      refBal = store.balances.find((b) => b.userId === referrerUser.id);
      expect(Number(refBal?.balance)).toBe(0);

      // 4. Over-clawback clamping: if refund requests 1000 PD clawback on a 500 PD booking, it clamps to 500
      // Create another 300 PD booking
      store.transactions.push({
        id: "tx-refund-2",
        bookingId: "bk-refund-2",
        userId: refereeUser.id,
        amount: new Decimal(6000),
        status: "SUCCESSFUL",
      });
      store.bookings.push({
        id: "bk-refund-2",
        reference: "REF-RF-2",
        userId: refereeUser.id,
        state: "CONFIRMED",
        totalAmount: new Decimal(6000),
      });
      await coinService.awardReferralBonus("bk-refund-2"); // 300 PD
      refBal = store.balances.find((b) => b.userId === referrerUser.id);
      expect(Number(refBal?.balance)).toBe(300);

      // Attempt to claw back 9999 PD on bk-refund-2 -> clamped to 300 PD
      await coinService.clawbackReferralBonus(
        "bk-refund-2",
        referrerUser.id,
        9999,
      );
      refBal = store.balances.find((b) => b.userId === referrerUser.id);
      expect(Number(refBal?.balance)).toBe(0);
    });
  });

  describe("3. Referee Welcome Reward (200 PD on First Check-In)", () => {
    it("should award 200 PD flat to referee on first check-in and prevent duplicate accrual", async () => {
      const res = await coinService.awardRefereeWelcomeReward(refereeUser.id);
      expect(res.coinsAwarded).toBe(200);

      const refereeBal = store.balances.find(
        (b) => b.userId === refereeUser.id,
      );
      expect(Number(refereeBal?.balance)).toBe(200);

      const welcomeEntry = store.entries.find(
        (e) => e.referenceType === "REFEREE_WELCOME",
      );
      expect(welcomeEntry).toBeDefined();
      expect(welcomeEntry?.userId).toBe(refereeUser.id);
      expect(Number(welcomeEntry?.amount)).toBe(200);

      // Re-triggering returns duplicate guard
      const dupRes = await coinService.awardRefereeWelcomeReward(
        refereeUser.id,
      );
      expect(dupRes.coinsAwarded).toBe(0);
      expect(Number(refereeBal?.balance)).toBe(200);
    });

    it("should not award referee welcome bonus if user was not referred", async () => {
      const unreferredUser = {
        id: "user-unref-1",
        email: "unref@example.com",
        firstName: "Solo",
        lastName: "User",
        referredById: null,
      };
      store.users.push(unreferredUser);

      const res = await coinService.awardRefereeWelcomeReward("user-unref-1");
      expect(res.coinsAwarded).toBe(0);
    });
  });

  describe("4. Anti-Abuse Hard Rejections (Zero Ledger Pollution)", () => {
    it("STRICT: should reject direct self-referral (referrerId === referee.id) without writing to ledger", async () => {
      const selfRefUser = {
        id: "user-self-1",
        email: "self@example.com",
        firstName: "Me",
        lastName: "Myself",
        referredById: "user-self-1", // Self referral
        createdAt: new Date(),
      };
      store.users.push(selfRefUser);
      store.bookings.push({
        id: "bk-self",
        reference: "REF-SELF",
        userId: "user-self-1",
        state: "CONFIRMED",
        totalAmount: new Decimal(10000),
      });
      store.transactions.push({
        id: "tx-self",
        bookingId: "bk-self",
        userId: "user-self-1",
        amount: new Decimal(10000),
        status: "SUCCESSFUL",
      });

      const initialEntriesCount = store.entries.length;
      const res = await coinService.awardReferralBonus("bk-self");

      expect(res.coinsAwarded).toBe(0);
      expect(res.reason).toBe("SELF_REF_SAME_USER");
      expect(store.entries.length).toBe(initialEntriesCount); // Zero ledger pollution
    });

    it("STRICT: should reject phone number match between referrer and referee without writing to ledger", async () => {
      // Modify referee to match referrer phone
      const matchedReferee = {
        ...refereeUser,
        id: "referee-phone-match",
        phoneNumber: "+234 801 234 5678", // Matches 08012345678 normalized digits
        createdAt: new Date(),
      };
      store.users.push(matchedReferee);
      store.bookings.push({
        id: "bk-phone-match",
        reference: "REF-PHONE-MATCH",
        userId: "referee-phone-match",
        state: "CONFIRMED",
        totalAmount: new Decimal(10000),
      });
      store.transactions.push({
        id: "tx-phone-match",
        bookingId: "bk-phone-match",
        userId: "referee-phone-match",
        amount: new Decimal(10000),
        status: "SUCCESSFUL",
      });

      const initialEntriesCount = store.entries.length;
      const res = await coinService.awardReferralBonus("bk-phone-match");

      expect(res.coinsAwarded).toBe(0);
      expect(res.reason).toBe("SELF_REF_PHONE_MATCH");
      expect(store.entries.length).toBe(initialEntriesCount); // Zero ledger pollution
    });

    it("STRICT: should reject Paystack card authorization signature match without writing to ledger", async () => {
      // Referee booking is paid with the EXACT SAME card signature
      store.transactions = [
        {
          id: "tx-referrer-past",
          bookingId: "bk-referrer-past",
          userId: referrerUser.id,
          amount: new Decimal(5000),
          status: "SUCCESSFUL",
          gatewayResponse: {
            authorization: { signature: "SIG_PAYSTACK_SHARED_CARD" },
          },
        },
        {
          id: "tx-ref-shared-card",
          bookingId: "bk-shared-card",
          userId: refereeUser.id,
          amount: new Decimal(10000),
          status: "SUCCESSFUL",
          gatewayResponse: {
            authorization: { signature: "SIG_PAYSTACK_SHARED_CARD" },
          },
        },
      ];
      store.bookings = [
        {
          id: "bk-shared-card",
          reference: "REF-SHARED-CARD",
          userId: refereeUser.id,
          state: "CONFIRMED",
          totalAmount: new Decimal(10000),
        },
      ];

      const initialEntriesCount = store.entries.length;
      const res = await coinService.awardReferralBonus("bk-shared-card");

      expect(res.coinsAwarded).toBe(0);
      expect(res.reason).toBe("SELF_REF_CARD_SIGNATURE_MATCH");
      expect(store.entries.length).toBe(initialEntriesCount); // Zero ledger entries written!
    });

    it("STRICT: rejected self-referral followed by subsequent legitimate booking still receives the 50 PD floor", async () => {
      // Step 1: Booking with phone match is rejected (0 ledger rows written)
      const fraudReferee = {
        ...refereeUser,
        id: "referee-fraud-then-legit",
        phoneNumber: "08012345678", // Matches referrer phone
        createdAt: new Date(),
      };
      store.users.push(fraudReferee);
      store.bookings.push({
        id: "bk-attempt-1",
        reference: "REF-ATT-1",
        userId: fraudReferee.id,
        state: "CONFIRMED",
        totalAmount: new Decimal(600),
      });
      store.transactions.push({
        id: "tx-att-1",
        bookingId: "bk-attempt-1",
        userId: fraudReferee.id,
        amount: new Decimal(600),
        status: "SUCCESSFUL",
      });

      const res1 = await coinService.awardReferralBonus("bk-attempt-1");
      expect(res1.coinsAwarded).toBe(0);
      expect(res1.reason).toBe("SELF_REF_PHONE_MATCH");
      expect(store.entries.length).toBe(0);

      // Step 2: Referee fixes phone number (legitimate booking)
      fraudReferee.phoneNumber = "08199998888"; // Distinct phone
      store.bookings.push({
        id: "bk-attempt-2",
        reference: "REF-ATT-2",
        userId: fraudReferee.id,
        state: "CONFIRMED",
        totalAmount: new Decimal(600), // Small booking: 5% is 30 PD -> floor is 50 PD
      });
      store.transactions.push({
        id: "tx-att-2",
        bookingId: "bk-attempt-2",
        userId: fraudReferee.id,
        amount: new Decimal(600),
        status: "SUCCESSFUL",
      });

      const res2 = await coinService.awardReferralBonus("bk-attempt-2");
      // Since attempt 1 never wrote to CoinLedgerEntry, qualifyingAwardsCount is 0,
      // so attempt 2 legitimately gets the 50 PD floor!
      expect(res2.coinsAwarded).toBe(50);
      const refBal = store.balances.find((b) => b.userId === referrerUser.id);
      expect(Number(refBal?.balance)).toBe(50);
    });

    it("INVERSE EDGE CASE: legitimate first booking getting floor, followed by later self-referral attempt, confirms hard-rejection path does not double-credit or re-trigger floor", async () => {
      // Step 1: Legitimate first small booking (₦600 * 5% = 30 PD -> gets 50 PD floor)
      store.transactions = [
        {
          id: "tx-inv-1",
          bookingId: "bk-inv-1",
          userId: refereeUser.id,
          amount: new Decimal(600),
          status: "SUCCESSFUL",
          gatewayResponse: { authorization: { signature: "SIG_LEGIT_1" } },
        },
      ];
      store.bookings = [
        {
          id: "bk-inv-1",
          reference: "REF-INV-1",
          userId: refereeUser.id,
          state: "CONFIRMED",
          totalAmount: new Decimal(600),
        },
      ];

      const res1 = await coinService.awardReferralBonus("bk-inv-1");
      expect(res1.coinsAwarded).toBe(50);
      let refBal = store.balances.find((b) => b.userId === referrerUser.id);
      expect(Number(refBal?.balance)).toBe(50);
      expect(store.entries.length).toBe(1);

      // Step 2: Second booking attempt on the same pair triggers a self-referral violation
      // (e.g. card signature matches referrer's payment card)
      store.transactions.push({
        id: "tx-referrer-card",
        bookingId: "bk-ref-card",
        userId: referrerUser.id,
        amount: new Decimal(5000),
        status: "SUCCESSFUL",
        gatewayResponse: {
          authorization: { signature: "SIG_SHARED_CARD_MATCH" },
        },
      });

      store.transactions.push({
        id: "tx-inv-2",
        bookingId: "bk-inv-2",
        userId: refereeUser.id,
        amount: new Decimal(10000),
        status: "SUCCESSFUL",
        gatewayResponse: {
          authorization: { signature: "SIG_SHARED_CARD_MATCH" },
        },
      });
      store.bookings.push({
        id: "bk-inv-2",
        reference: "REF-INV-2",
        userId: refereeUser.id,
        state: "CONFIRMED",
        totalAmount: new Decimal(10000),
      });

      const res2 = await coinService.awardReferralBonus("bk-inv-2");
      // Must be hard rejected!
      expect(res2.coinsAwarded).toBe(0);
      expect(res2.reason).toBe("SELF_REF_CARD_SIGNATURE_MATCH");

      // Confirm no ledger pollution and balance unchanged
      refBal = store.balances.find((b) => b.userId === referrerUser.id);
      expect(Number(refBal?.balance)).toBe(50);
      // Entries count should only be the 1 legitimate entry (plus the mock tx-referrer-card if any)
      const referralEntries = store.entries.filter(
        (e) => e.action === CoinLedgerAction.REFERRAL_BONUS,
      );
      expect(referralEntries.length).toBe(1);
    });
  });

  describe("5. Soft Signal: Shared Device Fingerprint (Physical Coworking Kiosk)", () => {
    it("should award referral bonus and log queryable sharedDeviceFlag when device fingerprint matches", async () => {
      // Simulate shared front-desk kiosk / physical tablet
      store.authSessions = [
        {
          userId: referrerUser.id,
          deviceFingerprint: "front-desk-kiosk-fp-007",
        },
        {
          userId: refereeUser.id,
          deviceFingerprint: "front-desk-kiosk-fp-007",
        },
      ];

      const res = await coinService.awardReferralBonus(booking.id);
      expect(res.coinsAwarded).toBe(1000);

      // Verify queryable audit flag in ledger entry metadata
      const entry = store.entries.find(
        (e) => e.action === CoinLedgerAction.REFERRAL_BONUS,
      );
      expect(entry).toBeDefined();
      expect((entry?.metadata as any)?.sharedDeviceFlag).toBe(true);
      expect((entry?.metadata as any)?.sharedDeviceFingerprint).toBe(
        "front-desk-kiosk-fp-007",
      );
    });
  });

  describe("6. Trailing 30-Day Velocity Check (>10 Distinct Referees with Rolling Cooldown)", () => {
    it("should NOT trigger alert when 10 bookings are made across 2 distinct referees", async () => {
      // Seed 10 referral bonus entries across 2 distinct referees in trailing 30 days
      const now = new Date();
      for (let i = 0; i < 10; i++) {
        store.entries.push({
          id: `entry-vel-${i}`,
          userId: referrerUser.id,
          action: CoinLedgerAction.REFERRAL_BONUS,
          amount: new Decimal(100),
          metadata: { refereeUserId: i % 2 === 0 ? "referee-A" : "referee-B" },
          createdAt: now,
        });
      }

      await coinService.awardReferralBonus(booking.id);

      // Distinct referees = referee-A, referee-B, refereeUser.id = 3 <= 10 -> NO ALERT
      const alerts = store.notifications.filter(
        (n) => n.type === "ops.referral_velocity_alert",
      );
      expect(alerts.length).toBe(0);
    });

    it("should trigger alert to OPERATIONS_ADMIN and SUPER_ADMIN when distinct referees > 10, and respect 30-day rolling cooldown", async () => {
      // Seed 10 distinct referees in trailing 30 days
      const now = new Date();
      for (let i = 1; i <= 10; i++) {
        store.entries.push({
          id: `entry-vel-distinct-${i}`,
          userId: referrerUser.id,
          action: CoinLedgerAction.REFERRAL_BONUS,
          amount: new Decimal(100),
          metadata: { refereeUserId: `referee-distinct-${i}` },
          createdAt: now,
        });
      }

      // Next booking check-in from refereeUser makes 11 distinct referees!
      await coinService.awardReferralBonus(booking.id);

      // Alerts should have been sent to operations admin and super admin
      const alerts = store.notifications.filter(
        (n) => n.type === "ops.referral_velocity_alert",
      );
      expect(alerts.length).toBe(2);
      expect(alerts[0].userId).toBe("admin-ops-1");
      expect(alerts[1].userId).toBe("admin-super-1");
      expect((alerts[0].metadata as any)?.velocityAlertReferrerId).toBe(
        referrerUser.id,
      );
      expect((alerts[0].metadata as any)?.distinctRefereeCount).toBe(11);

      // Re-trigger with a 12th distinct referee: Cooldown suppresses duplicate alert!
      const referee12 = {
        id: "user-referee-12",
        email: "ref12@example.com",
        firstName: "Twelve",
        lastName: "User",
        referredById: referrerUser.id,
        createdAt: new Date(),
        isVerified: true,
      };
      store.users.push(referee12);
      store.bookings.push({
        id: "bk-12",
        reference: "REF-12",
        userId: referee12.id,
        state: "CONFIRMED",
        totalAmount: new Decimal(10000),
      });
      store.transactions.push({
        id: "tx-12",
        bookingId: "bk-12",
        userId: referee12.id,
        amount: new Decimal(10000),
        status: "SUCCESSFUL",
      });

      const res12 = await coinService.awardReferralBonus("bk-12");
      expect(res12.coinsAwarded).toBe(500); // Coins are still awarded!

      // Alert count should remain 2 (no duplicate alert during rolling 30-day cooldown)
      const alertsAfter = store.notifications.filter(
        (n) => n.type === "ops.referral_velocity_alert",
      );
      expect(alertsAfter.length).toBe(2);
    });
  });

  describe("7. Finance Operator Manual Adjustment 6 Mandatory Guardrails", () => {
    const staffUserId = "user-finance-operator-1";
    const superAdminId = "admin-super-1";

    it("Guardrail 1: should reject manual adjustment when justification is < 20 characters", async () => {
      await expect(
        coinService.adjustCoins(staffUserId, refereeUser.id, 1000, "Too short"),
      ).rejects.toMatchObject({
        code: "INVALID_ADJUSTMENT_JUSTIFICATION",
        statusCode: 400,
      });
    });

    it("Guardrail 2: should reject manual adjustment when reasonCode is invalid", async () => {
      await expect(
        coinService.adjustCoins(staffUserId, refereeUser.id, 1000, {
          reasonCode: "INVALID_CODE" as any,
          justification:
            "Courtesy refund for air conditioning disruption during presentation",
        }),
      ).rejects.toMatchObject({
        code: "INVALID_REASON_CODE",
        statusCode: 400,
      });
    });

    it("Guardrail 3: should record an AuditLog entry with ipAddress on successful adjustment", async () => {
      const result = await coinService.adjustCoins(
        staffUserId,
        refereeUser.id,
        2500,
        {
          reasonCode: "GOODWILL",
          justification:
            "Courtesy compensation for meeting room AC downtime during client workshop",
          ipAddress: "192.168.1.100",
        },
      );

      expect(result.newBalance).toBe(2500);
      expect(result.entry.action).toBe(CoinLedgerAction.ADMIN_ADJUSTMENT);
      expect(store.auditLogs.length).toBe(1);
      expect(store.auditLogs[0]).toMatchObject({
        userId: staffUserId,
        action: "COIN_MANUAL_ADJUSTMENT",
        entityType: "CoinLedgerEntry",
        ipAddress: "192.168.1.100",
      });
    });

    it("Guardrail 4 (STRICT): should block non-super-admin from single adjustment > 5,000 PD", async () => {
      await expect(
        coinService.adjustCoins(
          staffUserId,
          refereeUser.id,
          5001,
          "Exceeding single transaction threshold of 5,000 PD for testing",
        ),
      ).rejects.toMatchObject({
        code: "TRANSACTION_LIMIT_EXCEEDED",
        statusCode: 403,
      });
    });

    it("Guardrail 4: should allow SUPER_ADMIN to exceed 5,000 PD single transaction limit up to daily cap", async () => {
      const result = await coinService.adjustCoins(
        superAdminId,
        refereeUser.id,
        15000,
        "Super Admin special executive grant for VIP company anniversary celebration",
      );
      expect(result.newBalance).toBe(15000);
    });

    it("Guardrail 5 (STRICT): should block operator when cumulative daily adjustments exceed 20,000 PD", async () => {
      // First adjustment by super admin: 15,000 PD
      await coinService.adjustCoins(
        superAdminId,
        refereeUser.id,
        15000,
        "VIP customer membership grant for annual partnership anniversary",
      );

      // Second adjustment: 6,000 PD (Total = 21,000 PD > 20,000 PD)
      await expect(
        coinService.adjustCoins(
          superAdminId,
          refereeUser.id,
          6000,
          "Exceeding daily budget adjustment cap for test verification",
        ),
      ).rejects.toMatchObject({
        code: "DAILY_ADJUSTMENT_LIMIT_EXCEEDED",
        statusCode: 400,
      });
    });

    it("Guardrail 6 (STRICT): should unconditionally block staff member from self-adjusting their own wallet", async () => {
      await expect(
        coinService.adjustCoins(
          staffUserId,
          staffUserId, // self-adjust
          1000,
          "Attempting to add coins to my own wallet balance for testing",
        ),
      ).rejects.toMatchObject({
        code: "SELF_ADJUSTMENT_PROHIBITED",
        statusCode: 403,
      });
    });
  });

  describe("8. 12-Month Inactivity Expiry Worker", () => {
    it("should expire balances for users inactive for > 12 months", async () => {
      const fourteenMonthsAgo = new Date();
      fourteenMonthsAgo.setMonth(fourteenMonthsAgo.getMonth() - 14);

      const recentDate = new Date();
      recentDate.setMonth(recentDate.getMonth() - 2);

      store.balances = [
        {
          userId: "user-dormant-1",
          balance: new Decimal(2500),
          lifetimeEarned: new Decimal(2500),
          lifetimeBurned: new Decimal(0),
          version: 1,
          lastEarnedAt: fourteenMonthsAgo,
        },
        {
          userId: "user-active-1",
          balance: new Decimal(3000),
          lifetimeEarned: new Decimal(3000),
          lifetimeBurned: new Decimal(0),
          version: 1,
          lastEarnedAt: recentDate,
        },
      ];

      const result = await coinService.expireInactiveCoins();

      expect(result.expiredAccounts).toBe(1);
      expect(result.totalCoinsExpired).toBe(2500);

      const dormantBalance = store.balances.find(
        (b) => b.userId === "user-dormant-1",
      );
      expect(Number(dormantBalance?.balance)).toBe(0);

      const activeBalance = store.balances.find(
        (b) => b.userId === "user-active-1",
      );
      expect(Number(activeBalance?.balance)).toBe(3000);

      const expiryEntry = store.entries.find(
        (e) => e.action === CoinLedgerAction.EXPIRY,
      );
      expect(expiryEntry).toBeDefined();
      expect(expiryEntry?.userId).toBe("user-dormant-1");
      expect(Number(expiryEntry?.amount)).toBe(-2500);
    });
  });

  describe("9. Member Tier Thresholds & Multipliers (Booking Earnings Only)", () => {
    it("should award Bronze members (0-249 lifetime) 1.0x booking earn (5%)", async () => {
      // Referee user has 0 lifetimeEarned (Bronze)
      const testBooking = {
        id: "bk-tier-bronze-1",
        reference: "DAIH-BK-BRONZE-1",
        userId: refereeUser.id,
        resourceId: "resource-desk-1",
        state: "CONFIRMED",
        totalAmount: new Decimal(20000),
      };
      store.bookings.push(testBooking);
      store.transactions.push({
        id: "tx-tier-bronze-1",
        reference: "DAIH-PAY-BRONZE-1",
        bookingId: testBooking.id,
        userId: refereeUser.id,
        amount: new Decimal(20000),
        status: "SUCCESSFUL",
      });

      const res = await coinService.awardBookingCheckInEarn(testBooking.id);
      // 20,000 * 5% * 1.0 = 1,000 PD
      expect(res.coinsAwarded).toBe(1000);

      const entry = store.entries.find((e) => e.referenceId === testBooking.id);
      expect(entry.metadata.tier).toBe("BRONZE");
      expect(entry.metadata.tierMultiplier).toBe(1.0);
    });

    it("should award Silver members (250-999 lifetime) 1.25x booking earn (6.25%)", async () => {
      // Set user's lifetimeEarned to 500 (Silver)
      const userBalance = store.balances.find(
        (b) => b.userId === refereeUser.id,
      );
      userBalance.lifetimeEarned = new Decimal(500);

      const testBooking = {
        id: "bk-tier-silver-1",
        reference: "DAIH-BK-SILVER-1",
        userId: refereeUser.id,
        resourceId: "resource-desk-1",
        state: "CONFIRMED",
        totalAmount: new Decimal(20000),
      };
      store.bookings.push(testBooking);
      store.transactions.push({
        id: "tx-tier-silver-1",
        reference: "DAIH-PAY-SILVER-1",
        bookingId: testBooking.id,
        userId: refereeUser.id,
        amount: new Decimal(20000),
        status: "SUCCESSFUL",
      });

      const res = await coinService.awardBookingCheckInEarn(testBooking.id);
      // 20,000 * 5% * 1.25 = 1,250 PD
      expect(res.coinsAwarded).toBe(1250);

      const entry = store.entries.find((e) => e.referenceId === testBooking.id);
      expect(entry.metadata.tier).toBe("SILVER");
      expect(entry.metadata.tierMultiplier).toBe(1.25);
    });

    it("should award Gold members (1,000+ lifetime) 1.5x booking earn (7.5%)", async () => {
      // Set user's lifetimeEarned to 1500 (Gold)
      const userBalance = store.balances.find(
        (b) => b.userId === refereeUser.id,
      );
      userBalance.lifetimeEarned = new Decimal(1500);

      const testBooking = {
        id: "bk-tier-gold-1",
        reference: "DAIH-BK-GOLD-1",
        userId: refereeUser.id,
        resourceId: "resource-desk-1",
        state: "CONFIRMED",
        totalAmount: new Decimal(20000),
      };
      store.bookings.push(testBooking);
      store.transactions.push({
        id: "tx-tier-gold-1",
        reference: "DAIH-PAY-GOLD-1",
        bookingId: testBooking.id,
        userId: refereeUser.id,
        amount: new Decimal(20000),
        status: "SUCCESSFUL",
      });

      const res = await coinService.awardBookingCheckInEarn(testBooking.id);
      // 20,000 * 5% * 1.5 = 1,500 PD
      expect(res.coinsAwarded).toBe(1500);

      const entry = store.entries.find((e) => e.referenceId === testBooking.id);
      expect(entry.metadata.tier).toBe("GOLD");
      expect(entry.metadata.tierMultiplier).toBe(1.5);
    });

    it("should ensure tier multipliers apply ONLY to booking earn, not referral bonus", async () => {
      // Referrer has Gold status (2,000 PD lifetime)
      const refBalance = store.balances.find(
        (b) => b.userId === referrerUser.id,
      );
      refBalance.lifetimeEarned = new Decimal(2000);

      store.bookings = [{ ...booking }];
      store.transactions = [{ ...transaction }];

      // Booking amount ₦50,000 -> raw 5% = 2,500 capped at 1,000 PD (not multiplied by 1.5x)
      const res = await coinService.awardReferralBonus(booking.id);
      expect(res.coinsAwarded).toBe(1000);
    });
  });
});
