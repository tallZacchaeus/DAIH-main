import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  CampaignType,
  CampaignStatus,
  CampaignChannel,
  CampaignExecutionStatus,
} from "@prisma/client";
import { campaignService } from "./campaign.service.js";
import { Decimal } from "@prisma/client/runtime/library";

const { store } = vi.hoisted(() => ({
  store: {
    campaigns: [] as any[],
    executions: [] as any[],
    metrics: [] as any[],
    users: [] as any[],
    notifications: [] as any[],
  },
}));

vi.mock("../notifications/notifications.queue.js", () => ({
  enqueueNotification: vi.fn(
    async (type: string, email: string, name: string, data: any) => {
      store.notifications.push({ type, email, name, data });
      return { jobId: "mock-job-id" };
    },
  ),
}));

vi.mock("../loyalty/coin.service.js", () => ({
  coinService: {
    creditCoins: vi.fn(async () => ({ newBalance: 100 })),
  },
}));

vi.mock("../../db/client.js", () => {
  const mockTx = {
    campaign: {
      findUnique: vi.fn(async ({ where }: any) => {
        return store.campaigns.find((c) => c.id === where.id) || null;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const idx = store.campaigns.findIndex((c) => c.id === where.id);
        if (idx !== -1) {
          store.campaigns[idx] = { ...store.campaigns[idx], ...data };
          return store.campaigns[idx];
        }
        return null;
      }),
    },
    campaignExecution: {
      findFirst: vi.fn(async ({ where }: any) => {
        return (
          store.executions.find((e) => {
            if (
              where.recipientUserId &&
              e.recipientUserId !== where.recipientUserId
            )
              return false;
            if (where.campaignId && e.campaignId !== where.campaignId)
              return false;
            if (where.status?.in && !where.status.in.includes(e.status))
              return false;
            if (where.status && !where.status.in && e.status !== where.status)
              return false;
            if (
              where.isHoldout !== undefined &&
              e.isHoldout !== where.isHoldout
            )
              return false;
            if (
              where.sentAt?.gte &&
              new Date(e.sentAt) < new Date(where.sentAt.gte)
            )
              return false;
            return true;
          }) || null
        );
      }),
      findMany: vi.fn(async ({ where }: any) => {
        return store.executions.filter((e) => {
          if (where?.campaignId && e.campaignId !== where.campaignId)
            return false;
          if (
            where?.recipientUserId &&
            e.recipientUserId !== where.recipientUserId
          )
            return false;
          if (where?.status && !where.status.in && e.status !== where.status)
            return false;
          if (where?.status?.in && !where.status.in.includes(e.status))
            return false;
          return true;
        });
      }),
      create: vi.fn(async ({ data }: any) => {
        const created = {
          id: `exec-${Date.now()}-${Math.random()}`,
          ...data,
          createdAt: new Date(),
        };
        store.executions.push(created);
        return created;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const idx = store.executions.findIndex((e) => e.id === where.id);
        if (idx !== -1) {
          store.executions[idx] = { ...store.executions[idx], ...data };
          return store.executions[idx];
        }
        return null;
      }),
    },
    campaignMetric: {
      upsert: vi.fn(async ({ where, create, update }: any) => {
        const idx = store.metrics.findIndex(
          (m) => m.campaignId === where.campaignId_period.campaignId,
        );
        if (idx !== -1) {
          store.metrics[idx] = { ...store.metrics[idx], ...update };
          return store.metrics[idx];
        }
        const created = {
          id: `metric-${Date.now()}`,
          ...create,
        };
        store.metrics.push(created);
        return created;
      }),
    },
    user: {
      findUnique: vi.fn(
        async ({ where }: any) =>
          store.users.find((u) => u.id === where.id) || null,
      ),
      findMany: vi.fn(async () => store.users),
      update: vi.fn(async () => ({})),
    },
    booking: {
      findMany: vi.fn(async () => []),
    },
  };

  return {
    prisma: {
      ...mockTx,
      $transaction: vi.fn(async (cb: any) => cb(mockTx)),
    },
  };
});

