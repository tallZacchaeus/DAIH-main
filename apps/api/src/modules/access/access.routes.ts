import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requireRoles } from "../../middleware/rbac.middleware.js";
import {
  validateParams,
  validateBody,
  validateQuery,
} from "../../middleware/validate.middleware.js";
import {
  VerifyQrSchema,
  BookingIdParamSchema,
  CheckInSchema,
  CheckOutSchema,
  AccessSearchQuerySchema,
  TerminalActivityQuerySchema,
  VisitsActivityQuerySchema,
} from "./access.schema.js";
import { accessController } from "./access.controller.js";
import { UserRole } from "@daih/types";

export const accessRouter = Router();

const STAFF_ACCESS_ROLES = [
  UserRole.RECEPTION_OFFICER,
  UserRole.SECURITY_OFFICER,
  UserRole.OPERATIONS_ADMIN,
  UserRole.SUPER_ADMIN,
  UserRole.MANAGEMENT_VIEWER,
];

const SCANNER_OPERATOR_ROLES = [
  UserRole.RECEPTION_OFFICER,
  UserRole.SECURITY_OFFICER,
  UserRole.OPERATIONS_ADMIN,
  UserRole.SUPER_ADMIN,
];

/**
 * GET /api/v1/access/qr/:bookingId
 * Digital access pass for booking owner or authorized staff
 */
accessRouter.get(
  "/qr/:bookingId",
  authenticate,
  validateParams(BookingIdParamSchema),
  accessController.getAccessPass.bind(accessController),
);

/**
 * POST /api/v1/access/verify-qr
 * Verify scanned QR token or reference string
 */
accessRouter.post(
  "/verify-qr",
  authenticate,
  requireRoles(SCANNER_OPERATOR_ROLES),
  validateBody(VerifyQrSchema),
  accessController.verifyPass.bind(accessController),
);

/**
 * POST /api/v1/access/checkin/:bookingId
 * Check in member at terminal
 */
accessRouter.post(
  "/checkin/:bookingId",
  authenticate,
  requireRoles(SCANNER_OPERATOR_ROLES),
  validateParams(BookingIdParamSchema),
  validateBody(CheckInSchema),
  accessController.checkIn.bind(accessController),
);

/**
 * POST /api/v1/access/checkout/:bookingId
 * Check out member at terminal
 */
accessRouter.post(
  "/checkout/:bookingId",
  authenticate,
  requireRoles(SCANNER_OPERATOR_ROLES),
  validateParams(BookingIdParamSchema),
  validateBody(CheckOutSchema),
  accessController.checkOut.bind(accessController),
);

/**
 * GET /api/v1/access/search
 * Search bookings for manual check-in
 */
accessRouter.get(
  "/search",
  authenticate,
  requireRoles(SCANNER_OPERATOR_ROLES),
  validateQuery(AccessSearchQuerySchema),
  accessController.searchBookings.bind(accessController),
);

/**
 * GET /api/v1/access/activity
 * Terminal shift activity feed
 */
accessRouter.get(
  "/activity",
  authenticate,
  requireRoles(STAFF_ACCESS_ROLES),
  validateQuery(TerminalActivityQuerySchema),
  accessController.getTerminalActivity.bind(accessController),
);

/**
 * GET /api/v1/access/visits
 * Filtered and paginated visits activity for check-in / check-out log audits
 */
accessRouter.get(
  "/visits",
  authenticate,
  requireRoles(STAFF_ACCESS_ROLES),
  validateQuery(VisitsActivityQuerySchema),
  accessController.getVisitsActivity.bind(accessController),
);

/**
 * GET /api/v1/access/occupancy
 * Real-time workspace occupancy
 */
accessRouter.get(
  "/occupancy",
  authenticate,
  requireRoles(STAFF_ACCESS_ROLES),
  accessController.getLiveOccupancy.bind(accessController),
);

/**
 * GET /api/v1/access/terminal-summary
 * Single-roundtrip reception terminal telemetry (shift metrics, live occupancy & activity)
 */
accessRouter.get(
  "/terminal-summary",
  authenticate,
  requireRoles(STAFF_ACCESS_ROLES),
  accessController.getTerminalSummary.bind(accessController),
);
