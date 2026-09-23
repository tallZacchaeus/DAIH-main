import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requireRoles } from "../../middleware/rbac.middleware.js";
import { UserRole } from "@daih/types";
import {
  validateBody,
  validateQuery,
  validateParams,
} from "../../middleware/validate.middleware.js";
import { campaignController } from "./campaign.controller.js";
import {
  CreateCampaignSchema,
  UpdateCampaignSchema,
  CampaignIdParamsSchema,
  GenerateCopySchema,
  ListCampaignsQuerySchema,
} from "./campaign.schema.js";

export const campaignRouter = Router();

// Staff: List campaigns with filters & metrics
campaignRouter.get(
  "/",
  authenticate,
  requireRoles([
    UserRole.OPERATIONS_ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.FINANCE_OFFICER,
    UserRole.MANAGEMENT_VIEWER,
  ]),
  validateQuery(ListCampaignsQuerySchema),
  campaignController.list,
);

// Staff: AI Copy Generation (human approval gate applies)
campaignRouter.post(
  "/generate-copy",
  authenticate,
  requireRoles([UserRole.OPERATIONS_ADMIN, UserRole.SUPER_ADMIN]),
  validateBody(GenerateCopySchema),
  campaignController.generateAiCopy,
);

// Staff: Trigger RFM Recalculation
campaignRouter.post(
  "/calculate-rfm",
  authenticate,
  requireRoles([UserRole.OPERATIONS_ADMIN, UserRole.SUPER_ADMIN]),
  campaignController.calculateRfm,
);

// Staff: Single campaign details
campaignRouter.get(
  "/:id",
  authenticate,
  requireRoles([
    UserRole.OPERATIONS_ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.FINANCE_OFFICER,
    UserRole.MANAGEMENT_VIEWER,
  ]),
  validateParams(CampaignIdParamsSchema),
  campaignController.get,
);

// Operations / Super Admin: Create new campaign
campaignRouter.post(
  "/",
  authenticate,
  requireRoles([UserRole.OPERATIONS_ADMIN, UserRole.SUPER_ADMIN]),
  validateBody(CreateCampaignSchema),
  campaignController.create,
);

// Operations / Super Admin: Update campaign
campaignRouter.put(
  "/:id",
  authenticate,
  requireRoles([UserRole.OPERATIONS_ADMIN, UserRole.SUPER_ADMIN]),
  validateParams(CampaignIdParamsSchema),
  validateBody(UpdateCampaignSchema),
  campaignController.update,
);

// Operations / Super Admin: Delete / Archive campaign
campaignRouter.delete(
  "/:id",
  authenticate,
  requireRoles([UserRole.OPERATIONS_ADMIN, UserRole.SUPER_ADMIN]),
  validateParams(CampaignIdParamsSchema),
  campaignController.delete,
);

// Finance Officer / Super Admin: Review & approval gate for high-budget or flagged campaigns
campaignRouter.post(
  "/:id/approve",
  authenticate,
  requireRoles([UserRole.FINANCE_OFFICER, UserRole.SUPER_ADMIN]),
  validateParams(CampaignIdParamsSchema),
  campaignController.approve,
);

campaignRouter.post(
  "/:id/approve-ai",
  authenticate,
  requireRoles([
    UserRole.FINANCE_OFFICER,
    UserRole.OPERATIONS_ADMIN,
    UserRole.SUPER_ADMIN,
  ]),
  validateParams(CampaignIdParamsSchema),
  campaignController.approveAi,
);

// Operations / Super Admin: Execute campaign (dispatches with 6 guardrails)
campaignRouter.post(
  "/:id/execute",
  authenticate,
  requireRoles([UserRole.OPERATIONS_ADMIN, UserRole.SUPER_ADMIN]),
  validateParams(CampaignIdParamsSchema),
  campaignController.execute,
);

// Staff: Retrieve Lift Analytics Metrics
campaignRouter.get(
  "/:id/metrics",
  authenticate,
  requireRoles([
    UserRole.OPERATIONS_ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.FINANCE_OFFICER,
    UserRole.MANAGEMENT_VIEWER,
  ]),
  validateParams(CampaignIdParamsSchema),
  campaignController.getMetrics,
);