describe("Stage E: Campaign Management & 6 Guardrails", () => {
  const adminUserId = "user-admin-1";

  const customer1 = {
    id: "user-cust-1",
    email: "customer1@example.com",
    firstName: "Ade",
    lastName: "Bayo",
    role: "CUSTOMER",
    isVerified: true,
  };

  const customer2 = {
    id: "user-cust-2",
    email: "customer2@example.com",
    firstName: "Fatima",
    lastName: "Aliyu",
    role: "CUSTOMER",
    isVerified: true,
  };

  const adminUser = {
    id: adminUserId,
    email: "admin@example.com",
    firstName: "Admin",
    lastName: "Staff",
    role: "OPERATIONS_ADMIN",
    isVerified: true,
  };

  const financeUserId = "user-finance-1";
  const financeUser = {
    id: financeUserId,
    email: "finance@example.com",
    firstName: "Finance",
    lastName: "Officer",
    role: "FINANCE_OFFICER",
    isVerified: true,
  };

  beforeEach(() => {
    store.campaigns = [];
    store.executions = [];
    store.metrics = [];
    store.users = [
      { ...customer1 },
      { ...customer2 },
      { ...adminUser },
      { ...financeUser },
    ];
    store.notifications = [];
    vi.clearAllMocks();
  });

  describe("Guardrail 1: Quiet Hours (21:00 to 08:00 WAT)", () => {
    it("should correctly identify quiet hours window in WAT (UTC+1)", () => {
      // 22:00 WAT is 21:00 UTC
      const lateNightUtc = new Date("2026-09-21T21:30:00Z");
      expect(campaignService.isQuietHours(lateNightUtc)).toBe(true);

      // 03:00 WAT is 02:00 UTC
      const earlyMorningUtc = new Date("2026-09-21T02:00:00Z");
      expect(campaignService.isQuietHours(earlyMorningUtc)).toBe(true);

      // 14:00 WAT is 13:00 UTC (daytime - not quiet hours)
      const afternoonUtc = new Date("2026-09-21T13:00:00Z");
      expect(campaignService.isQuietHours(afternoonUtc)).toBe(false);
    });

    it("should defer discretionary campaigns during quiet hours to 08:05 WAT", () => {
      const lateNightUtc = new Date("2026-09-21T22:00:00Z"); // 23:00 WAT
      const nextEnd = campaignService.getNextQuietHoursEnd(lateNightUtc);

      // In WAT (UTC+1), nextEnd should be at 08:05 WAT => 07:05 UTC
      expect(nextEnd.getUTCHours()).toBe(7);
      expect(nextEnd.getUTCMinutes()).toBe(5);
    });
  });

  describe("Guardrail 2: 7-Day Frequency Cap for Discretionary Marketing", () => {
    it("should flag user as frequency capped if they received discretionary marketing in last 7 days", async () => {
      const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
      store.executions.push({
        id: "exec-old-1",
        campaignId: "campaign-1",
        recipientUserId: customer1.id,
        status: CampaignExecutionStatus.SENT,
        isHoldout: false,
        sentAt: fourDaysAgo,
        campaign: { isDiscretionary: true },
      });

      const isCapped = await campaignService.isFrequencyCapped(customer1.id, 7);
      expect(isCapped).toBe(true);
    });

    it("should allow dispatch if prior message was sent > 7 days ago", async () => {
      const nineDaysAgo = new Date(Date.now() - 9 * 24 * 60 * 60 * 1000);
      store.executions.push({
        id: "exec-old-2",
        campaignId: "campaign-1",
        recipientUserId: customer1.id,
        status: CampaignExecutionStatus.SENT,
        isHoldout: false,
        sentAt: nineDaysAgo,
        campaign: { isDiscretionary: true },
      });

      const isCapped = await campaignService.isFrequencyCapped(customer1.id, 7);
      expect(isCapped).toBe(false);
    });

    it("should flag user as frequency capped when customer has received 4 messages in the last 30 days", async () => {
      // 4 messages sent over the last 25 days (none in the last 7 days)
      for (let i = 1; i <= 4; i++) {
        const pastDate = new Date(
          Date.now() - (8 + i * 3) * 24 * 60 * 60 * 1000,
        );
        store.executions.push({
          id: `exec-month-${i}`,
          campaignId: `campaign-${i}`,
          recipientUserId: customer1.id,
          status: CampaignExecutionStatus.SENT,
          isHoldout: false,
          sentAt: pastDate,
          campaign: { isDiscretionary: true },
        });
      }

      // Customer hit monthly limit of 4 messages -> blocked even with 0 in last 7 days!
      const isCapped = await campaignService.isFrequencyCapped(customer1.id, 7);
      expect(isCapped).toBe(true);
    });

    it("should allow dispatch if customer received 3 messages in the last 30 days and none in last 7 days", async () => {
      // 3 messages sent over the last 25 days
      for (let i = 1; i <= 3; i++) {
        const pastDate = new Date(
          Date.now() - (8 + i * 3) * 24 * 60 * 60 * 1000,
        );
        store.executions.push({
          id: `exec-month-${i}`,
          campaignId: `campaign-${i}`,
          recipientUserId: customer1.id,
          status: CampaignExecutionStatus.SENT,
          isHoldout: false,
          sentAt: pastDate,
          campaign: { isDiscretionary: true },
        });
      }

      const isCapped = await campaignService.isFrequencyCapped(customer1.id, 7);
      expect(isCapped).toBe(false);
    });
  });

  describe("Guardrail 3: Campaign Budget Cap", () => {
    it("should prevent awarding coins when campaign budget ceiling is reached", async () => {
      const campaign = {
        id: "camp-budget-1",
        budgetLimitNgn: new Decimal(5000),
        spentBudgetNgn: new Decimal(4800),
      };
      store.campaigns.push(campaign);

      // Attempting to award 500 PD (₦500), which would push total to ₦5,300 > ₦5,000
      const ok = await campaignService.checkAndReserveBudget(campaign.id, 500);
      expect(ok).toBe(false);
    });

    it("should allow awarding coins within remaining budget", async () => {
      const campaign = {
        id: "camp-budget-2",
        budgetLimitNgn: new Decimal(5000),
        spentBudgetNgn: new Decimal(2000),
      };
      store.campaigns.push(campaign);

      const ok = await campaignService.checkAndReserveBudget(campaign.id, 500);
      expect(ok).toBe(true);

      const updated = store.campaigns.find((c) => c.id === campaign.id);
      expect(Number(updated.spentBudgetNgn)).toBe(2500);
    });
  });

  describe("Guardrail 4: 10% Randomized Holdout Group", () => {
    it("should assign users to holdout group based on holdout percentage", () => {
      // Test across 1,000 samples with 10% holdout
      const holdoutCount = Array.from({ length: 1000 }).filter((_, i) =>
        campaignService.assignHoldout(
          `user-sample-${i}`,
          "campaign-test-1",
          10,
        ),
      ).length;

      // In 1,000 samples with 10% holdout, count should be between 7% and 13% (70-130)
      expect(holdoutCount).toBeGreaterThanOrEqual(70);
      expect(holdoutCount).toBeLessThanOrEqual(130);
    });
  });

  describe("Guardrail 6: Human Approval Gate for AI Content", () => {
    it("STRICT: should block execution of AI-generated campaign without explicit human approval", async () => {
      const aiCampaign = {
        id: "camp-ai-1",
        name: "AI Welcome Re-engagement",
        type: CampaignType.INACTIVE_30D,
        aiGenerated: true,
        aiApprovedByUserId: null, // Not approved!
        isDiscretionary: true,
        body: "AI drafted text",
      };
      store.campaigns.push(aiCampaign);

      await expect(
        campaignService.executeCampaign(aiCampaign.id),
      ).rejects.toMatchObject({
        code: "AI_APPROVAL_REQUIRED",
        statusCode: 400,
      });
    });

    it("should allow execution once human staff approves the AI campaign", async () => {
      const aiCampaign = {
        id: "camp-ai-2",
        name: "AI Welcome Approved",
        type: CampaignType.INACTIVE_30D,
        channel: CampaignChannel.EMAIL,
        aiGenerated: true,
        aiApprovedByUserId: null,
        isDiscretionary: false, // For direct dispatch test
        body: "Approved AI text",
      };
      store.campaigns.push(aiCampaign);

      // Staff approves campaign
      await campaignService.approveAiCampaign(adminUserId, aiCampaign.id);

      const updated = store.campaigns.find((c) => c.id === aiCampaign.id);
      expect(updated.aiApprovedByUserId).toBe(adminUserId);
      expect(updated.status).toBe(CampaignStatus.SCHEDULED);

      // Now execution proceeds through guardrails
      vi.spyOn(campaignService, "isQuietHours").mockReturnValue(false);
      const result = await campaignService.executeCampaign(aiCampaign.id);
      expect(result.sent).toBeGreaterThan(0);
    });
  });

  describe("Guardrail 7: Campaign Budget Approval Threshold (> ₦50,000 requires OPERATIONS_ADMIN approval)", () => {
    it("STRICT: should block execution of campaign with budget > ₦50,000 without prior approval", async () => {
      const bigBudgetCampaign = {
        id: "camp-big-budget-1",
        name: "National Q4 Push",
        type: CampaignType.INACTIVE_30D,
        channel: CampaignChannel.EMAIL,
        budgetLimitNgn: new Decimal(75000), // > ₦50,000 threshold
        aiApprovedByUserId: null, // Not approved!
        isDiscretionary: false,
        body: "Big budget promo copy",
      };
      store.campaigns.push(bigBudgetCampaign);

      await expect(
        campaignService.executeCampaign(bigBudgetCampaign.id),
      ).rejects.toMatchObject({
        code: "BUDGET_APPROVAL_REQUIRED",
        statusCode: 400,
      });
    });

    it("STRICT: should reject approval by user who is not FINANCE_OFFICER or SUPER_ADMIN", async () => {
      const bigBudgetCampaign = {
        id: "camp-big-budget-2",
        name: "Q4 Promo Invalid Approver",
        type: CampaignType.INACTIVE_30D,
        channel: CampaignChannel.EMAIL,
        budgetLimitNgn: new Decimal(100000),
        aiApprovedByUserId: adminUserId, // OPERATIONS_ADMIN cannot approve high budgets (only FINANCE_OFFICER or SUPER_ADMIN)
        isDiscretionary: false,
        body: "Copy",
      };
      store.campaigns.push(bigBudgetCampaign);

      await expect(
        campaignService.executeCampaign(bigBudgetCampaign.id),
      ).rejects.toMatchObject({
        code: "UNAUTHORIZED_BUDGET_APPROVER",
        statusCode: 403,
      });
    });

    it("should allow execution of campaign with budget > ₦50,000 once approved by FINANCE_OFFICER", async () => {
      const bigBudgetCampaign = {
        id: "camp-big-budget-3",
        name: "Q4 Promo Approved",
        type: CampaignType.INACTIVE_30D,
        channel: CampaignChannel.EMAIL,
        budgetLimitNgn: new Decimal(100000),
        aiApprovedByUserId: null,
        isDiscretionary: false,
        body: "Approved copy",
      };
      store.campaigns.push(bigBudgetCampaign);

      // Finance Officer reviews and approves high-budget campaign
      await campaignService.approveCampaign(
        financeUserId,
        bigBudgetCampaign.id,
      );

      vi.spyOn(campaignService, "isQuietHours").mockReturnValue(false);
      const result = await campaignService.executeCampaign(
        bigBudgetCampaign.id,
      );
      expect(result.sent).toBeGreaterThan(0);
    });

    it("should not require budget approval for campaigns with budget <= ₦50,000", async () => {
      const smallBudgetCampaign = {
        id: "camp-small-budget-1",
        name: "Local Community Push",
        type: CampaignType.INACTIVE_30D,
        channel: CampaignChannel.EMAIL,
        budgetLimitNgn: new Decimal(45000), // <= ₦50,000
        aiApprovedByUserId: null,
        isDiscretionary: false,
        body: "Local copy",
      };
      store.campaigns.push(smallBudgetCampaign);

      vi.spyOn(campaignService, "isQuietHours").mockReturnValue(false);
      const result = await campaignService.executeCampaign(
        smallBudgetCampaign.id,
      );
      expect(result.sent).toBeGreaterThan(0);
    });
  });

  describe("Lift Analytics: Incremental Conversion Calculation", () => {
    it("should calculate incremental lift (treatment conversion rate - holdout conversion rate)", async () => {
      const campaignId = "camp-lift-1";

      // Mock 100 treatment group members (20 converted)
      for (let i = 0; i < 100; i++) {
        store.executions.push({
          id: `exec-treat-${i}`,
          campaignId,
          recipientUserId: `user-t-${i}`,
          status: CampaignExecutionStatus.SENT,
          isHoldout: false,
          convertedAt: i < 20 ? new Date() : null,
          conversionAmount: i < 20 ? new Decimal(10000) : null,
        });
      }

      // Mock 20 holdout group members (2 converted)
      for (let i = 0; i < 20; i++) {
        store.executions.push({
          id: `exec-hold-${i}`,
          campaignId,
          recipientUserId: `user-h-${i}`,
          status: CampaignExecutionStatus.SUPPRESSED_HOLDOUT,
          isHoldout: true,
          convertedAt: i < 2 ? new Date() : null,
          conversionAmount: i < 2 ? new Decimal(10000) : null,
        });
      }

      const metrics = await campaignService.recalculateMetrics(campaignId);

      // Treatment conversion rate: 20 / 100 = 20%
      expect(metrics.treatmentConversionRate).toBe(20);

      // Holdout conversion rate: 2 / 20 = 10%
      expect(metrics.holdoutConversionRate).toBe(10);

      // Incremental Lift: 20% - 10% = +10 percentage points
      expect(metrics.incrementalLift).toBe(10);

      // Treatment revenue: 20 * 10,000 = 200,000
      expect(metrics.treatmentRevenue).toBe(200000);

      // Holdout revenue: 2 * 10,000 = 20,000
      expect(metrics.holdoutRevenue).toBe(20000);
    });
  });
});
