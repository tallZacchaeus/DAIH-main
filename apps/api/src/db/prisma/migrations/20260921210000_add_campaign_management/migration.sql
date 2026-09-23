-- CreateEnum
CREATE TYPE "CampaignType" AS ENUM (
    'WELCOME_SERIES',
    'INACTIVE_30D',
    'BIRTHDAY',
    'STREAK_ACHIEVEMENT',
    'ABANDONED_BOOKING',
    'MILESTONE_TIER',
    'CUSTOM_BROADCAST'
);

-- CreateEnum
CREATE TYPE "CampaignTriggerType" AS ENUM (
    'EVENT',
    'SCHEDULED_CRON',
    'MANUAL'
);

-- CreateEnum
CREATE TYPE "CampaignChannel" AS ENUM (
    'EMAIL',
    'IN_APP',
    'BOTH'
);

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM (
    'DRAFT',
    'SCHEDULED',
    'ACTIVE',
    'PAUSED',
    'COMPLETED',
    'ARCHIVED'
);

-- CreateEnum
CREATE TYPE "CampaignExecutionStatus" AS ENUM (
    'SENT',
    'DELIVERED',
    'FAILED',
    'DEFERRED_QUIET_HOURS',
    'SUPPRESSED_FREQUENCY_CAP',
    'SUPPRESSED_BUDGET_CAP',
    'SUPPRESSED_HOLDOUT'
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "CampaignType" NOT NULL,
    "triggerType" "CampaignTriggerType" NOT NULL DEFAULT 'SCHEDULED_CRON',
    "channel" "CampaignChannel" NOT NULL DEFAULT 'EMAIL',
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "coinReward" DECIMAL(12,4),
    "discountPercentage" DECIMAL(5,2),
    "isDiscretionary" BOOLEAN NOT NULL DEFAULT true,
    "frequencyCapDays" INTEGER NOT NULL DEFAULT 7,
    "budgetLimitNgn" DECIMAL(12,2),
    "spentBudgetNgn" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "holdoutPercentage" INTEGER NOT NULL DEFAULT 10,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "aiPrompt" TEXT,
    "aiApprovedByUserId" TEXT,
    "aiApprovedAt" TIMESTAMP(3),
    "audienceFilter" JSONB,
    "scheduledAt" TIMESTAMP(3),
    "lastRunAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_executions" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "recipientUserId" TEXT NOT NULL,
    "channel" "CampaignChannel" NOT NULL DEFAULT 'EMAIL',
    "status" "CampaignExecutionStatus" NOT NULL DEFAULT 'SENT',
    "isHoldout" BOOLEAN NOT NULL DEFAULT false,
    "deferredUntil" TIMESTAMP(3),
    "coinAwarded" DECIMAL(12,4),
    "sentAt" TIMESTAMP(3),
    "convertedAt" TIMESTAMP(3),
    "conversionAmount" DECIMAL(12,2),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_metrics" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "totalTargeted" INTEGER NOT NULL DEFAULT 0,
    "treatmentSent" INTEGER NOT NULL DEFAULT 0,
    "holdoutCount" INTEGER NOT NULL DEFAULT 0,
    "treatmentConversions" INTEGER NOT NULL DEFAULT 0,
    "holdoutConversions" INTEGER NOT NULL DEFAULT 0,
    "treatmentRevenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "holdoutRevenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "incrementalLift" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "campaigns_status_triggerType_idx" ON "campaigns"("status", "triggerType");

-- CreateIndex
CREATE INDEX "campaigns_type_idx" ON "campaigns"("type");

-- CreateIndex
CREATE INDEX "campaign_executions_recipientUserId_createdAt_idx" ON "campaign_executions"("recipientUserId", "createdAt");

-- CreateIndex
CREATE INDEX "campaign_executions_campaignId_status_idx" ON "campaign_executions"("campaignId", "status");

-- CreateIndex
CREATE INDEX "campaign_executions_status_deferredUntil_idx" ON "campaign_executions"("status", "deferredUntil");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_metrics_campaignId_period_key" ON "campaign_metrics"("campaignId", "period");

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_aiApprovedByUserId_fkey" FOREIGN KEY ("aiApprovedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_executions" ADD CONSTRAINT "campaign_executions_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_executions" ADD CONSTRAINT "campaign_executions_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_metrics" ADD CONSTRAINT "campaign_metrics_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
