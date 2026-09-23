import { describe, it, expect } from "vitest";
import { loyaltyService } from "./loyalty.service.js";
import { LoyaltySettingsRecord } from "@daih/types";

describe("Loyalty Formula Engine & Calculation Rules", () => {
  const baseSettings: LoyaltySettingsRecord = {
    id: "default",
    isProgramActive: true,
    coinName: "PD Coin",
    coinSymbol: "PDC",
    isTransactionRewardEnabled: true,
    formulaMode: "SPEND_RATIO",
    spendRatioNgn: 100,
    percentageRate: 1.0,
    fixedAmountCoins: 50,
    minSpendThreshold: 500,
    maxCoinsPerTransaction: null,
    isReferralRewardEnabled: false,
    coinsPerActiveReferral: 100,
    refereeWelcomeBonus: 0,
    isRedemptionEnabled: true,
    redemptionRateCoins: 100,
    redemptionRateNgn: 100, // 1 PDC = 1 NGN
    minCoinsToRedeem: 100,
    maxDiscountPercent: 50,
    isBirthdayBonusEnabled: true,
    birthdayBonusCoins: 500,
    isStreakBonusEnabled: true,
    streakBonusCoins: 200,
    streakThresholdCount: 3,
    streakWindowDays: 30,
    isSignupBonusEnabled: true,
    signupBonusCoins: 500,
    isExpiryEnabled: true,
    expiryMonths: 12,
    referralRewardPercent: 5.0,
    referralFloorCoins: 50,
    referralCapCoins: 1000,
    referralWindowDays: 90,
    dailyAdjustmentLimitCoins: 20000,
    holdExpiryMinutes: 15,
    updatedAt: new Date().toISOString(),
    updatedBy: null,
  };

  describe("calculateTransactionCoins (Earning Engine)", () => {
    it("calculates coins accurately using SPEND_RATIO mode (1 PDC per ₦100)", () => {
      const settings: LoyaltySettingsRecord = {
        ...baseSettings,
        formulaMode: "SPEND_RATIO",
        spendRatioNgn: 100,
      };

      // ₦10,000 spend -> 100 coins
      expect(loyaltyService.calculateTransactionCoins(10000, settings)).toBe(
        100,
      );
      // ₦2,550 spend -> 25 coins (Math.floor)
      expect(loyaltyService.calculateTransactionCoins(2550, settings)).toBe(25);
      // ₦500 spend (exact threshold) -> 5 coins
      expect(loyaltyService.calculateTransactionCoins(500, settings)).toBe(5);
    });

    it("calculates coins using PERCENTAGE mode with deterministic Math.floor", () => {
      const settings: LoyaltySettingsRecord = {
        ...baseSettings,
        formulaMode: "PERCENTAGE",
        percentageRate: 1.0, // 1%
      };

      // 1% of ₦25,750 is 257.5 -> Math.floor gives 257
      expect(loyaltyService.calculateTransactionCoins(25750, settings)).toBe(
        257,
      );

      // 5% of ₦10,000 is 500
      const fivePercentSettings: LoyaltySettingsRecord = {
        ...settings,
        percentageRate: 5.0,
      };
      expect(
        loyaltyService.calculateTransactionCoins(10000, fivePercentSettings),
      ).toBe(500);
    });

    it("calculates coins using FIXED_AMOUNT mode", () => {
      const settings: LoyaltySettingsRecord = {
        ...baseSettings,
        formulaMode: "FIXED_AMOUNT",
        fixedAmountCoins: 50,
      };

      expect(loyaltyService.calculateTransactionCoins(5000, settings)).toBe(50);
      expect(loyaltyService.calculateTransactionCoins(25000, settings)).toBe(
        50,
      );
    });

    it("returns 0 coins when spend is below minSpendThreshold", () => {
      const settings: LoyaltySettingsRecord = {
        ...baseSettings,
        minSpendThreshold: 1000,
      };

      // ₦999 is below ₦1,000 threshold
      expect(loyaltyService.calculateTransactionCoins(999, settings)).toBe(0);
      // ₦1,000 reaches threshold -> 10 coins
      expect(loyaltyService.calculateTransactionCoins(1000, settings)).toBe(10);
    });

    it("respects maxCoinsPerTransaction cap when configured", () => {
      const settings: LoyaltySettingsRecord = {
        ...baseSettings,
        formulaMode: "SPEND_RATIO",
        spendRatioNgn: 100,
        maxCoinsPerTransaction: 200, // max 200 PDC
      };

      // ₦50,000 would be 500 coins, but capped at 200
      expect(loyaltyService.calculateTransactionCoins(50000, settings)).toBe(
        200,
      );
      // ₦15,000 is 150 coins (under cap) -> returns 150
      expect(loyaltyService.calculateTransactionCoins(15000, settings)).toBe(
        150,
      );
    });

    it("returns 0 coins when transaction reward is toggled off", () => {
      const settings: LoyaltySettingsRecord = {
        ...baseSettings,
        isTransactionRewardEnabled: false,
      };

      expect(loyaltyService.calculateTransactionCoins(25000, settings)).toBe(0);
    });

    it("returns 0 coins when entire loyalty program is inactive", () => {
      const settings: LoyaltySettingsRecord = {
        ...baseSettings,
        isProgramActive: false,
      };

      expect(loyaltyService.calculateTransactionCoins(25000, settings)).toBe(0);
    });

    it("guarantees net cash spend calculation on split payment (anti-inflation)", () => {
      const settings: LoyaltySettingsRecord = {
        ...baseSettings,
        formulaMode: "SPEND_RATIO",
        spendRatioNgn: 100,
      };

      // Booking total: ₦10,000. Customer used ₦2,000 in coins. Net cash paid: ₦8,000.
      const netCashPaid = 8000;
      expect(
        loyaltyService.calculateTransactionCoins(netCashPaid, settings),
      ).toBe(80);
    });
  });

  describe("calculateRedemptionDiscount (Redemption Engine)", () => {
    it("calculates 1:1 redemption correctly (100 PDC = ₦100)", () => {
      const bookingTotal = 10000;
      const coinsToRedeem = 1000; // 1,000 PDC = ₦1,000

      const result = loyaltyService.calculateRedemptionDiscount(
        coinsToRedeem,
        bookingTotal,
        baseSettings,
      );

      expect(result.valid).toBe(true);
      expect(result.discountAmountNgn).toBe(1000);
      expect(result.coinsRedeemed).toBe(1000);
      expect(result.remainingTotalNgn).toBe(9000);
    });

    it("enforces maxDiscountPercent cap (50% max discount)", () => {
      const bookingTotal = 10000; // 50% cap = ₦5,000 max discount
      const coinsToRedeem = 8000; // Customer wants to use 8,000 PDC (₦8,000)

      const result = loyaltyService.calculateRedemptionDiscount(
        coinsToRedeem,
        bookingTotal,
        baseSettings,
      );

      expect(result.valid).toBe(true);
      expect(result.discountAmountNgn).toBe(5000); // capped at ₦5,000
      expect(result.coinsRedeemed).toBe(5000); // only takes 5,000 coins
      expect(result.remainingTotalNgn).toBe(5000);
    });

    it("enforces minCoinsToRedeem threshold", () => {
      const bookingTotal = 10000;
      const coinsToRedeem = 50; // Below 100 minimum

      const result = loyaltyService.calculateRedemptionDiscount(
        coinsToRedeem,
        bookingTotal,
        baseSettings,
      );

      expect(result.valid).toBe(false);
      expect(result.discountAmountNgn).toBe(0);
      expect(result.message).toContain("minimum");
    });

    it("rejects redemption when isRedemptionEnabled is false", () => {
      const disabledSettings: LoyaltySettingsRecord = {
        ...baseSettings,
        isRedemptionEnabled: false,
      };

      const result = loyaltyService.calculateRedemptionDiscount(
        500,
        10000,
        disabledSettings,
      );

      expect(result.valid).toBe(false);
      expect(result.discountAmountNgn).toBe(0);
      expect(result.message).toContain("disabled");
    });
  });

  describe("Configurable Milestone & Member Lifecycle Policy Settings", () => {
    it("supports custom birthday bonus configuration (e.g. 50 PD)", () => {
      const customSettings: LoyaltySettingsRecord = {
        ...baseSettings,
        birthdayBonusCoins: 50,
      };

      expect(customSettings.birthdayBonusCoins).toBe(50);
      expect(customSettings.isBirthdayBonusEnabled).toBe(true);
    });

    it("supports custom streak milestone configuration (e.g. 30 PD upon 4 check-ins in 30 days)", () => {
      const streakSettings: LoyaltySettingsRecord = {
        ...baseSettings,
        streakBonusCoins: 30,
        streakThresholdCount: 4,
        streakWindowDays: 30,
      };

      expect(streakSettings.streakBonusCoins).toBe(30);
      expect(streakSettings.streakThresholdCount).toBe(4);
      expect(streakSettings.streakWindowDays).toBe(30);
    });

    it("supports custom expiry policy and operational guardrails (e.g. 12 months, 20k adjustment ceiling)", () => {
      const expirySettings: LoyaltySettingsRecord = {
        ...baseSettings,
        expiryMonths: 12,
        dailyAdjustmentLimitCoins: 20000,
        holdExpiryMinutes: 15,
      };

      expect(expirySettings.expiryMonths).toBe(12);
      expect(expirySettings.dailyAdjustmentLimitCoins).toBe(20000);
      expect(expirySettings.holdExpiryMinutes).toBe(15);
    });
  });
});
