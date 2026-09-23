-- CreateEnum
CREATE TYPE "CoinLedgerAction" AS ENUM ('BOOKING_EARN', 'REFERRAL_BONUS', 'SIGNUP_BONUS', 'BIRTHDAY_BONUS', 'STREAK_BONUS', 'HOLD_PLACED', 'HOLD_RELEASED', 'HOLD_BURNED', 'EXPIRY', 'ADMIN_ADJUSTMENT', 'REFUND_CLAWBACK', 'REDEMPTION_REVERSAL');

-- CreateEnum
CREATE TYPE "HoldStatus" AS ENUM ('ACTIVE', 'BURNED', 'RELEASED');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'INFO_REQUESTED', 'APPROVED', 'REJECTED', 'PROCESSED', 'FAILED');

-- CreateEnum
CREATE TYPE "RefundReasonCode" AS ENUM ('FACILITY_ISSUE', 'SERVICE_FAILURE', 'DUPLICATE_PAYMENT', 'UNAVAILABLE_RESOURCE', 'CUSTOMER_DISPUTE', 'OTHER');

-- CreateTable
CREATE TABLE "coin_balances" (
    "userId" TEXT NOT NULL,
    "balance" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "lifetimeEarned" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "lifetimeBurned" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "lastEarnedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coin_balances_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "coin_ledger_entries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" "CoinLedgerAction" NOT NULL,
    "amount" DECIMAL(12,4) NOT NULL,
    "balanceAfter" DECIMAL(12,4) NOT NULL,
    "referenceType" TEXT NOT NULL,
    "referenceId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coin_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coin_holds" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "amount" DECIMAL(12,4) NOT NULL,
    "nairaValue" DECIMAL(12,2) NOT NULL,
    "status" "HoldStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coin_holds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refund_requests" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "transactionId" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "coinsToReverse" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "coinsToClawback" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "referralCoinsToClawback" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "referrerId" TEXT,
    "reasonCode" "RefundReasonCode" NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "requestedByUserId" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "infoRequested" TEXT,
    "infoProvided" TEXT,
    "paystackRefundId" TEXT,
    "gatewayReference" TEXT,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refund_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "coin_balances_balance_idx" ON "coin_balances"("balance");

-- CreateIndex
CREATE INDEX "coin_balances_lifetimeEarned_idx" ON "coin_balances"("lifetimeEarned");

-- CreateIndex
CREATE UNIQUE INDEX "coin_ledger_entries_idempotencyKey_key" ON "coin_ledger_entries"("idempotencyKey");

-- CreateIndex
CREATE INDEX "coin_ledger_entries_userId_createdAt_idx" ON "coin_ledger_entries"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "coin_ledger_entries_action_createdAt_idx" ON "coin_ledger_entries"("action", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "coin_holds_bookingId_key" ON "coin_holds"("bookingId");

-- CreateIndex
CREATE INDEX "coin_holds_userId_status_idx" ON "coin_holds"("userId", "status");

-- CreateIndex
CREATE INDEX "coin_holds_status_expiresAt_idx" ON "coin_holds"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "refund_requests_bookingId_key" ON "refund_requests"("bookingId");

-- CreateIndex
CREATE INDEX "refund_requests_status_requestedAt_idx" ON "refund_requests"("status", "requestedAt");

-- CreateIndex
CREATE INDEX "refund_requests_bookingId_idx" ON "refund_requests"("bookingId");

-- CreateIndex
CREATE INDEX "refund_requests_requestedByUserId_idx" ON "refund_requests"("requestedByUserId");

-- CreateIndex
CREATE INDEX "refund_requests_reviewedByUserId_idx" ON "refund_requests"("reviewedByUserId");

-- AddForeignKey
ALTER TABLE "coin_balances" ADD CONSTRAINT "coin_balances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coin_ledger_entries" ADD CONSTRAINT "coin_ledger_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coin_holds" ADD CONSTRAINT "coin_holds_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coin_holds" ADD CONSTRAINT "coin_holds_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
