import { Router } from "express";
import { catalogueController } from "./catalogue.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import {
  requirePermission,
  requireStaff,
} from "../../middleware/rbac.middleware.js";
import {
  validateBody,
  validateParams,
} from "../../middleware/validate.middleware.js";
import { Permission } from "@daih/types";
import {
  SlugParamSchema,
  IdParamSchema,
  PricingPlanIdParamSchema,
  BlackoutIdParamSchema,
  CreateResourceSchema,
  UpdateResourceSchema,
  CreatePricingPlanSchema,
  UpdatePricingPlanSchema,
  CreateBlackoutSchema,
  UpsertSchedulesSchema,
  UploadResourceImageSchema,
} from "./catalogue.schema.js";

export const catalogueRouter = Router();

// ==========================================
// Public Catalogue Endpoints
// ==========================================

// List all active resources and their active pricing
catalogueRouter.get("/resources", catalogueController.getActiveResources);

// Get single resource by slug or ID with pricing and schedules
catalogueRouter.get(
  "/resources/:slug",
  validateParams(SlugParamSchema),
  catalogueController.getResourceBySlug,
);

// ==========================================
// Admin Operations Endpoints (RBAC Guarded)
// ==========================================

const adminManageGuard = [
  authenticate,
  requirePermission(Permission.RESOURCES_MANAGE),
];
const adminReadGuard = [authenticate, requireStaff()];

// List all resources including inactive for admin console (accessible to all staff)
catalogueRouter.get(
  "/admin/resources",
  ...adminReadGuard,
  catalogueController.getAdminResources,
);

// Create new resource
catalogueRouter.post(
  "/admin/resources",
  ...adminManageGuard,
  validateBody(CreateResourceSchema),
  catalogueController.createResource,
);

// Get resource details for admin
catalogueRouter.get(
  "/admin/resources/:id",
  ...adminReadGuard,
  validateParams(IdParamSchema),
  catalogueController.getResourceById,
);

// Update resource metadata / status
catalogueRouter.put(
  "/admin/resources/:id",
  ...adminManageGuard,
  validateParams(IdParamSchema),
  validateBody(UpdateResourceSchema),
  catalogueController.updateResource,
);

// Upload / compress resource image
catalogueRouter.post(
  "/admin/upload-image",
  ...adminManageGuard,
  validateBody(UploadResourceImageSchema),
  catalogueController.uploadImage,
);

// Soft delete / toggle deactivate resource
catalogueRouter.delete(
  "/admin/resources/:id",
  ...adminManageGuard,
  validateParams(IdParamSchema),
  catalogueController.deleteResource,
);

// Add pricing plan to resource
catalogueRouter.post(
  "/admin/resources/:id/pricing",
  ...adminManageGuard,
  validateParams(IdParamSchema),
  validateBody(CreatePricingPlanSchema),
  catalogueController.createPricingPlan,
);

// Update pricing plan
catalogueRouter.put(
  "/admin/pricing/:planId",
  ...adminManageGuard,
  validateParams(PricingPlanIdParamSchema),
  validateBody(UpdatePricingPlanSchema),
  catalogueController.updatePricingPlan,
);

// Delete pricing plan
catalogueRouter.delete(
  "/admin/pricing/:planId",
  ...adminManageGuard,
  validateParams(PricingPlanIdParamSchema),
  catalogueController.deletePricingPlan,
);

// Add blackout / maintenance date to resource
catalogueRouter.post(
  "/admin/resources/:id/blackouts",
  ...adminManageGuard,
  validateParams(IdParamSchema),
  validateBody(CreateBlackoutSchema),
  catalogueController.createBlackout,
);

// Delete blackout date
catalogueRouter.delete(
  "/admin/blackouts/:blackoutId",
  ...adminManageGuard,
  validateParams(BlackoutIdParamSchema),
  catalogueController.deleteBlackout,
);

// Update weekly operating schedules
catalogueRouter.put(
  "/admin/resources/:id/schedules",
  ...adminManageGuard,
  validateParams(IdParamSchema),
  validateBody(UpsertSchedulesSchema),
  catalogueController.updateSchedules,
);
