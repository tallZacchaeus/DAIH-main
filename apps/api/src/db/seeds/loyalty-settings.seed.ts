import { prisma } from "../../db/client.js";
import { redis } from "../../config/redis.js";

const SETTINGS_CACHE_KEY = "daih:loyalty_settings";

/**
 * Approved PeeDee Coin programme configuration.
 *
 * These are the values signed off by the Product Owner and Finance. They
 * deliberately differ from the column defaults in `loyalty_settings`, which
 * are placeholder values and roughly 4x more expensive to run.
 *
 * Reference: docs/07-PeeDee-Build-Spec.md
 */
export const APPROVED_LOYALTY_SETTINGS = {
  isProgramActive: true,
  coinName: "PeeDee Coin",
  coinSymbol: "PD",

  // Earning: 1 PD per NGN 200 spent = 0.5% back.
  isTransactionRewardEnabled: true,
  formulaMode: "SPEND_RATIO" as const,
  spendRatioNgn: 200,
  percentageRate: 0.5,
  fixedAmountCoins: 50,
  minSpendThreshold: 500,
  maxCoinsPerTransaction: null,

  // Referral: percentage of referee spend over a 90-day window.
  //
  // coinsPerActiveReferral MUST stay 0. It drives the legacy flat-bonus path
  // in loyalty.service.ts, which is gated only on `> 0` and would pay out
  // alongside the percentage award in coin.service.ts — double-paying every
  // referral. The percentage path is the one that honours floor and cap.
  isReferralRewardEnabled: true,
  coinsPerActiveReferral: 0,
  referralRewardPercent: 5,
  referralFloorCoins: 50,
  referralCapCoins: 1000,
  referralWindowDays: 90,
  refereeWelcomeBonus: 200,

  // Redemption: 1 PD = NGN 1, up to half of any booking.
  isRedemptionEnabled: true,
  redemptionRateCoins: 100,
  redemptionRateNgn: 100,
  minCoinsToRedeem: 100,
  maxDiscountPercent: 50,

  // Fixed bonuses.
  isSignupBonusEnabled: true,
  signupBonusCoins: 20,
  isBirthdayBonusEnabled: true,
  birthdayBonusCoins: 50,
  isStreakBonusEnabled: true,
  streakBonusCoins: 30,
  streakThresholdCount: 4,
  streakWindowDays: 30,

  // Lifecycle and risk controls.
  isExpiryEnabled: true,
  expiryMonths: 12,
  dailyAdjustmentLimitCoins: 20000,
  holdExpiryMinutes: 15,
};

/**
 * Writes the approved loyalty configuration.
 *
 * Creates the row when absent. When it already exists the row is left alone
 * unless `force` is set, so a redeploy never silently reverts tuning an
 * administrator has done in the portal.
 */
export async function seedLoyaltySettings(force = false) {
  const existing = await prisma.loyaltySetting.findUnique({
    where: { id: "default" },
  });

  if (existing && !force) {
    console.log(
      "• Loyalty settings already exist — left unchanged. Re-run with --force to overwrite.",
    );
    return;
  }

  await prisma.loyaltySetting.upsert({
    where: { id: "default" },
    create: { id: "default", ...APPROVED_LOYALTY_SETTINGS },
    update: { ...APPROVED_LOYALTY_SETTINGS, updatedBy: "seed" },
  });

  // The settings row is Redis-cached; a stale cache would mask this write.
  try {
    if (redis) await redis.del(SETTINGS_CACHE_KEY);
  } catch {}

  console.log(
    `${existing ? "✓ Overwrote" : "✓ Seeded"} loyalty settings: 1 PD = NGN 1 · earn 1 PD per NGN 200 (0.5%) · referral 5% / 90d / floor 50 / cap 1000 · redeem max 50% · expiry 12 months.`,
  );
}

if (
  process.argv[1]?.endsWith("loyalty-settings.seed.ts") ||
  process.argv[1]?.endsWith("loyalty-settings.seed.js")
) {
  seedLoyaltySettings(process.argv.includes("--force"))
    .catch(console.error)
    .finally(() => process.exit(0));
}
