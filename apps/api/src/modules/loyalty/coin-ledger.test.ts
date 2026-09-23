import { describe, it, expect, beforeEach, vi } from "vitest";
import { CoinLedgerAction, HoldStatus } from "@prisma/client";
import { coinService } from "./coin.service.js";
import { Decimal } from "@prisma/client/runtime/library";

const { store } = vi.hoisted(() => ({
  store: {
    balances: [] as any[],
    entries: [] as any[],
    holds: [] as any[],
    bookings: [] as any[],
    transactions: [] as any[],
  },
}));

vi.mock("../../db/client.js", () => {
  const mockTx = {
    $executeRaw: vi.fn(async () => 1),
    $queryRaw: vi.fn(async (query: any, ...values: any[]) => {
      // Mock SELECT FOR UPDATE row query
      const userId =
        values[0] || (query as any)?.values?.[0] || store.balances[0]?.userId;
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
          version: store.balances[idx].version + 1,
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
      create: vi.fn(async ({ data }: any) => {
        const record = {
          id: `cle_${Date.now()}_${Math.random()}`,
          ...data,
          createdAt: new Date(),
        };
        store.entries.push(record);
        return record;
      }),
    },
    coinHold: {
      findUnique: vi.fn(async ({ where }: any) => {
        return store.holds.find((h) => h.bookingId === where.bookingId) || null;
      }),
      findMany: vi.fn(async ({ where }: any) => {
        return store.holds.filter((h) => {
          if (h.userId !== where.userId) return false;
          if (where.status && h.status !== where.status) return false;
          if (where.expiresAt?.gt && h.expiresAt <= where.expiresAt.gt)
            return false;
          if (where.bookingId?.not && h.bookingId === where.bookingId.not)
            return false;
          return true;
        });
      }),
      upsert: vi.fn(async ({ where, create, update }: any) => {
        const idx = store.holds.findIndex(
          (h) => h.bookingId === where.bookingId,
        );
        if (idx !== -1) {
          store.holds[idx] = {
            ...store.holds[idx],
            ...update,
            updatedAt: new Date(),
          };
          return store.holds[idx];
        }
        const created = {
          id: `hold_${Date.now()}`,
          ...create,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        store.holds.push(created);
        return created;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const idx = store.holds.findIndex((h) => h.id === where.id);
        if (idx === -1) throw new Error("Hold not found");
        store.holds[idx] = {
          ...store.holds[idx],
          ...data,
          updatedAt: new Date(),
        };
        return store.holds[idx];
      }),
    },
    loyaltyWallet: {
      upsert: vi.fn(async () => ({})),
    },
    booking: {
      findUnique: vi.fn(async ({ where, include }: any) => {
        const booking = store.bookings.find((b) => b.id === where.id);
        if (!booking) return null;
        const transactions = store.transactions.filter(
          (t) =>
            t.bookingId === booking.id &&
            (!include?.transactions?.where?.status ||
              t.status === include.transactions.where.status),
        );
        return {
          ...booking,
          transactions,
          user: { id: booking.userId, email: "customer@daih.ng" },
        };
      }),
    },
  };

  return {
    prisma: {
      ...mockTx,
      $transaction: vi.fn(async (cb: any) => cb(mockTx)),
    },
  };
});

describe("PeeDee Coin (PD) Ledger & Earning Engine (Release 2)", () => {
  beforeEach(() => {
    store.balances.length = 0;
    store.entries.length = 0;
    store.holds.length = 0;
    store.bookings.length = 0;
    store.transactions.length = 0;
    vi.clearAllMocks();
  });

  describe("1. Credit Coins & Idempotency", () => {
    it("credits coins, updates balance and lifetimeEarned, and creates append-only ledger entry", async () => {
      const res = await coinService.creditCoins({
        userId: "usr_alice",
        action: CoinLedgerAction.SIGNUP_BONUS,
        amount: 500,
        referenceType: "USER",
        referenceId: "usr_alice",
        idempotencyKey: "signup_bonus_usr_alice",
      });

      expect(res.newBalance).toBe(500);
      expect(res.duplicate).toBe(false);
      expect(store.entries).toHaveLength(1);
      expect(store.entries[0].action).toBe(CoinLedgerAction.SIGNUP_BONUS);
      expect(Number(store.entries[0].balanceAfter)).toBe(500);

      // Re-running with same idempotency key must NOT duplicate balance or entry
      const dupRes = await coinService.creditCoins({
        userId: "usr_alice",
        action: CoinLedgerAction.SIGNUP_BONUS,
        amount: 500,
        referenceType: "USER",
        referenceId: "usr_alice",
        idempotencyKey: "signup_bonus_usr_alice",
      });

      expect(dupRes.duplicate).toBe(true);
      expect(dupRes.newBalance).toBe(500);
      expect(store.entries).toHaveLength(1);
    });
  });

  describe("2. Debit Coins & Spendable Concurrency Safety", () => {
    it("rejects debit if spendable balance is insufficient due to active holds", async () => {
      // User has 1,000 PD total balance
      store.balances.push({
        userId: "usr_bob",
        balance: new Decimal(1000),
        lifetimeEarned: new Decimal(1000),
        lifetimeBurned: new Decimal(0),
        version: 1,
      });

      // User has an active 700 PD hold
      store.holds.push({
        id: "hold_1",
        userId: "usr_bob",
        bookingId: "bk_1",
        amount: new Decimal(700),
        nairaValue: new Decimal(700),
        status: HoldStatus.ACTIVE,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // active
      });

      // Spendable = 1000 - 700 = 300 PD. Attempting to debit 400 PD must fail!
      await expect(
        coinService.debitCoins({
          userId: "usr_bob",
          action: CoinLedgerAction.ADMIN_ADJUSTMENT,
          amount: 400,
          referenceType: "ADJUSTMENT",
          idempotencyKey: "adj_test_1",
        }),
      ).rejects.toMatchObject({
        code: "INSUFFICIENT_COIN_BALANCE",
        statusCode: 400,
      });

      // Debiting 250 PD must succeed (250 <= 300)
      const debitRes = await coinService.debitCoins({
        userId: "usr_bob",
        action: CoinLedgerAction.ADMIN_ADJUSTMENT,
        amount: 250,
        referenceType: "ADJUSTMENT",
        idempotencyKey: "adj_test_2",
      });

      expect(debitRes.newBalance).toBe(750);
      expect(store.entries.some((e) => e.idempotencyKey === "adj_test_2")).toBe(
        true,
      );
    });
  });

  describe("3. Two-Phase Hold Lifecycle (Create, Burn, Release)", () => {
    it("creates hold without debiting balance, and burns hold upon payment confirmation", async () => {
      store.balances.push({
        userId: "usr_carol",
        balance: new Decimal(2000),
        lifetimeEarned: new Decimal(2000),
        lifetimeBurned: new Decimal(0),
        version: 1,
      });

      // 1. Create hold for 600 PD on booking_99
      const hold = await coinService.createHold({
        userId: "usr_carol",
        bookingId: "booking_99",
        amount: 600,
        nairaValue: 600,
      });

      expect(hold.status).toBe(HoldStatus.ACTIVE);
      expect(Number(hold.amount)).toBe(600);

      // Spendable balance is now 1400, but total balance remains 2000
      const summary = await coinService.getSpendableBalance("usr_carol");
      expect(summary.totalBalance).toBe(2000);
      expect(summary.heldBalance).toBe(600);
      expect(summary.spendableBalance).toBe(1400);

      // 2. Burn hold upon confirmed payment
      const burnRes = await coinService.burnHold("booking_99");
      expect(burnRes.success).toBe(true);
      expect(burnRes.burnedCoins).toBe(600);

      // Balance is now debited to 1400, hold is BURNED
      const updatedBalance = store.balances.find(
        (b) => b.userId === "usr_carol",
      );
      expect(Number(updatedBalance.balance)).toBe(1400);
      expect(Number(updatedBalance.lifetimeBurned)).toBe(600);

      const burnedHold = store.holds.find((h) => h.bookingId === "booking_99");
      expect(burnedHold.status).toBe(HoldStatus.BURNED);
    });
  });

  describe("4. 5% Booking Check-in Earning Engine", () => {
    it("awards 5% of net fiat paid amount floored to nearest PD on check-in", async () => {
      // ₦25,500 settled booking payment
      store.bookings.push({
        id: "bk_workspace_1",
        userId: "usr_dave",
        reference: "DAIH-BK-2026-991",
      });

      store.transactions.push({
        id: "txn_paid_1",
        bookingId: "bk_workspace_1",
        userId: "usr_dave",
        amount: new Decimal(25500),
        status: "SUCCESSFUL",
      });

      const earnRes =
        await coinService.awardBookingCheckInEarn("bk_workspace_1");
      // 25,500 * 0.05 = 1,275 PD
      expect(earnRes.coinsAwarded).toBe(1275);

      const daveBalance = store.balances.find((b) => b.userId === "usr_dave");
      expect(Number(daveBalance.balance)).toBe(1275);
      expect(store.entries[0].action).toBe(CoinLedgerAction.BOOKING_EARN);

      // Second check-in trigger (e.g. re-entry or retry) does not award duplicate coins
      const dupEarnRes =
        await coinService.awardBookingCheckInEarn("bk_workspace_1");
      expect(dupEarnRes.coinsAwarded).toBe(0);
      expect(Number(daveBalance.balance)).toBe(1275);
    });
  });

  describe("5. Bonus Engines (Signup, Birthday, Streak)", () => {
    it("awards welcome signup bonus, annual birthday bonus, and 3-month streak bonus", async () => {
      // Signup: 500 PD
      const signupRes = await coinService.awardSignupBonus("usr_eve");
      expect(signupRes.coinsAwarded).toBe(500);

      // Birthday: 500 PD
      const bdayRes = await coinService.awardBirthdayBonus("usr_eve", 2026);
      expect(bdayRes.coinsAwarded).toBe(500);

      // Streak: 200 PD
      const streakRes = await coinService.awardStreakBonus(
        "usr_eve",
        "2026-09",
      );
      expect(streakRes.coinsAwarded).toBe(200);

      const eveBalance = store.balances.find((b) => b.userId === "usr_eve");
      // Total: 500 + 500 + 200 = 1,200 PD
      expect(Number(eveBalance.balance)).toBe(1200);
      expect(store.entries).toHaveLength(3);
    });
  });
});
