import { describe, it, expect } from "vitest";
import { CoinLedgerAction } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import {
  TotalsState,
  roundCoinAmount,
  validateCoinAmount,
  toCoinNumber,
  mapActionToTransactionType,
  mapTransactionTypeToAction,
  applyEntryToTotals,
  formatLedgerDescription,
  ACTION_TO_TRANSACTION_TYPE,
  TRANSACTION_TYPE_TO_ACTION,
  InvariantViolationError,
  InvalidAmountError,
} from "./loyalty.utils.js";

describe("loyalty.utils", () => {
  describe("Bijective Mapping & Exhaustiveness", () => {
    const validLedgerActions: CoinLedgerAction[] = [
      CoinLedgerAction.BOOKING_EARN,
      CoinLedgerAction.REFERRAL_BONUS,
      CoinLedgerAction.SIGNUP_BONUS,
      CoinLedgerAction.BIRTHDAY_BONUS,
      CoinLedgerAction.STREAK_BONUS,
      CoinLedgerAction.HOLD_BURNED,
      CoinLedgerAction.EXPIRY,
      CoinLedgerAction.ADMIN_ADJUSTMENT,
      CoinLedgerAction.REFUND_CLAWBACK,
      CoinLedgerAction.REDEMPTION_REVERSAL,
    ];

    it("should round-trip map every valid ledger action bijectively", () => {
      expect(validLedgerActions.length).toBe(10);
      for (const action of validLedgerActions) {
        const type = mapActionToTransactionType(action);
        expect(type).toBeDefined();
        const reverseAction = mapTransactionTypeToAction(type);
        expect(reverseAction).toBe(action);
      }
    });

    it("should throw InvariantViolationError for hold-only actions", () => {
      expect(() =>
        mapActionToTransactionType(CoinLedgerAction.HOLD_PLACED),
      ).toThrow(InvariantViolationError);
      expect(() =>
        mapActionToTransactionType(CoinLedgerAction.HOLD_RELEASED),
      ).toThrow(InvariantViolationError);
    });
  });

  describe("Rounding & Validation", () => {
    it("roundCoinAmount rounds strictly to 2 decimal places using half-up", () => {
      expect(roundCoinAmount("10.004").toString()).toBe("10");
      expect(roundCoinAmount("10.005").toString()).toBe("10.01");
      expect(roundCoinAmount(new Decimal("15.126")).toString()).toBe("15.13");
      expect(roundCoinAmount(null).toString()).toBe("0");
    });

    it("validateCoinAmount enforces minimum 0.01 PDC", () => {
      expect(() => validateCoinAmount(new Decimal("0.01"))).not.toThrow();
      expect(() => validateCoinAmount("0.05")).not.toThrow();
      expect(() => validateCoinAmount(new Decimal("0.004"))).toThrow(
        InvalidAmountError,
      );
      expect(() => validateCoinAmount("0")).toThrow(InvalidAmountError);
      expect(() => validateCoinAmount("-5")).toThrow(InvalidAmountError);
    });

    it("toCoinNumber converts values cleanly to JS number", () => {
      expect(toCoinNumber(new Decimal("12.345"))).toBe(12.35);
      expect(toCoinNumber(0)).toBe(0);
      expect(toCoinNumber(null)).toBe(0);
    });
  });

  describe("applyEntryToTotals", () => {
    const freshTotals = (): TotalsState => ({
      balance: new Decimal(0),
      lifetimeEarned: new Decimal(0),
      lifetimeBurned: new Decimal(0),
    });

    it("processes earn actions correctly", () => {
      let totals = freshTotals();
      totals = applyEntryToTotals(totals, {
        action: CoinLedgerAction.BOOKING_EARN,
        amount: new Decimal("15.00"),
      });
      expect(totals.balance.toString()).toBe("15");
      expect(totals.lifetimeEarned.toString()).toBe("15");
      expect(totals.lifetimeBurned.toString()).toBe("0");

      totals = applyEntryToTotals(totals, {
        action: CoinLedgerAction.REFERRAL_BONUS,
        amount: new Decimal("5.00"),
      });
      expect(totals.balance.toString()).toBe("20");
      expect(totals.lifetimeEarned.toString()).toBe("20");
    });

    it("throws if earn action has non-positive amount", () => {
      const totals = freshTotals();
      expect(() =>
        applyEntryToTotals(totals, {
          action: CoinLedgerAction.BOOKING_EARN,
          amount: new Decimal("-10.00"),
        }),
      ).toThrow(InvariantViolationError);
    });

    it("processes HOLD_BURNED and enforces negative sign", () => {
      let totals: TotalsState = {
        balance: new Decimal(20),
        lifetimeEarned: new Decimal(20),
        lifetimeBurned: new Decimal(0),
      };

      totals = applyEntryToTotals(totals, {
        action: CoinLedgerAction.HOLD_BURNED,
        amount: new Decimal("-15.00"),
      });

      expect(totals.balance.toString()).toBe("5");
      expect(totals.lifetimeEarned.toString()).toBe("20");
      expect(totals.lifetimeBurned.toString()).toBe("15");

      // Positive amount on HOLD_BURNED must throw
      expect(() =>
        applyEntryToTotals(totals, {
          action: CoinLedgerAction.HOLD_BURNED,
          amount: new Decimal("15.00"),
        }),
      ).toThrow(InvariantViolationError);
    });

    it("processes REDEMPTION_REVERSAL by reducing lifetimeBurned", () => {
      let totals: TotalsState = {
        balance: new Decimal(5),
        lifetimeEarned: new Decimal(20),
        lifetimeBurned: new Decimal(15),
      };

      totals = applyEntryToTotals(totals, {
        action: CoinLedgerAction.REDEMPTION_REVERSAL,
        amount: new Decimal("10.00"),
      });

      expect(totals.balance.toString()).toBe("15");
      expect(totals.lifetimeEarned.toString()).toBe("20");
      expect(totals.lifetimeBurned.toString()).toBe("5");

      // Clamps to 0 if reversal exceeds burned
      totals = applyEntryToTotals(totals, {
        action: CoinLedgerAction.REDEMPTION_REVERSAL,
        amount: new Decimal("10.00"),
      });
      expect(totals.lifetimeBurned.toString()).toBe("0");
    });

    it("processes ADMIN_ADJUSTMENT correctly for both signs", () => {
      let totals = freshTotals();

      // Positive admin adjustment counts toward lifetimeEarned
      totals = applyEntryToTotals(totals, {
        action: CoinLedgerAction.ADMIN_ADJUSTMENT,
        amount: new Decimal("50.00"),
      });
      expect(totals.balance.toString()).toBe("50");
      expect(totals.lifetimeEarned.toString()).toBe("50");

      // Negative admin adjustment debits balance only
      totals = applyEntryToTotals(totals, {
        action: CoinLedgerAction.ADMIN_ADJUSTMENT,
        amount: new Decimal("-20.00"),
      });
      expect(totals.balance.toString()).toBe("30");
      expect(totals.lifetimeEarned.toString()).toBe("50");
      expect(totals.lifetimeBurned.toString()).toBe("0");
    });

    it("processes EXPIRY by debiting balance only", () => {
      let totals: TotalsState = {
        balance: new Decimal(30),
        lifetimeEarned: new Decimal(50),
        lifetimeBurned: new Decimal(0),
      };

      totals = applyEntryToTotals(totals, {
        action: CoinLedgerAction.EXPIRY,
        amount: new Decimal("-10.00"),
      });
      expect(totals.balance.toString()).toBe("20");
      expect(totals.lifetimeEarned.toString()).toBe("50");
      expect(totals.lifetimeBurned.toString()).toBe("0");
    });

    describe("Refund Clawbacks & Tier Credit Closure", () => {
      it("full clawback: reduces balance and lifetimeEarned equally", () => {
        let totals: TotalsState = {
          balance: new Decimal(15),
          lifetimeEarned: new Decimal(15),
          lifetimeBurned: new Decimal(0),
        };

        totals = applyEntryToTotals(totals, {
          action: CoinLedgerAction.REFUND_CLAWBACK,
          amount: new Decimal("-15.00"),
          metadata: { requestedAmount: "15.00" },
        });

        expect(totals.balance.toString()).toBe("0");
        expect(totals.lifetimeEarned.toString()).toBe("0");
      });

      it("partial clawback: caps balance debit but closes tier credit via requestedAmount", () => {
        // Customer earned 15, spent 10 -> balance = 5, earned = 15, burned = 10
        let totals: TotalsState = {
          balance: new Decimal(5),
          lifetimeEarned: new Decimal(15),
          lifetimeBurned: new Decimal(10),
        };

        // Refund occurs: customer only had 5 spendable coins, so actual clawback is -5, but requested was 15
        totals = applyEntryToTotals(totals, {
          action: CoinLedgerAction.REFUND_CLAWBACK,
          amount: new Decimal("-5.00"),
          metadata: { requestedAmount: "15.00" },
        });

        expect(totals.balance.toString()).toBe("0"); // balance debited by 5
        expect(totals.lifetimeEarned.toString()).toBe("0"); // tier credit reduced by full requested 15!
        expect(totals.lifetimeBurned.toString()).toBe("10");
      });

      it("zero-amount clawback shortfall: preserves balance and removes tier credit", () => {
        // Customer earned 15, spent 15 -> balance = 0, earned = 15, burned = 15
        let totals: TotalsState = {
          balance: new Decimal(0),
          lifetimeEarned: new Decimal(15),
          lifetimeBurned: new Decimal(15),
        };

        // Refund occurs when spendable = 0: amount is 0, requested is 15
        totals = applyEntryToTotals(totals, {
          action: CoinLedgerAction.REFUND_CLAWBACK,
          amount: new Decimal("0.00"),
          metadata: { requestedAmount: "15.00" },
        });

        expect(totals.balance.toString()).toBe("0"); // balance remains 0
        expect(totals.lifetimeEarned.toString()).toBe("0"); // tier credit cleanly reduced to 0!
        expect(totals.lifetimeBurned.toString()).toBe("15");
      });

      it("no earn entry found: requestedAmount is 0.00, amount is 0.00, totals unaffected", () => {
        let totals: TotalsState = {
          balance: new Decimal(10),
          lifetimeEarned: new Decimal(20),
          lifetimeBurned: new Decimal(5),
        };

        totals = applyEntryToTotals(totals, {
          action: CoinLedgerAction.REFUND_CLAWBACK,
          amount: new Decimal("0.00"),
          metadata: { requestedAmount: "0.00", shortfall: "0.00" },
        });

        expect(totals.balance.toString()).toBe("10");
        expect(totals.lifetimeEarned.toString()).toBe("20");
        expect(totals.lifetimeBurned.toString()).toBe("5");
      });

      it("multiple earns for one booking: claws back sum of base + bonus", () => {
        let totals: TotalsState = {
          balance: new Decimal(30),
          lifetimeEarned: new Decimal(30),
          lifetimeBurned: new Decimal(0),
        };

        // Booking had Base Earn (20) + Streak Bonus (10) = 30 total earn
        totals = applyEntryToTotals(totals, {
          action: CoinLedgerAction.REFUND_CLAWBACK,
          amount: new Decimal("-30.00"),
          metadata: { requestedAmount: "30.00" },
        });

        expect(totals.balance.toString()).toBe("0");
        expect(totals.lifetimeEarned.toString()).toBe("0");
      });

      it("throws on corrupt metadata where requestedAmount < |amount|", () => {
        const totals: TotalsState = {
          balance: new Decimal(20),
          lifetimeEarned: new Decimal(20),
          lifetimeBurned: new Decimal(0),
        };

        expect(() =>
          applyEntryToTotals(totals, {
            action: CoinLedgerAction.REFUND_CLAWBACK,
            amount: new Decimal("-15.00"),
            metadata: { requestedAmount: "10.00" }, // 10 < 15 is corrupt
          }),
        ).toThrow(InvariantViolationError);
      });
    });

    it("throws on hold actions inside applyEntryToTotals", () => {
      const totals = freshTotals();
      expect(() =>
        applyEntryToTotals(totals, {
          action: CoinLedgerAction.HOLD_PLACED,
          amount: new Decimal(0),
        }),
      ).toThrow(InvariantViolationError);
      expect(() =>
        applyEntryToTotals(totals, {
          action: CoinLedgerAction.HOLD_RELEASED,
          amount: new Decimal(0),
        }),
      ).toThrow(InvariantViolationError);
    });

    it("verifies chronological fold invariant: balance === SUM(amounts)", () => {
      let totals = freshTotals();
      const amounts: Decimal[] = [];

      const steps = [
        { action: CoinLedgerAction.SIGNUP_BONUS, amount: new Decimal("10.00") },
        { action: CoinLedgerAction.BOOKING_EARN, amount: new Decimal("25.00") },
        { action: CoinLedgerAction.HOLD_BURNED, amount: new Decimal("-15.00") },
        {
          action: CoinLedgerAction.ADMIN_ADJUSTMENT,
          amount: new Decimal("5.00"),
        },
        {
          action: CoinLedgerAction.ADMIN_ADJUSTMENT,
          amount: new Decimal("-3.00"),
        },
        { action: CoinLedgerAction.BOOKING_EARN, amount: new Decimal("8.00") },
        {
          action: CoinLedgerAction.REFUND_CLAWBACK,
          amount: new Decimal("-8.00"),
          metadata: { requestedAmount: "8.00" },
        },
      ];

      for (const step of steps) {
        totals = applyEntryToTotals(totals, step);
        amounts.push(step.amount);
      }

      const sum = amounts.reduce((acc, a) => acc.plus(a), new Decimal(0));
      expect(totals.balance.toString()).toBe(sum.toString());
      expect(totals.balance.toString()).toBe("22");
      expect(totals.lifetimeEarned.toString()).toBe("40"); // 10 + 25 + 5 + 8 - 8 = 40
      expect(totals.lifetimeBurned.toString()).toBe("15");
    });
  });

  describe("formatLedgerDescription", () => {
    it("prefers metadata.description over other fields", () => {
      const text = formatLedgerDescription({
        action: CoinLedgerAction.BOOKING_EARN,
        amount: 15,
        metadata: {
          description: "Custom Earn Description",
          campaignName: "Test Campaign",
        },
      });
      expect(text).toBe("Custom Earn Description");
    });

    it("falls back to metadata.campaignName", () => {
      const text = formatLedgerDescription({
        action: CoinLedgerAction.BOOKING_EARN,
        amount: 15,
        metadata: {
          campaignName: "Black Friday",
        },
      });
      expect(text).toBe("Campaign Reward: Black Friday");
    });

    it("falls back to metadata.reason", () => {
      const text = formatLedgerDescription({
        action: CoinLedgerAction.ADMIN_ADJUSTMENT,
        amount: 5,
        metadata: {
          reason: "Customer Service Apology",
        },
      });
      expect(text).toBe("Customer Service Apology");
    });

    it("falls back to action-based intuitive label", () => {
      expect(
        formatLedgerDescription({
          action: CoinLedgerAction.BOOKING_EARN,
          amount: 15,
        }),
      ).toBe("Earned 15 PDC for completed booking");

      expect(
        formatLedgerDescription({
          action: CoinLedgerAction.HOLD_BURNED,
          amount: -15,
        }),
      ).toBe("Redeemed 15 PDC at Checkout");
    });
  });
});
