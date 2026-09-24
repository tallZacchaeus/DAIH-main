import { CoinLedgerAction } from "@prisma/client";
import { LoyaltyTransactionType } from "@daih/types";
import { Decimal } from "@prisma/client/runtime/library";

export interface TotalsState {
  balance: Decimal;
  lifetimeEarned: Decimal;
  lifetimeBurned: Decimal;
}

export class InvariantViolationError extends Error {
  code = "INVARIANT_VIOLATION";
  statusCode = 500;
  constructor(message: string) {
    super(message);
    this.name = "InvariantViolationError";
  }
}

export class InvalidAmountError extends Error {
  code = "INVALID_AMOUNT";
  statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = "InvalidAmountError";
  }
}

export class IdempotencyConflictError extends Error {
  code = "IDEMPOTENCY_CONFLICT";
  statusCode = 409;
  constructor(message: string) {
    super(message);
    this.name = "IdempotencyConflictError";
  }
}

/**
 * Pure helper to round any coin amount to 2 decimal places using half-up rounding.
 * Never throws.
 */
export function roundCoinAmount(
  val: Decimal | number | string | null | undefined,
): Decimal {
  if (val == null) return new Decimal(0);
  const d = val instanceof Decimal ? val : new Decimal(val);
  return d.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

/**
 * Validates that an amount is strictly greater than or equal to 0.01 PDC.
 * Throws InvalidAmountError if invalid.
 */
export function validateCoinAmount(val: Decimal | number | string): void {
  const d = roundCoinAmount(val);
  if (d.lessThan(new Decimal("0.01"))) {
    throw new InvalidAmountError(
      `PeeDee Coin amount must be at least 0.01 PDC. Provided: ${d.toFixed(2)}`,
    );
  }
}

/**
 * Parses any Decimal/number to standard 2-decimal-place JavaScript number.
 */
export function toCoinNumber(
  val: Decimal | number | string | null | undefined,
): number {
  if (val == null) return 0;
  return roundCoinAmount(val).toNumber();
}

export const EARN_ACTIONS: ReadonlySet<CoinLedgerAction> = new Set([
  CoinLedgerAction.BOOKING_EARN,
  CoinLedgerAction.REFERRAL_BONUS,
  CoinLedgerAction.SIGNUP_BONUS,
  CoinLedgerAction.BIRTHDAY_BONUS,
  CoinLedgerAction.STREAK_BONUS,
]);

export type LedgerEligibleAction = Exclude<
  CoinLedgerAction,
  "HOLD_PLACED" | "HOLD_RELEASED"
>;

/**
 * Canonical 1-to-1 bidirectional mapping between the 10 ledger-eligible actions
 * and LoyaltyTransactionType.
 */
export const ACTION_TO_TRANSACTION_TYPE: Record<
  LedgerEligibleAction,
  LoyaltyTransactionType
> = {
  [CoinLedgerAction.BOOKING_EARN]: "TRANSACTION_REWARD",
  [CoinLedgerAction.REFERRAL_BONUS]: "ACTIVE_REFERRAL_BONUS",
  [CoinLedgerAction.SIGNUP_BONUS]: "REFEREE_WELCOME_BONUS",
  [CoinLedgerAction.BIRTHDAY_BONUS]: "BIRTHDAY_BONUS",
  [CoinLedgerAction.STREAK_BONUS]: "STREAK_BONUS",
  [CoinLedgerAction.HOLD_BURNED]: "REDEMPTION_BOOKING",
  [CoinLedgerAction.EXPIRY]: "COIN_EXPIRY",
  [CoinLedgerAction.ADMIN_ADJUSTMENT]: "ADMIN_ADJUSTMENT",
  [CoinLedgerAction.REFUND_CLAWBACK]: "REFUND_CLAWBACK",
  [CoinLedgerAction.REDEMPTION_REVERSAL]: "REDEMPTION_REVERSAL",
};

/**
 * Derived inverse mapping from LoyaltyTransactionType to CoinLedgerAction.
 */
export const TRANSACTION_TYPE_TO_ACTION: Record<
  LoyaltyTransactionType,
  LedgerEligibleAction
> = Object.fromEntries(
  Object.entries(ACTION_TO_TRANSACTION_TYPE).map(([action, type]) => [
    type,
    action as LedgerEligibleAction,
  ]),
) as Record<LoyaltyTransactionType, LedgerEligibleAction>;

/**
 * Exhaustive compile-time check helper.
 */
function assertNever(x: never): never {
  throw new InvariantViolationError(
    `Unexpected unhandled action: ${JSON.stringify(x)}`,
  );
}

/**
 * Maps a CoinLedgerAction to its user-facing LoyaltyTransactionType.
 * Throws on hold actions (which must never write to the ledger).
 */
export function mapActionToTransactionType(
  action: CoinLedgerAction,
): LoyaltyTransactionType {
  switch (action) {
    case CoinLedgerAction.BOOKING_EARN:
    case CoinLedgerAction.REFERRAL_BONUS:
    case CoinLedgerAction.SIGNUP_BONUS:
    case CoinLedgerAction.BIRTHDAY_BONUS:
    case CoinLedgerAction.STREAK_BONUS:
    case CoinLedgerAction.HOLD_BURNED:
    case CoinLedgerAction.EXPIRY:
    case CoinLedgerAction.ADMIN_ADJUSTMENT:
    case CoinLedgerAction.REFUND_CLAWBACK:
    case CoinLedgerAction.REDEMPTION_REVERSAL:
      return ACTION_TO_TRANSACTION_TYPE[action];
    case CoinLedgerAction.HOLD_PLACED:
    case CoinLedgerAction.HOLD_RELEASED:
      throw new InvariantViolationError(
        `Action ${action} is a hold lifecycle state and must never exist in coin_ledger_entries`,
      );
    default:
      return assertNever(action);
  }
}

/**
 * Maps a LoyaltyTransactionType back to its underlying CoinLedgerAction.
 */
export function mapTransactionTypeToAction(
  type: LoyaltyTransactionType,
): LedgerEligibleAction {
  const action = TRANSACTION_TYPE_TO_ACTION[type];
  if (!action) {
    throw new InvariantViolationError(
      `Unrecognized LoyaltyTransactionType: ${type}`,
    );
  }
  return action;
}

/**
 * Pure chronological fold step for computing totals from ledger entries.
 * Operates strictly with Decimal instances.
 */
export function applyEntryToTotals(
  totals: TotalsState,
  entry: {
    action: CoinLedgerAction;
    amount: Decimal;
    metadata?: any;
  },
): TotalsState {
  const amount = entry.amount;

  // 1. Signed balance addition (balance change is always signed amount)
  const nextBalance = totals.balance.plus(amount);

  let nextEarned = totals.lifetimeEarned;
  let nextBurned = totals.lifetimeBurned;

  if (
    entry.action === CoinLedgerAction.BOOKING_EARN ||
    entry.action === CoinLedgerAction.REFERRAL_BONUS ||
    entry.action === CoinLedgerAction.SIGNUP_BONUS ||
    entry.action === CoinLedgerAction.BIRTHDAY_BONUS ||
    entry.action === CoinLedgerAction.STREAK_BONUS
  ) {
    if (!amount.greaterThan(0)) {
      throw new InvariantViolationError(
        `Earn action ${entry.action} must have positive amount, got: ${amount.toFixed(2)}`,
      );
    }
    nextEarned = totals.lifetimeEarned.plus(amount);
  } else if (entry.action === CoinLedgerAction.ADMIN_ADJUSTMENT) {
    if (amount.greaterThan(0)) {
      nextEarned = totals.lifetimeEarned.plus(amount);
    }
    // Negative admin adjustment debits balance only, neither earned nor burned
  } else if (entry.action === CoinLedgerAction.HOLD_BURNED) {
    if (!amount.lessThan(0)) {
      throw new InvariantViolationError(
        `HOLD_BURNED must have negative amount, got: ${amount.toFixed(2)}`,
      );
    }
    nextBurned = totals.lifetimeBurned.plus(amount.abs());
  } else if (entry.action === CoinLedgerAction.REDEMPTION_REVERSAL) {
    if (!amount.greaterThan(0)) {
      throw new InvariantViolationError(
        `REDEMPTION_REVERSAL must have positive amount, got: ${amount.toFixed(2)}`,
      );
    }
    nextBurned = Decimal.max(0, totals.lifetimeBurned.minus(amount));
  } else if (entry.action === CoinLedgerAction.REFUND_CLAWBACK) {
    if (amount.greaterThan(0)) {
      throw new InvariantViolationError(
        `REFUND_CLAWBACK must have non-positive amount, got: ${amount.toFixed(2)}`,
      );
    }
    // Tier credit reduction: reduce lifetimeEarned by requestedAmount (closing tier credit loophole)
    const rawRequested = entry.metadata?.requestedAmount;
    const requested =
      rawRequested != null ? new Decimal(rawRequested) : amount.abs();

    if (requested.lessThan(amount.abs())) {
      throw new InvariantViolationError(
        `Corrupt metadata: requestedAmount (${requested.toFixed(2)}) cannot be less than clawback amount (${amount.abs().toFixed(2)})`,
      );
    }

    nextEarned = Decimal.max(0, totals.lifetimeEarned.minus(requested));
  } else if (entry.action === CoinLedgerAction.EXPIRY) {
    if (!amount.lessThan(0)) {
      throw new InvariantViolationError(
        `EXPIRY must have negative amount, got: ${amount.toFixed(2)}`,
      );
    }
    // Expiry debits balance only, neither earned nor burned
  } else if (
    entry.action === CoinLedgerAction.HOLD_PLACED ||
    entry.action === CoinLedgerAction.HOLD_RELEASED
  ) {
    throw new InvariantViolationError(
      `Hold action ${entry.action} must never appear in coin_ledger_entries`,
    );
  } else {
    assertNever(entry.action);
  }

  return {
    balance: nextBalance,
    lifetimeEarned: nextEarned,
    lifetimeBurned: nextBurned,
  };
}

/**
 * Formats a user-friendly description for a ledger entry.
 */
export function formatLedgerDescription(entry: {
  description?: string | null;
  metadata?: any;
  action: CoinLedgerAction;
  amount: Decimal | number;
}): string {
  if (entry.metadata?.description) {
    return String(entry.metadata.description);
  }
  if (entry.description) {
    return String(entry.description);
  }
  if (entry.metadata?.campaignName) {
    return `Campaign Reward: ${entry.metadata.campaignName}`;
  }
  if (entry.metadata?.reason) {
    return String(entry.metadata.reason);
  }
  if (entry.metadata?.justification) {
    return String(entry.metadata.justification);
  }

  const amtNum = Math.abs(toCoinNumber(entry.amount));
  switch (entry.action) {
    case CoinLedgerAction.BOOKING_EARN:
      return `Earned ${amtNum} PDC for completed booking`;
    case CoinLedgerAction.REFERRAL_BONUS:
      return `Referral Bonus: ${amtNum} PDC`;
    case CoinLedgerAction.SIGNUP_BONUS:
      return `Welcome Gift: ${amtNum} PDC`;
    case CoinLedgerAction.BIRTHDAY_BONUS:
      return `Birthday Gift: ${amtNum} PDC`;
    case CoinLedgerAction.STREAK_BONUS:
      return `Booking Streak Reward: ${amtNum} PDC`;
    case CoinLedgerAction.HOLD_BURNED:
      return `Redeemed ${amtNum} PDC at Checkout`;
    case CoinLedgerAction.EXPIRY:
      return `Expired ${amtNum} PDC`;
    case CoinLedgerAction.REFUND_CLAWBACK:
      return `Refund Clawback: ${amtNum} PDC`;
    case CoinLedgerAction.REDEMPTION_REVERSAL:
      return `Redemption Reversal: ${amtNum} PDC`;
    case CoinLedgerAction.ADMIN_ADJUSTMENT:
      return `Manual Adjustment: ${amtNum} PDC`;
    default:
      return `${entry.action}: ${amtNum} PDC`;
  }
}
