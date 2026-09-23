-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CUSTOMER', 'RECEPTION_OFFICER', 'SECURITY_OFFICER', 'OPERATIONS_ADMIN', 'FINANCE_OFFICER', 'SUPER_ADMIN', 'MANAGEMENT_VIEWER');

-- CreateEnum
CREATE TYPE "ResourceCategory" AS ENUM ('HOT_DESK', 'FLEX_DESK', 'DEDICATED_DESK', 'OFFICE_SUITE', 'CONFERENCE_HALL', 'TRAINING_ROOM', 'ROOFTOP_LOUNGE', 'STUDIO');

-- CreateEnum
CREATE TYPE "BookingState" AS ENUM ('DRAFT', 'HELD', 'PENDING_PAYMENT', 'CONFIRMED', 'ACTIVE', 'CHECKED_IN', 'CHECKED_OUT', 'COMPLETED', 'CANCELLED', 'EXPIRED', 'NO_SHOW', 'REFUND_PENDING', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESSFUL', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('PAYMENT', 'REFUND');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('PAYSTACK', 'SUBSCRIPTION_CREDIT', 'BANK_TRANSFER', 'POS_TERMINAL');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PUBLISHED', 'FAILED');

-- CreateEnum
CREATE TYPE "MfaMethod" AS ENUM ('EMAIL_OTP', 'TOTP');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT', 'FIXED_PRICE');

-- CreateEnum
CREATE TYPE "CustomerEligibility" AS ENUM ('ALL', 'SPECIFIC_CUSTOMERS', 'FIRST_TIME_ONLY', 'DOMAIN_MATCH');

-- CreateEnum
CREATE TYPE "RedemptionStatus" AS ENUM ('HELD', 'APPLIED', 'RELEASED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "DiscountSource" AS ENUM ('CUSTOMER_COUPON', 'AUTOMATIC', 'STAFF_OVERRIDE');

-- CreateEnum
CREATE TYPE "LoyaltyTransactionType" AS ENUM ('TRANSACTION_REWARD', 'ACTIVE_REFERRAL_BONUS', 'REFEREE_WELCOME_BONUS', 'REDEMPTION_BOOKING', 'ADMIN_ADJUSTMENT', 'REFUND_CLAWBACK');

-- CreateEnum
CREATE TYPE "LoyaltyFormulaMode" AS ENUM ('SPEND_RATIO', 'PERCENTAGE', 'FIXED_AMOUNT');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "googleId" TEXT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "avatarUrl" TEXT,
    "birthday" TEXT,
    "clientId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT true,
    "acquisitionSource" TEXT,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaMethod" "MfaMethod",
    "mfaSecret" TEXT,
    "skipAnonymization" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "referralCode" TEXT,
    "referredById" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_consents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "consentedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "policy_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "tokenFamily" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "deviceFingerprint" TEXT,
    "mismatchCount" INTEGER NOT NULL DEFAULT 0,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mfa_otp_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mfa_otp_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_id_sequences" (
    "year" INTEGER NOT NULL,
    "nextSequence" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_id_sequences_pkey" PRIMARY KEY ("year")
);

