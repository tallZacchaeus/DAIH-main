export type LoyaltyFormulaMode = "SPEND_RATIO" | "PERCENTAGE" | "FIXED_AMOUNT";

export type LoyaltyTransactionType =
  | "TRANSACTION_REWARD"
  | "ACTIVE_REFERRAL_BONUS"
  | "REFEREE_WELCOME_BONUS"
  | "REDEMPTION_BOOKING"
  | "ADMIN_ADJUSTMENT"
  | "REFUND_CLAWBACK";

export interface LoyaltyWalletDTO {
  id: string;
  userId: string;
  balance: number;
  reservedCoins: number;
  availableBalance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  equivalentNgnValue: number;
  coinSymbol: string;
  coinName: string;
  tier?: "BRONZE" | "SILVER" | "GOLD";
  tierMultiplier?: number;
}

export interface LoyaltyTransactionDTO {
  id: string;
  walletId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  userClientId?: string;
  amount: number;
  balanceAfter: number;
  type: LoyaltyTransactionType;
  referenceId: string;
  referenceType: string;
  description: string;
  metadata?: Record<string, any> | null;
  createdAt: string;
}

export interface LoyaltyLedgerListResponse {
  items: LoyaltyTransactionDTO[];
  total: number;
  page: number;
  limit: number;
}

export interface LoyaltySettingsRecord {
  id: string;
  isProgramActive: boolean;
  coinName: string;
  coinSymbol: string;
  isTransactionRewardEnabled: boolean;
  formulaMode: LoyaltyFormulaMode;
  spendRatioNgn: number;
  percentageRate: number;
  fixedAmountCoins: number;
  minSpendThreshold: number;
  maxCoinsPerTransaction: number | null;
  isReferralRewardEnabled: boolean;
  coinsPerActiveReferral: number;
  refereeWelcomeBonus: number;
  isRedemptionEnabled: boolean;
  redemptionRateCoins: number;
  redemptionRateNgn: number;
  minCoinsToRedeem: number;
  maxDiscountPercent: number;
  // Extended milestone & lifecycle settings
  isBirthdayBonusEnabled: boolean;
  birthdayBonusCoins: number;
  isStreakBonusEnabled: boolean;
  streakBonusCoins: number;
  streakThresholdCount: number;
  streakWindowDays: number;
  isSignupBonusEnabled: boolean;
  signupBonusCoins: number;
  isExpiryEnabled: boolean;
  expiryMonths: number;
  referralRewardPercent: number;
  referralFloorCoins: number;
  referralCapCoins: number;
  referralWindowDays: number;
  dailyAdjustmentLimitCoins: number;
  holdExpiryMinutes: number;
  updatedAt: string;
  updatedBy?: string | null;
}

export interface UpdateLoyaltySettingsDTO {
  isProgramActive?: boolean;
  coinName?: string;
  coinSymbol?: string;
  isTransactionRewardEnabled?: boolean;
  formulaMode?: LoyaltyFormulaMode;
  spendRatioNgn?: number;
  percentageRate?: number;
  fixedAmountCoins?: number;
  minSpendThreshold?: number;
  maxCoinsPerTransaction?: number | null;
  isReferralRewardEnabled?: boolean;
  coinsPerActiveReferral?: number;
  refereeWelcomeBonus?: number;
  referralRewardPercent?: number;
  referralFloorCoins?: number;
  referralCapCoins?: number;
  referralWindowDays?: number;
  isRedemptionEnabled?: boolean;
  redemptionRateCoins?: number;
  redemptionRateNgn?: number;
  minCoinsToRedeem?: number;
  maxDiscountPercent?: number;
  // Extended milestone & lifecycle settings
  isBirthdayBonusEnabled?: boolean;
  birthdayBonusCoins?: number;
  isStreakBonusEnabled?: boolean;
  streakBonusCoins?: number;
  streakThresholdCount?: number;
  streakWindowDays?: number;
  isSignupBonusEnabled?: boolean;
  signupBonusCoins?: number;
  isExpiryEnabled?: boolean;
  expiryMonths?: number;
  dailyAdjustmentLimitCoins?: number;
  holdExpiryMinutes?: number;
}

export interface AdminLoyaltyStatsDTO {
  totalCirculationCoins: number;
  totalCirculationNgn: number;
  lifetimeCoinsEarned: number;
  lifetimeCoinsRedeemed: number;
  activeEarnersCount: number;
  totalTransactionsCount: number;
  redemptionRateNgnPerCoin: number;
}

export enum CoinAdjustmentReasonCode {
  GOODWILL = "GOODWILL",
  SYSTEM_ERROR = "SYSTEM_ERROR",
  DISPUTE_RESOLUTION = "DISPUTE_RESOLUTION",
  PROMOTIONAL = "PROMOTIONAL",
  CORRECTION = "CORRECTION",
}

export interface AdminManualAdjustmentDTO {
  targetUserId: string;
  amount: number;
  reasonCode: CoinAdjustmentReasonCode;
  justification: string;
  note?: string;
  reason?: string; // backward compat fallback
}

export interface RedemptionPreviewRequestDTO {
  bookingId: string;
  coinsToRedeem: number;
}

export interface RedemptionPreviewResponseDTO {
  valid: boolean;
  discountAmountNgn: number;
  coinsRedeemed: number;
  remainingTotalNgn: number;
  message?: string;
}

export interface LoyaltySettingsAuditDTO {
  id: string;
  userId?: string | null;
  userName?: string | null;
  action: string;
  metadata: any;
  createdAt: string;
}
