-- DropForeignKey
ALTER TABLE "loyalty_transactions" DROP CONSTRAINT "loyalty_transactions_userId_fkey";

-- DropForeignKey
ALTER TABLE "loyalty_transactions" DROP CONSTRAINT "loyalty_transactions_walletId_fkey";

-- DropForeignKey
ALTER TABLE "loyalty_wallets" DROP CONSTRAINT "loyalty_wallets_userId_fkey";

-- DropTable
DROP TABLE "loyalty_transactions";

-- DropTable
DROP TABLE "loyalty_wallets";

-- DropEnum
DROP TYPE "LoyaltyTransactionType";

-- Add non-negative check constraints on coin_balances
ALTER TABLE "coin_balances" ADD CONSTRAINT "coin_balances_balance_non_negative" CHECK ("balance" >= 0);
ALTER TABLE "coin_balances" ADD CONSTRAINT "coin_balances_earned_non_negative" CHECK ("lifetimeEarned" >= 0);
ALTER TABLE "coin_balances" ADD CONSTRAINT "coin_balances_burned_non_negative" CHECK ("lifetimeBurned" >= 0);