-- CreateTable
CREATE TABLE "invoice_sequences" (
    "year" INTEGER NOT NULL,
    "nextSequence" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_sequences_pkey" PRIMARY KEY ("year")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "linkHref" TEXT,
    "metadata" JSONB,
    "sourceEventId" TEXT,
    "readAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facility_resources" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" "ResourceCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "location" TEXT NOT NULL,
    "amenities" TEXT[],
    "imageUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facility_resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_pricing" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "planName" TEXT NOT NULL,
    "durationHours" INTEGER,
    "durationDays" INTEGER,
    "durationMonths" INTEGER,
    "price" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isNightPlan" BOOLEAN NOT NULL DEFAULT false,
    "operatingHours" TEXT,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resource_pricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_schedules" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "openTime" TEXT NOT NULL DEFAULT '08:00',
    "closeTime" TEXT NOT NULL DEFAULT '20:00',
    "is24Hours" BOOLEAN NOT NULL DEFAULT false,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resource_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_blackouts" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resource_blackouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "state" "BookingState" NOT NULL DEFAULT 'DRAFT',
    "holdExpiresAt" TIMESTAMP(3),
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "originalAmount" DECIMAL(12,2),
    "discountAmount" DECIMAL(12,2) DEFAULT 0,
    "discountId" TEXT,
    "discountCode" TEXT,
    "redeemedCoins" DECIMAL(12,2) DEFAULT 0,
    "redeemedCoinsNgn" DECIMAL(12,2) DEFAULT 0,
    "coinHoldReleased" BOOLEAN DEFAULT false,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "qrToken" TEXT,
    "checkedInAt" TIMESTAMP(3),
    "checkedOutAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "method" "PaymentMethod" NOT NULL DEFAULT 'PAYSTACK',
    "paystackReference" TEXT,
    "paystackChannel" TEXT,
    "gatewayResponse" JSONB,
    "webhookEventId" TEXT,
    "webhookReceivedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "refundAmount" DECIMAL(12,2),
    "refundReason" TEXT,
    "refundedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "tax" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "lineItems" JSONB NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerClientId" TEXT NOT NULL,
    "resourceName" TEXT NOT NULL,
    "bookingReference" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visit_sessions" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "staffUserId" TEXT,
    "terminalId" TEXT DEFAULT 'REC-GATE-01',
    "checkInTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkOutTime" TIMESTAMP(3),
    "ipAddress" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visit_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_templates" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "htmlBody" TEXT NOT NULL,
    "textBody" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastEditedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discounts" (
    "id" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "DiscountType" NOT NULL,
    "value" DECIMAL(12,2) NOT NULL,
    "maxDiscountAmount" DECIMAL(12,2),
    "minOrderAmount" DECIMAL(12,2) DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "isAutomatic" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "maxUsageTotal" INTEGER,
    "maxUsagePerUser" INTEGER NOT NULL DEFAULT 1,
    "currentUsageCount" INTEGER NOT NULL DEFAULT 0,
    "appliesToAll" BOOLEAN NOT NULL DEFAULT true,
    "targetCategories" "ResourceCategory"[],
    "customerEligibility" "CustomerEligibility" NOT NULL DEFAULT 'ALL',
    "targetEmailDomains" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discount_target_resources" (
    "id" TEXT NOT NULL,
    "discountId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,

    CONSTRAINT "discount_target_resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discount_target_customers" (
    "id" TEXT NOT NULL,
    "discountId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "discount_target_customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discount_redemptions" (
    "id" TEXT NOT NULL,
    "discountId" TEXT,
    "userId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "transactionId" TEXT,
    "source" "DiscountSource" NOT NULL DEFAULT 'CUSTOMER_COUPON',
    "appliedByStaffId" TEXT,
    "justificationNote" TEXT,
    "originalAmount" DECIMAL(12,2) NOT NULL,
    "discountAmount" DECIMAL(12,2) NOT NULL,
    "finalAmount" DECIMAL(12,2) NOT NULL,
    "status" "RedemptionStatus" NOT NULL DEFAULT 'HELD',
    "heldAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appliedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discount_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_policies" (
    "id" VARCHAR(64) NOT NULL,
    "type" VARCHAR(64) NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "version" VARCHAR(32) NOT NULL DEFAULT '1.0',
    "effective_date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(64),

    CONSTRAINT "legal_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_settings" (
    "id" VARCHAR(64) NOT NULL DEFAULT 'default',
    "contact" JSONB NOT NULL,
    "faqs" JSONB NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(64),

    CONSTRAINT "support_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_wallets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "reservedCoins" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "lifetimeEarned" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "lifetimeSpent" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loyalty_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_transactions" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "balanceAfter" DECIMAL(12,2) NOT NULL,
    "type" "LoyaltyTransactionType" NOT NULL,
    "referenceId" TEXT NOT NULL,
    "referenceType" TEXT NOT NULL DEFAULT 'TRANSACTION',
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loyalty_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_reward_logs" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "refereeId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "coinsAwarded" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_reward_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_settings" (
    "id" VARCHAR(64) NOT NULL DEFAULT 'default',
    "isProgramActive" BOOLEAN NOT NULL DEFAULT true,
    "coinName" TEXT NOT NULL DEFAULT 'PD Coin',
    "coinSymbol" TEXT NOT NULL DEFAULT 'PDC',
    "isTransactionRewardEnabled" BOOLEAN NOT NULL DEFAULT true,
    "formulaMode" "LoyaltyFormulaMode" NOT NULL DEFAULT 'SPEND_RATIO',
    "spendRatioNgn" DECIMAL(12,2) NOT NULL DEFAULT 100.00,
    "percentageRate" DECIMAL(5,2) NOT NULL DEFAULT 1.00,
    "fixedAmountCoins" DECIMAL(12,2) NOT NULL DEFAULT 50.00,
    "minSpendThreshold" DECIMAL(12,2) NOT NULL DEFAULT 500.00,
    "maxCoinsPerTransaction" DECIMAL(12,2),
    "isReferralRewardEnabled" BOOLEAN NOT NULL DEFAULT false,
    "coinsPerActiveReferral" DECIMAL(12,2) NOT NULL DEFAULT 100.00,
    "refereeWelcomeBonus" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "isRedemptionEnabled" BOOLEAN NOT NULL DEFAULT true,
    "redemptionRateCoins" DECIMAL(12,2) NOT NULL DEFAULT 100.00,
    "redemptionRateNgn" DECIMAL(12,2) NOT NULL DEFAULT 100.00,
    "minCoinsToRedeem" DECIMAL(12,2) NOT NULL DEFAULT 100.00,
    "maxDiscountPercent" DECIMAL(5,2) NOT NULL DEFAULT 50.00,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(64),

    CONSTRAINT "loyalty_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "powerRating" INTEGER,
    "wifiRating" INTEGER,
    "comfortRating" INTEGER,
    "staffRating" INTEGER,
    "title" TEXT,
    "comment" TEXT NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'APPROVED',
    "isFeaturedOnHome" BOOLEAN NOT NULL DEFAULT false,
    "adminReply" TEXT,
    "adminRepliedAt" TIMESTAMP(3),
    "adminRepliedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_settings" (
    "id" VARCHAR(64) NOT NULL DEFAULT 'default',
    "requireApproval" BOOLEAN NOT NULL DEFAULT true,
    "isHomepageSpotlightEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(64),

    CONSTRAINT "review_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_clientId_key" ON "users"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "users_referralCode_key" ON "users"("referralCode");

-- CreateIndex
CREATE INDEX "users_googleId_idx" ON "users"("googleId");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_role_isVerified_idx" ON "users"("role", "isVerified");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");

-- CreateIndex
CREATE INDEX "users_referredById_idx" ON "users"("referredById");

-- CreateIndex
CREATE INDEX "users_referredById_createdAt_idx" ON "users"("referredById", "createdAt");

-- CreateIndex
CREATE INDEX "users_referralCode_idx" ON "users"("referralCode");

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_refreshTokenHash_key" ON "auth_sessions"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "auth_sessions_userId_idx" ON "auth_sessions"("userId");

-- CreateIndex
CREATE INDEX "auth_sessions_tokenFamily_idx" ON "auth_sessions"("tokenFamily");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_tokenHash_key" ON "verification_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "verification_tokens_userId_idx" ON "verification_tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_tokenHash_key" ON "password_reset_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_userId_idx" ON "password_reset_tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "mfa_otp_tokens_tokenHash_key" ON "mfa_otp_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "mfa_otp_tokens_userId_idx" ON "mfa_otp_tokens"("userId");

-- CreateIndex
CREATE INDEX "outbox_events_status_scheduledAt_idx" ON "outbox_events"("status", "scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_sourceEventId_key" ON "notifications"("sourceEventId");

-- CreateIndex
CREATE INDEX "notifications_userId_readAt_createdAt_idx" ON "notifications"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_userId_archivedAt_createdAt_idx" ON "notifications"("userId", "archivedAt", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "facility_resources_slug_key" ON "facility_resources"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "resource_schedules_resourceId_dayOfWeek_key" ON "resource_schedules"("resourceId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "resource_blackouts_resourceId_startDate_endDate_idx" ON "resource_blackouts"("resourceId", "startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_reference_key" ON "bookings"("reference");

-- CreateIndex
CREATE INDEX "bookings_resourceId_startTime_endTime_idx" ON "bookings"("resourceId", "startTime", "endTime");

-- CreateIndex
CREATE INDEX "bookings_state_idx" ON "bookings"("state");

-- CreateIndex
CREATE INDEX "bookings_userId_idx" ON "bookings"("userId");

-- CreateIndex
CREATE INDEX "bookings_userId_state_idx" ON "bookings"("userId", "state");

-- CreateIndex
CREATE INDEX "bookings_createdAt_idx" ON "bookings"("createdAt");

-- CreateIndex
CREATE INDEX "bookings_holdExpiresAt_state_idx" ON "bookings"("holdExpiresAt", "state");

-- CreateIndex
CREATE INDEX "bookings_checkedInAt_idx" ON "bookings"("checkedInAt");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_reference_key" ON "transactions"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_paystackReference_key" ON "transactions"("paystackReference");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_webhookEventId_key" ON "transactions"("webhookEventId");

-- CreateIndex
CREATE INDEX "transactions_status_idx" ON "transactions"("status");

-- CreateIndex
CREATE INDEX "transactions_bookingId_idx" ON "transactions"("bookingId");

-- CreateIndex
CREATE INDEX "transactions_webhookEventId_idx" ON "transactions"("webhookEventId");

-- CreateIndex
CREATE INDEX "transactions_userId_idx" ON "transactions"("userId");

-- CreateIndex
CREATE INDEX "transactions_createdAt_idx" ON "transactions"("createdAt");

-- CreateIndex
CREATE INDEX "transactions_status_createdAt_idx" ON "transactions"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_transactionId_key" ON "invoices"("transactionId");

-- CreateIndex
CREATE INDEX "invoices_userId_idx" ON "invoices"("userId");

-- CreateIndex
CREATE INDEX "invoices_bookingId_idx" ON "invoices"("bookingId");

-- CreateIndex
CREATE INDEX "visit_sessions_bookingId_idx" ON "visit_sessions"("bookingId");

-- CreateIndex
CREATE INDEX "visit_sessions_userId_idx" ON "visit_sessions"("userId");

-- CreateIndex
CREATE INDEX "visit_sessions_checkInTime_idx" ON "visit_sessions"("checkInTime");

-- CreateIndex
CREATE UNIQUE INDEX "email_templates_type_key" ON "email_templates"("type");

-- CreateIndex
CREATE UNIQUE INDEX "discounts_code_key" ON "discounts"("code");

-- CreateIndex
CREATE INDEX "discounts_code_idx" ON "discounts"("code");

-- CreateIndex
CREATE INDEX "discounts_isActive_validFrom_validUntil_idx" ON "discounts"("isActive", "validFrom", "validUntil");

-- CreateIndex
CREATE UNIQUE INDEX "discount_target_resources_discountId_resourceId_key" ON "discount_target_resources"("discountId", "resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "discount_target_customers_discountId_userId_key" ON "discount_target_customers"("discountId", "userId");

-- CreateIndex
CREATE INDEX "discount_redemptions_discountId_idx" ON "discount_redemptions"("discountId");

-- CreateIndex
CREATE INDEX "discount_redemptions_userId_idx" ON "discount_redemptions"("userId");

-- CreateIndex
CREATE INDEX "discount_redemptions_bookingId_idx" ON "discount_redemptions"("bookingId");

-- CreateIndex
CREATE INDEX "discount_redemptions_appliedByStaffId_idx" ON "discount_redemptions"("appliedByStaffId");

-- CreateIndex
CREATE INDEX "discount_redemptions_source_idx" ON "discount_redemptions"("source");

-- CreateIndex
CREATE UNIQUE INDEX "legal_policies_type_key" ON "legal_policies"("type");

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_wallets_userId_key" ON "loyalty_wallets"("userId");

-- CreateIndex
CREATE INDEX "loyalty_wallets_balance_idx" ON "loyalty_wallets"("balance");

-- CreateIndex
CREATE INDEX "loyalty_wallets_lifetimeEarned_idx" ON "loyalty_wallets"("lifetimeEarned");

-- CreateIndex
CREATE INDEX "loyalty_transactions_userId_createdAt_idx" ON "loyalty_transactions"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "loyalty_transactions_userId_type_createdAt_idx" ON "loyalty_transactions"("userId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "loyalty_transactions_createdAt_idx" ON "loyalty_transactions"("createdAt");

-- CreateIndex
CREATE INDEX "loyalty_transactions_type_createdAt_idx" ON "loyalty_transactions"("type", "createdAt");

-- CreateIndex
CREATE INDEX "loyalty_transactions_walletId_idx" ON "loyalty_transactions"("walletId");

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_transactions_referenceId_type_key" ON "loyalty_transactions"("referenceId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "referral_reward_logs_refereeId_key" ON "referral_reward_logs"("refereeId");

-- CreateIndex
CREATE INDEX "referral_reward_logs_referrerId_idx" ON "referral_reward_logs"("referrerId");

-- CreateIndex
CREATE INDEX "referral_reward_logs_bookingId_idx" ON "referral_reward_logs"("bookingId");

-- CreateIndex
CREATE INDEX "referral_reward_logs_createdAt_idx" ON "referral_reward_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_bookingId_key" ON "reviews"("bookingId");

-- CreateIndex
CREATE INDEX "reviews_status_isFeaturedOnHome_idx" ON "reviews"("status", "isFeaturedOnHome");

-- CreateIndex
CREATE INDEX "reviews_resourceId_status_idx" ON "reviews"("resourceId", "status");

-- CreateIndex
CREATE INDEX "reviews_userId_idx" ON "reviews"("userId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_consents" ADD CONSTRAINT "policy_consents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_tokens" ADD CONSTRAINT "verification_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mfa_otp_tokens" ADD CONSTRAINT "mfa_otp_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_pricing" ADD CONSTRAINT "resource_pricing_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "facility_resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_schedules" ADD CONSTRAINT "resource_schedules_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "facility_resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_blackouts" ADD CONSTRAINT "resource_blackouts_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "facility_resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "facility_resources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_discountId_fkey" FOREIGN KEY ("discountId") REFERENCES "discounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_sessions" ADD CONSTRAINT "visit_sessions_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_sessions" ADD CONSTRAINT "visit_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_target_resources" ADD CONSTRAINT "discount_target_resources_discountId_fkey" FOREIGN KEY ("discountId") REFERENCES "discounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_target_resources" ADD CONSTRAINT "discount_target_resources_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "facility_resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_target_customers" ADD CONSTRAINT "discount_target_customers_discountId_fkey" FOREIGN KEY ("discountId") REFERENCES "discounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_target_customers" ADD CONSTRAINT "discount_target_customers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_redemptions" ADD CONSTRAINT "discount_redemptions_discountId_fkey" FOREIGN KEY ("discountId") REFERENCES "discounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_redemptions" ADD CONSTRAINT "discount_redemptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_redemptions" ADD CONSTRAINT "discount_redemptions_appliedByStaffId_fkey" FOREIGN KEY ("appliedByStaffId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_redemptions" ADD CONSTRAINT "discount_redemptions_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_wallets" ADD CONSTRAINT "loyalty_wallets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "loyalty_wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_reward_logs" ADD CONSTRAINT "referral_reward_logs_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_reward_logs" ADD CONSTRAINT "referral_reward_logs_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "facility_resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

