import { Router } from "express";
import { bookingController } from "./booking.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import {
  requirePermission,
  requireAnyPermission,
} from "../../middleware/rbac.middleware.js";
import {
  validateBody,
  validateQuery,
  validateParams,
} from "../../middleware/validate.middleware.js";
import { Permission } from "@daih/types";
import {
  BookingIdParamSchema,
  CheckAvailabilitySchema,
  CalendarAvailabilitySchema,
  CreateHoldSchema,
  CancelBookingSchema,
  AdminOverrideBookingSchema,
  AdminNoShowRescheduleSchema,
  BookingFilterSchema,
  AnalyticsFilterSchema,
} from "./booking.schema.js";
import { discountController } from "../discounts/discount.controller.js";
import { ApplyCourtesyDiscountSchema } from "../discounts/discount.schema.js";

export const bookingRouter = Router();

// ==========================================
// Operations Admin Endpoints (RBAC Guarded)
// (Registered first so static /admin paths are not intercepted by /:id)
// ==========================================

const readBookingsGuard = [
  authenticate,
  requireAnyPermission([
    Permission.BOOKINGS_READ_ALL,
    Permission.BOOKINGS_MANAGE,
  ]),
];
const manageGuard = [
  authenticate,
  requirePermission(Permission.BOOKINGS_MANAGE),
];
const overrideGuard = [
  authenticate,
  requirePermission(Permission.BOOKINGS_OVERRIDE),
];

const viewReportsGuard = [
  authenticate,
  requireAnyPermission([Permission.REPORTS_VIEW, Permission.REPORTS_EXPORT]),
];

const dashboardSummaryGuard = [
  authenticate,
  requireAnyPermission([
    Permission.BOOKINGS_READ_ALL,
    Permission.BOOKINGS_MANAGE,
    Permission.REPORTS_VIEW,
  ]),
];

// Consolidated Admin Operations Dashboard Summary
bookingRouter.get(
  "/admin/dashboard-summary",
  ...dashboardSummaryGuard,
  bookingController.getDashboardSummary,
);

// Consolidated Admin Analytics Reports Summary (Restricted to Management, Finance, Ops Admin, Super Admin)
bookingRouter.get(
  "/admin/analytics-summary",
  ...viewReportsGuard,
  validateQuery(AnalyticsFilterSchema),
  bookingController.getAnalyticsSummary,
);

// List all bookings for Admin Console (accessible by all staff with BOOKINGS_READ_ALL)
bookingRouter.get(
  "/admin",
  ...readBookingsGuard,
  validateQuery(BookingFilterSchema),
  bookingController.getAdminBookings,
);

bookingRouter.get(
  "/admin/all",
  ...readBookingsGuard,
  validateQuery(BookingFilterSchema),
  bookingController.getAdminBookings,
);

// Manual VIP / Walk-in booking override
bookingRouter.post(
  "/admin/override",
  ...overrideGuard,
  validateBody(AdminOverrideBookingSchema),
  bookingController.adminOverride,
);

// Force release an active hold
bookingRouter.post(
  "/admin/:id/release",
  ...manageGuard,
  validateParams(BookingIdParamSchema),
  bookingController.adminReleaseHold,
);

// Discretionary reschedule for NO_SHOW booking (Operations Admin / Super Admin)
bookingRouter.post(
  "/admin/:id/reschedule-noshow",
  ...manageGuard,
  validateParams(BookingIdParamSchema),
  validateBody(AdminNoShowRescheduleSchema),
  bookingController.rescheduleNoShow,
);

// Staff courtesy discount on specific booking
bookingRouter.post(
  "/:id/courtesy-discount",
  ...overrideGuard,
  validateParams(BookingIdParamSchema),
  validateBody(ApplyCourtesyDiscountSchema),
  discountController.applyCourtesyDiscount,
);

// ==========================================
// Public & Customer Static Endpoints
// ==========================================

// Real-time availability search (open/public or authenticated)
bookingRouter.get(
  "/availability",
  validateQuery(CheckAvailabilitySchema),
  bookingController.checkAvailability,
);

// Sparse monthly calendar & hourly slot availability
bookingRouter.get(
  "/calendar-availability",
  validateQuery(CalendarAvailabilitySchema),
  bookingController.getCalendarAvailability,
);

// Create a 10-minute hold on a resource
bookingRouter.post(
  "/hold",
  authenticate,
  validateBody(CreateHoldSchema),
  bookingController.createHold,
);

// View customer's own bookings
bookingRouter.get("/my", authenticate, bookingController.getMyBookings);

// ==========================================
// Parameterized /:id Endpoints
// ==========================================

// Extend hold expiry (e.g. while on checkout / payment modal)
bookingRouter.post(
  "/:id/extend-hold",
  authenticate,
  validateParams(BookingIdParamSchema),
  bookingController.extendHold,
);

// Cancel an active booking / hold
bookingRouter.post(
  "/:id/cancel",
  authenticate,
  validateParams(BookingIdParamSchema),
  validateBody(CancelBookingSchema),
  bookingController.cancelBooking,
);

// Confirm booking (Operations staff only; customers confirm through verified payment webhook)
bookingRouter.post(
  "/:id/confirm",
  ...manageGuard,
  validateParams(BookingIdParamSchema),
  bookingController.confirmBooking,
);

// Get single booking by ID or reference
bookingRouter.get(
  "/:id",
  authenticate,
  validateParams(BookingIdParamSchema),
  bookingController.getBookingById,
);
