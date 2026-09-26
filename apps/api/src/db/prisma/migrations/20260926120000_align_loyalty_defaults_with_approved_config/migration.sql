-- Align loyalty_settings column defaults with the approved programme config.
--
-- The shipped defaults were placeholders: 1% earn, 500 PD signup, 500 PD
-- birthday, 200 PD streak at 3 visits, referrals disabled with a 0 welcome
-- bonus and a live 100 PD legacy flat referral. On NGN 50m of booking revenue
-- that runs at roughly NGN 1.5m/year against an approved NGN 385k, with the
-- referral programme switched off.
--
-- coinsPerActiveReferral is pinned to 0: it drives the legacy flat-bonus path
-- in loyalty.service.ts (gated only on `> 0`), which would pay alongside the
-- percentage award in coin.service.ts and double-pay every referral.
--
-- SET DEFAULT only. Existing rows are untouched, so this is safe to apply to a
-- live database; an already-created settings row must be changed through
-- Finance -> Loyalty in the admin portal so the change is audit-logged.

-- AlterTable
ALTER TABLE "loyalty_settings" ALTER COLUMN "coinName" SET DEFAULT 'PeeDee Coin',
ALTER COLUMN "coinSymbol" SET DEFAULT 'PD',
ALTER COLUMN "spendRatioNgn" SET DEFAULT 200.00,
ALTER COLUMN "percentageRate" SET DEFAULT 0.50,
ALTER COLUMN "isReferralRewardEnabled" SET DEFAULT true,
ALTER COLUMN "coinsPerActiveReferral" SET DEFAULT 0.00,
ALTER COLUMN "refereeWelcomeBonus" SET DEFAULT 200.00,
ALTER COLUMN "birthdayBonusCoins" SET DEFAULT 50.00,
ALTER COLUMN "streakBonusCoins" SET DEFAULT 30.00,
ALTER COLUMN "streakThresholdCount" SET DEFAULT 4,
ALTER COLUMN "signupBonusCoins" SET DEFAULT 20.00;

