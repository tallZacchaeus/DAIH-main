import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { CoinLedgerAction, HoldStatus } from "@prisma/client";
import { prisma } from "../../db/client.js";
import { coinService } from "./coin.service.js";
import { Decimal } from "@prisma/client/runtime/library";

const dbUrl = process.env.INTEGRATION_TEST_DB_URL;

describe.skipIf(!dbUrl)(
  "Loyalty Concurrency & Race Condition Integration Suite (Real Postgres)",
  { timeout: 30000 },
  () => {
    const createdUserIds: string[] = [];
    let defaultResourceId: string;

    beforeAll(async () => {
      // Find or create a test facility resource for booking foreign key constraints
      const existingResource = await prisma.facilityResource.findFirst();
      if (existingResource) {
        defaultResourceId = existingResource.id;
      } else {
        const newResource = await prisma.facilityResource.create({
          data: {
            name: "Concurrency Test Desk",
            slug: `concurrency-test-desk-${Date.now()}`,
            category: "HOT_DESK",
            description: "Resource for concurrency integration testing",
            location: "Lagos Hub",
          },
        });
        defaultResourceId = newResource.id;
      }
    });

    afterAll(async () => {
      if (createdUserIds.length > 0) {
        // Clean up in reverse dependency order to satisfy foreign key constraints
        await prisma.coinHold.deleteMany({
          where: { userId: { in: createdUserIds } },
        });
        await prisma.coinLedgerEntry.deleteMany({
          where: { userId: { in: createdUserIds } },
        });
        await prisma.coinBalance.deleteMany({
          where: { userId: { in: createdUserIds } },
        });
        await prisma.transaction.deleteMany({
          where: { userId: { in: createdUserIds } },
        });
        await prisma.booking.deleteMany({
          where: { userId: { in: createdUserIds } },
        });
        await prisma.user.deleteMany({
          where: { id: { in: createdUserIds } },
        });
      }
    });

    async function createTestUser(): Promise<{ id: string; email: string }> {
      const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const user = await prisma.user.create({
        data: {
          email: `concurrency_${uniqueSuffix}@test.daih.ng`,
          firstName: "Concurrency",
          lastName: "Tester",
          clientId: `CC_${uniqueSuffix}`,
        },
      });
      createdUserIds.push(user.id);
      return user;
    }

    async function createTestBooking(
      userId: string,
    ): Promise<{ id: string; reference: string }> {
      const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      return prisma.booking.create({
        data: {
          reference: `BK-CC-${uniqueSuffix}`,
          userId,
          resourceId: defaultResourceId,
          startTime: new Date(),
          endTime: new Date(Date.now() + 3600000),
          totalAmount: new Decimal(15000),
          state: "CONFIRMED",
        },
      });
    }

    describe("1. Over-commit holds race condition", () => {
      it("prevents double-spending: 2 concurrent 100 PDC holds against 150 PDC balance allows exactly 1", async () => {
        const user = await createTestUser();
        const bk1 = await createTestBooking(user.id);
        const bk2 = await createTestBooking(user.id);

        // Seed initial balance of 150 PDC
        await coinService.creditCoins({
          userId: user.id,
          action: CoinLedgerAction.SIGNUP_BONUS,
          amount: 150,
          referenceType: "USER",
          referenceId: user.id,
          idempotencyKey: `init_balance_${user.id}`,
        });

        // Fire two concurrent hold creations of 100 PDC each
        const results = await Promise.allSettled([
          coinService.createHold({
            userId: user.id,
            bookingId: bk1.id,
            amount: 100,
            nairaValue: 100,
          }),
          coinService.createHold({
            userId: user.id,
            bookingId: bk2.id,
            amount: 100,
            nairaValue: 100,
          }),
        ]);

        const fulfilled = results.filter((r) => r.status === "fulfilled");
        const rejected = results.filter((r) => r.status === "rejected");

        expect(fulfilled).toHaveLength(1);
        expect(rejected).toHaveLength(1);

        const rejectionReason: any = (rejected[0] as PromiseRejectedResult)
          .reason;
        expect(rejectionReason.code).toBe("INSUFFICIENT_COIN_HOLD");

        // Verify remaining spendable balance is exactly 50 PDC
        const summary = await coinService.getSpendableBalance(user.id);
        expect(summary.totalBalance).toBe(150);
        expect(summary.heldBalance).toBe(100);
        expect(summary.spendableBalance).toBe(50);
      });
    });

    describe("2. Burn vs Expiry race in both orders", () => {
      it("Order A: Expired hold cannot be burned", async () => {
        const user = await createTestUser();
        const bk = await createTestBooking(user.id);

        // Seed 200 PDC
        await coinService.creditCoins({
          userId: user.id,
          action: CoinLedgerAction.SIGNUP_BONUS,
          amount: 200,
          referenceType: "USER",
          referenceId: user.id,
          idempotencyKey: `init_balance_${user.id}`,
        });

        // Create hold that is already expired
        await prisma.coinHold.create({
          data: {
            userId: user.id,
            bookingId: bk.id,
            amount: new Decimal(100),
            nairaValue: new Decimal(100),
            status: HoldStatus.ACTIVE,
            expiresAt: new Date(Date.now() - 5000), // 5 seconds in the past
          },
        });

        const burnRes = await coinService.burnHold(bk.id);
        expect(burnRes.success).toBe(false);
        expect(burnRes.burnedCoins).toBe(0);

        // Balance remains 200 PDC and 0 burned
        const balance = await prisma.coinBalance.findUnique({
          where: { userId: user.id },
        });
        expect(Number(balance?.balance)).toBe(200);
        expect(Number(balance?.lifetimeBurned)).toBe(0);
      });

      it("Order B: Burned hold cannot be expired / released", async () => {
        const user = await createTestUser();
        const bk = await createTestBooking(user.id);

        // Seed 200 PDC
        await coinService.creditCoins({
          userId: user.id,
          action: CoinLedgerAction.SIGNUP_BONUS,
          amount: 200,
          referenceType: "USER",
          referenceId: user.id,
          idempotencyKey: `init_balance_${user.id}`,
        });

        // Create active hold
        await coinService.createHold({
          userId: user.id,
          bookingId: bk.id,
          amount: 100,
          nairaValue: 100,
        });

        // Burn hold
        const burnRes = await coinService.burnHold(bk.id);
        expect(burnRes.success).toBe(true);
        expect(burnRes.burnedCoins).toBe(100);

        // Attempt to release hold
        await coinService.releaseHold(bk.id);

        // Hold status must remain BURNED
        const hold = await prisma.coinHold.findUnique({
          where: { bookingId: bk.id },
        });
        expect(hold?.status).toBe(HoldStatus.BURNED);
      });
    });

    describe("3. Concurrent burnHold requests", () => {
      it("debits balance exactly once when two simultaneous burn requests execute", async () => {
        const user = await createTestUser();
        const bk = await createTestBooking(user.id);

        await coinService.creditCoins({
          userId: user.id,
          action: CoinLedgerAction.SIGNUP_BONUS,
          amount: 200,
          referenceType: "USER",
          referenceId: user.id,
          idempotencyKey: `init_balance_${user.id}`,
        });

        await coinService.createHold({
          userId: user.id,
          bookingId: bk.id,
          amount: 100,
          nairaValue: 100,
        });

        // Execute two burnHold requests simultaneously
        const [res1, res2] = await Promise.all([
          coinService.burnHold(bk.id),
          coinService.burnHold(bk.id),
        ]);

        const successes = [res1, res2].filter((r) => r.success);
        const failures = [res1, res2].filter((r) => !r.success);

        expect(successes).toHaveLength(1);
        expect(failures).toHaveLength(1);
        expect(successes[0].burnedCoins).toBe(100);

        // Balance must be debited exactly once (200 - 100 = 100)
        const balance = await prisma.coinBalance.findUnique({
          where: { userId: user.id },
        });
        expect(Number(balance?.balance)).toBe(100);
        expect(Number(balance?.lifetimeBurned)).toBe(100);
      });
    });

    describe("4. Concurrent credits and row lock serialization", () => {
      it("Subcase 4a: Same idempotency key concurrently returns duplicate with zero lost updates", async () => {
        const user = await createTestUser();
        const key = `dup_credit_${Date.now()}_${user.id}`;

        const [c1, c2] = await Promise.all([
          coinService.creditCoins({
            userId: user.id,
            action: CoinLedgerAction.ADMIN_ADJUSTMENT,
            amount: 50,
            referenceType: "TEST",
            idempotencyKey: key,
          }),
          coinService.creditCoins({
            userId: user.id,
            action: CoinLedgerAction.ADMIN_ADJUSTMENT,
            amount: 50,
            referenceType: "TEST",
            idempotencyKey: key,
          }),
        ]);

        const duplicates = [c1, c2].filter((c) => c.duplicate);
        const fresh = [c1, c2].filter((c) => !c.duplicate);

        expect(duplicates).toHaveLength(1);
        expect(fresh).toHaveLength(1);

        const balance = await prisma.coinBalance.findUnique({
          where: { userId: user.id },
        });
        expect(Number(balance?.balance)).toBe(50);
      });

      it("Subcase 4b: Different keys concurrently serialize via row lock with zero lost updates", async () => {
        const user = await createTestUser();

        // Seed 100 PDC
        await coinService.creditCoins({
          userId: user.id,
          action: CoinLedgerAction.SIGNUP_BONUS,
          amount: 100,
          referenceType: "USER",
          referenceId: user.id,
          idempotencyKey: `init_balance_${user.id}`,
        });

        // Fire 2 concurrent credits of 50 PDC each with different keys
        const [c1, c2] = await Promise.all([
          coinService.creditCoins({
            userId: user.id,
            action: CoinLedgerAction.ADMIN_ADJUSTMENT,
            amount: 50,
            referenceType: "TEST",
            idempotencyKey: `credit_key_1_${user.id}`,
          }),
          coinService.creditCoins({
            userId: user.id,
            action: CoinLedgerAction.ADMIN_ADJUSTMENT,
            amount: 50,
            referenceType: "TEST",
            idempotencyKey: `credit_key_2_${user.id}`,
          }),
        ]);

        expect(c1.duplicate).toBe(false);
        expect(c2.duplicate).toBe(false);

        // Final balance must be exactly 100 + 50 + 50 = 200
        const balance = await prisma.coinBalance.findUnique({
          where: { userId: user.id },
        });
        expect(Number(balance?.balance)).toBe(200);
        expect(Number(balance?.lifetimeEarned)).toBe(200);
      });

      it("Subcase 4c: First credit for new user race condition handled cleanly by INSERT ON CONFLICT", async () => {
        const user = await createTestUser();

        // 3 concurrent initial credits for a brand new user with no existing CoinBalance row
        const results = await Promise.all([
          coinService.creditCoins({
            userId: user.id,
            action: CoinLedgerAction.SIGNUP_BONUS,
            amount: 10,
            referenceType: "USER",
            referenceId: user.id,
            idempotencyKey: `first_race_1_${user.id}`,
          }),
          coinService.creditCoins({
            userId: user.id,
            action: CoinLedgerAction.SIGNUP_BONUS,
            amount: 20,
            referenceType: "USER",
            referenceId: user.id,
            idempotencyKey: `first_race_2_${user.id}`,
          }),
          coinService.creditCoins({
            userId: user.id,
            action: CoinLedgerAction.SIGNUP_BONUS,
            amount: 30,
            referenceType: "USER",
            referenceId: user.id,
            idempotencyKey: `first_race_3_${user.id}`,
          }),
        ]);

        for (const res of results) {
          expect(res.duplicate).toBe(false);
        }

        const balance = await prisma.coinBalance.findUnique({
          where: { userId: user.id },
        });
        expect(Number(balance?.balance)).toBe(60);
      });
    });

    describe("5. Clawback idempotency retry and shortfall safety", () => {
      it("Subcase 5a: Retry with same key after balance changed returns original entry without re-debiting", async () => {
        const user = await createTestUser();
        const bk = await createTestBooking(user.id);

        // Earn 30 PDC for booking
        await coinService.creditCoins({
          userId: user.id,
          action: CoinLedgerAction.BOOKING_EARN,
          amount: 30,
          referenceType: "BOOKING",
          referenceId: bk.id,
          idempotencyKey: `earn_${bk.id}`,
        });

        // Clawback 30 PDC
        const clawbackKey = `clawback_${bk.id}`;
        const clawbackRes = await coinService.debitCoins({
          userId: user.id,
          action: CoinLedgerAction.REFUND_CLAWBACK,
          amount: 30,
          referenceType: "BOOKING",
          referenceId: bk.id,
          idempotencyKey: clawbackKey,
          metadata: {
            requestedAmount: "30.00",
            bookingId: bk.id,
          },
        });

        expect(clawbackRes.duplicate).toBe(false);
        expect(Math.abs(Number(clawbackRes.entry.amount))).toBe(30);

        // Now user earns an additional 50 PDC
        await coinService.creditCoins({
          userId: user.id,
          action: CoinLedgerAction.ADMIN_ADJUSTMENT,
          amount: 50,
          referenceType: "TEST",
          idempotencyKey: `new_earn_${user.id}`,
        });

        // Retry the exact same clawback with the same key
        const retryRes = await coinService.debitCoins({
          userId: user.id,
          action: CoinLedgerAction.REFUND_CLAWBACK,
          amount: 30,
          referenceType: "BOOKING",
          referenceId: bk.id,
          idempotencyKey: clawbackKey,
          metadata: {
            requestedAmount: "30.00",
            bookingId: bk.id,
          },
        });

        expect(retryRes.duplicate).toBe(true);
        expect(Math.abs(Number(retryRes.entry.amount))).toBe(30);

        // User balance must remain 50 PDC (NOT debited a second time!)
        const balance = await prisma.coinBalance.findUnique({
          where: { userId: user.id },
        });
        expect(Number(balance?.balance)).toBe(50);
      });

      it("Subcase 5b: Retry of zero-shortfall clawback after earning new coins does not claw back", async () => {
        const user = await createTestUser();
        const bk = await createTestBooking(user.id);

        // User has 0 balance (no earn or spendable)
        const clawbackKey = `clawback_zero_${bk.id}`;
        const clawbackZeroRes = await coinService.debitCoins({
          userId: user.id,
          action: CoinLedgerAction.REFUND_CLAWBACK,
          amount: 40,
          referenceType: "BOOKING",
          referenceId: bk.id,
          idempotencyKey: clawbackKey,
          metadata: {
            requestedAmount: "40.00",
            bookingId: bk.id,
          },
        });

        expect(clawbackZeroRes.duplicate).toBe(false);
        expect(Number(clawbackZeroRes.entry.amount)).toBe(0);
        expect((clawbackZeroRes.entry.metadata as any)?.shortfall).toBe(
          "40.00",
        );

        // User now earns 100 PDC
        await coinService.creditCoins({
          userId: user.id,
          action: CoinLedgerAction.SIGNUP_BONUS,
          amount: 100,
          referenceType: "USER",
          referenceId: user.id,
          idempotencyKey: `signup_${user.id}`,
        });

        // Retry the zero clawback with the same key
        const retryZeroRes = await coinService.debitCoins({
          userId: user.id,
          action: CoinLedgerAction.REFUND_CLAWBACK,
          amount: 40,
          referenceType: "BOOKING",
          referenceId: bk.id,
          idempotencyKey: clawbackKey,
          metadata: {
            requestedAmount: "40.00",
            bookingId: bk.id,
          },
        });

        expect(retryZeroRes.duplicate).toBe(true);
        expect(Number(retryZeroRes.entry.amount)).toBe(0);

        // Balance remains 100 PDC (the 100 PDC is NOT seized by the retried zero-clawback!)
        const balance = await prisma.coinBalance.findUnique({
          where: { userId: user.id },
        });
        expect(Number(balance?.balance)).toBe(100);
      });

      it("Subcase 5c: Service level clawbackEarnedCoins looks up original earn and claws back", async () => {
        const user = await createTestUser();
        const bk = await createTestBooking(user.id);

        // 1. Credit earn for booking
        await coinService.creditCoins({
          userId: user.id,
          action: CoinLedgerAction.BOOKING_EARN,
          amount: 45,
          referenceType: "BOOKING",
          referenceId: bk.id,
          idempotencyKey: `earn_full_${bk.id}`,
        });

        // 2. Call clawbackEarnedCoins
        await coinService.clawbackEarnedCoins(bk.id, 45);

        // Balance debited to 0
        const balance = await prisma.coinBalance.findUnique({
          where: { userId: user.id },
        });
        expect(Number(balance?.balance)).toBe(0);

        // Second call is idempotent because remainingEarned is 0
        await coinService.clawbackEarnedCoins(bk.id, 45);
        const balance2 = await prisma.coinBalance.findUnique({
          where: { userId: user.id },
        });
        expect(Number(balance2?.balance)).toBe(0);
      });
    });
  },
);
