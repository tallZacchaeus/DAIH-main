import { z } from "zod";

export const UpdateLoyaltySettingsSchema = z.object({
  isProgramActive: z.boolean().optional(),
  coinName: z.string().trim().min(1).max(50).optional(),
  coinSymbol: z.string().trim().min(1).max(10).optional(),
  isTransactionRewardEnabled: z.boolean().optional(),
  formulaMode: z.enum(["SPEND_RATIO", "PERCENTAGE", "FIXED_AMOUNT"]).optional(),
  spendRatioNgn: z.coerce
    .number()
    .positive("Spend ratio must be greater than 0")
    .optional(),
  percentageRate: z.coerce
    .number()
    .min(0)
    .max(100, "Percentage rate cannot exceed 100%")
    .optional(),
  fixedAmountCoins: z.coerce
    .number()
    .min(0, "Fixed coins cannot be negative")
    .optional(),
  minSpendThreshold: z.coerce
    .number()
    .min(0, "Minimum spend cannot be negative")
    .optional(),
  maxCoinsPerTransaction: z.coerce.number().positive().nullable().optional(),
  isReferralRewardEnabled: z.boolean().optional(),
  coinsPerActiveReferral: z.coerce
    .number()
    .min(0, "Referral reward cannot be negative")
    .optional(),
  refereeWelcomeBonus: z.coerce
    .number()
    .min(0, "Referee welcome bonus cannot be negative")
    .optional(),
  referralRewardPercent: z.coerce
    .number()
    .min(0)
    .max(100, "Referral percentage must be between 0 and 100")
    .optional(),
  referralFloorCoins: z.coerce
    .number()
    .min(0, "Referral floor coins cannot be negative")
    .optional(),
  referralCapCoins: z.coerce
    .number()
    .min(0, "Referral cap coins cannot be negative")
    .optional(),
  referralWindowDays: z.coerce
    .number()
    .int()
    .positive("Referral window must be at least 1 day")
    .optional(),
  isRedemptionEnabled: z.boolean().optional(),
  redemptionRateCoins: z.coerce
    .number()
    .positive("Redemption coins rate must be greater than 0")
    .optional(),
  redemptionRateNgn: z.coerce
    .number()
    .positive("Redemption NGN rate must be greater than 0")
    .optional(),
  minCoinsToRedeem: z.coerce
    .number()
    .min(0, "Minimum redemption coins cannot be negative")
    .optional(),
  maxDiscountPercent: z.coerce
    .number()
    .min(1)
    .max(100, "Max discount percent must be between 1 and 100")
    .optional(),
  // Extended milestone & lifecycle validation
  isBirthdayBonusEnabled: z.boolean().optional(),
  birthdayBonusCoins: z.coerce
    .number()
    .min(0, "Birthday bonus cannot be negative")
    .optional(),
  isStreakBonusEnabled: z.boolean().optional(),
  streakBonusCoins: z.coerce
    .number()
    .min(0, "Streak bonus cannot be negative")
    .optional(),
  streakThresholdCount: z.coerce
    .number()
    .int()
    .min(1, "Streak threshold must be at least 1")
    .optional(),
  streakWindowDays: z.coerce
    .number()
    .int()
    .min(1, "Streak window must be at least 1 day")
    .optional(),
  isSignupBonusEnabled: z.boolean().optional(),
  signupBonusCoins: z.coerce
    .number()
    .min(0, "Signup bonus cannot be negative")
    .optional(),
  isExpiryEnabled: z.boolean().optional(),
  expiryMonths: z.coerce
    .number()
    .int()
    .min(1, "Expiry period must be at least 1 month")
    .max(120)
    .optional(),
  dailyAdjustmentLimitCoins: z.coerce
    .number()
    .positive("Daily adjustment limit must be positive")
    .optional(),
  holdExpiryMinutes: z.coerce
    .number()
    .int()
    .min(1, "Hold expiry must be at least 1 minute")
    .max(1440)
    .optional(),
});

import { CoinAdjustmentReasonCode } from "@daih/types";

export const AdminManualAdjustmentSchema = z.object({
  targetUserId: z.string().uuid("Target User ID must be a valid UUID"),
  amount: z.coerce
    .number()
    .refine((val) => val !== 0, "Adjustment amount cannot be zero"),
  reasonCode: z.nativeEnum(CoinAdjustmentReasonCode, {
    errorMap: () => ({
      message:
        "Reason code must be one of GOODWILL, SYSTEM_ERROR, DISPUTE_RESOLUTION, PROMOTIONAL, CORRECTION",
    }),
  }),
  justification: z
    .string()
    .trim()
    .min(20, "Justification must be at least 20 characters")
    .max(1000),
  note: z.string().trim().max(1000).optional(),
  reason: z.string().trim().optional(),
});

export const RedemptionPreviewSchema = z.object({
  bookingId: z.string().uuid("Booking ID must be a valid UUID"),
  coinsToRedeem: z.coerce.number().min(0, "Coins to redeem cannot be negative"),
});

export const LoyaltyLedgerQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  type: z.string().optional(),
});

export const CustomerIdParamSchema = z.object({
  customerId: z.string().uuid("Customer ID must be a valid UUID"),
});
