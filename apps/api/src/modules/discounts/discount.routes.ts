import { Router } from "express";
import { discountController } from "./discount.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requireAnyPermission } from "../../middleware/rbac.middleware.js";
import {
  validateBody,
  validateQuery,
} from "../../middleware/validate.middleware.js";
import { Permission } from "@daih/types";
import {
  CreateDiscountSchema,
  UpdateDiscountSchema,
  PreviewDiscountSchema,
  ApplyCourtesyDiscountSchema,
  DiscountFilterSchema,
} from "./discount.schema.js";

export const discountRouter = Router();

// Staff and Admin permission guards
const staffDiscountGuard = [
  authenticate,
  requireAnyPermission([
    Permission.BOOKINGS_OVERRIDE,
    Permission.BOOKINGS_MANAGE,
    Permission.PAYMENTS_READ,
  ]),
];

const adminDiscountManageGuard = [
  authenticate,
  requireAnyPermission([
    Permission.BOOKINGS_MANAGE,
    Permission.RESOURCES_MANAGE,
    Permission.PAYMENTS_READ,
  ]),
];

// ==========================================
// Public / Authenticated Preview Endpoint
// ==========================================
discountRouter.post(
  "/preview",
  authenticate,
  validateBody(PreviewDiscountSchema),
  discountController.previewDiscount,
);

// ==========================================
// Staff Courtesy Override Endpoints
// ==========================================
discountRouter.post(
  "/courtesy-override",
  staffDiscountGuard,
  validateBody(ApplyCourtesyDiscountSchema),
  discountController.applyCourtesyDiscount,
);

// ==========================================
// Admin Promotion Rules Management Endpoints
// ==========================================
discountRouter.post(
  "/",
  adminDiscountManageGuard,
  validateBody(CreateDiscountSchema),
  discountController.createDiscount,
);

discountRouter.get(
  "/",
  adminDiscountManageGuard,
  validateQuery(DiscountFilterSchema),
  discountController.listDiscounts,
);

discountRouter.get(
  "/redemptions/all",
  adminDiscountManageGuard,
  discountController.getRedemptions,
);

discountRouter.get(
  "/:id/redemptions",
  adminDiscountManageGuard,
  discountController.getRedemptions,
);

discountRouter.patch(
  "/:id/status",
  adminDiscountManageGuard,
  discountController.toggleDiscountStatus,
);

discountRouter.get(
  "/:id",
  adminDiscountManageGuard,
  discountController.getDiscountById,
);

discountRouter.put(
  "/:id",
  adminDiscountManageGuard,
  validateBody(UpdateDiscountSchema),
  discountController.updateDiscount,
);

discountRouter.delete(
  "/:id",
  adminDiscountManageGuard,
  discountController.deleteDiscount,
);
