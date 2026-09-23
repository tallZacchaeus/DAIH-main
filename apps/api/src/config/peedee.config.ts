import { Decimal } from "@prisma/client/runtime/library";

/**
 * PeeDee Coin (PD) System Configuration & Financial Parameters
 * All rates, ceilings, and rules specified in the PeeDee Build Specification.
 */
export const PEEDEE_CONFIG = {
  /** 1 PeeDee Coin = ₦1.00 */
  NAIRA_PER_COIN: new Decimal(1.0),

  /** 5% of final settled booking amount earned back as PeeDee Coins */
  BOOKING_EARN_RATE: new Decimal(0.05),

  /** 500 PD welcome bonus upon successful sign-up and verified profile */
  SIGNUP_BONUS_PD: new Decimal(500),

  /** 500 PD birthday bonus granted once per calendar year on member's birthday */
  BIRTHDAY_BONUS_PD: new Decimal(500),

  /** 200 PD streak bonus awarded upon achieving 3 consecutive months of paid bookings */
  STREAK_BONUS_PD: new Decimal(200),
  STREAK_MONTHS_THRESHOLD: 3,

  /** Referral parameters: 5% of referee's first booking, floor 50 PD, cap 1,000 PD, 90-day window */
  REFERRAL_PERCENT_REWARD: new Decimal(0.05),
  REFERRAL_MIN_COINS_FLOOR: new Decimal(50),
  REFERRAL_MAX_COINS_CAP: new Decimal(1000),
  REFERRAL_WINDOW_DAYS: 90,
  REFEREE_WELCOME_BONUS_PD: new Decimal(200),

  /** Checkout redemption parameters: minimum 100 PD, up to 50% of pre-coupon amount */
  MIN_REDEMPTION_PD: new Decimal(100),
  MAX_REDEMPTION_PERCENT: new Decimal(0.5),

  /** Hold expiry duration during active checkout checkout lock */
  HOLD_EXPIRY_MINUTES: 15,

  /** Member tier thresholds and multipliers (booking check-in earnings only) */
  TIERS: {
    BRONZE: {
      name: "BRONZE" as const,
      minLifetimeEarned: 0,
      maxLifetimeEarned: 249,
      bookingMultiplier: 1.0,
    },
    SILVER: {
      name: "SILVER" as const,
      minLifetimeEarned: 250,
      maxLifetimeEarned: 999,
      bookingMultiplier: 1.25,
    },
    GOLD: {
      name: "GOLD" as const,
      minLifetimeEarned: 1000,
      maxLifetimeEarned: null,
      bookingMultiplier: 1.5,
    },
  },

  /** Inactivity expiry window: 12 months with no earn or burn activity */
  EXPIRY_INACTIVITY_MONTHS: 12,

  /** Single manual adjustment limit per transaction (above 5,000 PD requires SUPER_ADMIN) */
  MANUAL_ADJUSTMENT_TRANSACTION_LIMIT_PD: new Decimal(5000),

  /** Daily manual adjustment limit per Finance Operator / Administrator */
  DAILY_OPERATOR_ADJUSTMENT_LIMIT_PD: new Decimal(20000),

  /** Campaign budget threshold requiring OPERATIONS_ADMIN or SUPER_ADMIN approval */
  CAMPAIGN_BUDGET_APPROVAL_THRESHOLD_NGN: new Decimal(50000),

  /** Monthly frequency cap for discretionary marketing messages per customer */
  CAMPAIGN_MONTHLY_FREQUENCY_CAP: 4,

  /** Quiet hours window in West Africa Time (WAT / UTC+1) */
  QUIET_HOURS: {
    START_HOUR: 21, // 21:00 WAT (9:00 PM)
    END_HOUR: 8, // 08:00 WAT (8:00 AM)
    DEFERRED_MINUTE: 5, // Scheduled for 08:05 WAT
  },

  /** Discretionary marketing holdout percentage for Lift Analytics */
  HOLDOUT_PERCENT: 10,
} as const;

export type MemberTierName = "BRONZE" | "SILVER" | "GOLD";

export interface MemberTierInfo {
  tier: MemberTierName;
  multiplier: number;
  minLifetimeEarned: number;
  maxLifetimeEarned: number | null;
}

/**
 * Resolves member tier and booking multiplier based on lifetime earned PeeDee Coins.
 * Bronze: 0–249 PD (1.0x)
 * Silver: 250–999 PD (1.25x)
 * Gold: 1,000+ PD (1.5x)
 */
export function getMemberTier(
  lifetimeEarned: number | Decimal,
): MemberTierInfo {
  const earned =
    typeof lifetimeEarned === "number"
      ? lifetimeEarned
      : Number(lifetimeEarned);
  if (earned >= PEEDEE_CONFIG.TIERS.GOLD.minLifetimeEarned) {
    return {
      tier: "GOLD",
      multiplier: PEEDEE_CONFIG.TIERS.GOLD.bookingMultiplier,
      minLifetimeEarned: PEEDEE_CONFIG.TIERS.GOLD.minLifetimeEarned,
      maxLifetimeEarned: null,
    };
  }
  if (earned >= PEEDEE_CONFIG.TIERS.SILVER.minLifetimeEarned) {
    return {
      tier: "SILVER",
      multiplier: PEEDEE_CONFIG.TIERS.SILVER.bookingMultiplier,
      minLifetimeEarned: PEEDEE_CONFIG.TIERS.SILVER.minLifetimeEarned,
      maxLifetimeEarned: PEEDEE_CONFIG.TIERS.SILVER.maxLifetimeEarned,
    };
  }
  return {
    tier: "BRONZE",
    multiplier: PEEDEE_CONFIG.TIERS.BRONZE.bookingMultiplier,
    minLifetimeEarned: PEEDEE_CONFIG.TIERS.BRONZE.minLifetimeEarned,
    maxLifetimeEarned: PEEDEE_CONFIG.TIERS.BRONZE.maxLifetimeEarned,
  };
}

/** Feature Flags governing progressive rollout */
export const FEATURE_FLAGS = {
  FEATURE_GOOGLE_AUTH: true,
  FEATURE_COIN_EARNING: true,
  FEATURE_COIN_REDEMPTION: true,
  FEATURE_CAMPAIGNS: true,
  FEATURE_CAMPAIGN_AI: true,
} as const;
