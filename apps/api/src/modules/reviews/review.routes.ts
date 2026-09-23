import { Router } from "express";
import { reviewController } from "./review.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requireAnyPermission } from "../../middleware/rbac.middleware.js";
import {
  validateBody,
  validateQuery,
} from "../../middleware/validate.middleware.js";
import { Permission } from "@daih/types";
import {
  CreateReviewSchema,
  UpdateReviewSchema,
  AdminReviewFilterSchema,
  AdminStatusUpdateSchema,
  AdminReviewSettingSchema,
  AdminReplySchema,
} from "./review.schema.js";

export const reviewRouter = Router();

const adminReviewGuard = [
  authenticate,
  requireAnyPermission([
    Permission.RESOURCES_MANAGE,
    Permission.BOOKINGS_MANAGE,
  ]),
];

// ==========================================
// Public Endpoints
// ==========================================
reviewRouter.get("/featured", reviewController.getFeatured);
reviewRouter.get("/resource/:resourceId", reviewController.getResourceReviews);

// ==========================================
// Customer Review Endpoints (Authenticated)
// ==========================================
reviewRouter.get(
  "/eligibility/:bookingId",
  authenticate,
  reviewController.checkEligibility,
);

reviewRouter.post(
  "/",
  authenticate,
  validateBody(CreateReviewSchema),
  reviewController.submitReview,
);

reviewRouter.patch(
  "/:id",
  authenticate,
  validateBody(UpdateReviewSchema),
  reviewController.updateReview,
);

// ==========================================
// Admin Moderation & Settings Endpoints
// ==========================================
reviewRouter.get(
  "/admin",
  adminReviewGuard,
  validateQuery(AdminReviewFilterSchema),
  reviewController.adminGetReviews,
);

reviewRouter.get(
  "/admin/settings",
  adminReviewGuard,
  reviewController.adminGetSettings,
);

reviewRouter.patch(
  "/admin/settings",
  adminReviewGuard,
  validateBody(AdminReviewSettingSchema),
  reviewController.adminUpdateSettings,
);

reviewRouter.patch(
  "/admin/:id/status",
  adminReviewGuard,
  validateBody(AdminStatusUpdateSchema),
  reviewController.adminUpdateStatus,
);

reviewRouter.post(
  "/admin/:id/reply",
  adminReviewGuard,
  validateBody(AdminReplySchema),
  reviewController.adminReply,
);
