import { Request, Response, NextFunction } from "express";
import { bookingService, BookingService } from "./booking.service.js";
import {
  CheckAvailabilitySchema,
  CalendarAvailabilitySchema,
  CreateHoldSchema,
  CancelBookingSchema,
  AdminOverrideBookingSchema,
  AdminNoShowRescheduleSchema,
  BookingFilterSchema,
} from "./booking.schema.js";
import { AuthRequest } from "../../middleware/auth.middleware.js";

function getIpAddress(req: Request): string | undefined {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  if (Array.isArray(forwarded)) return forwarded[0];
  return req.ip || undefined;
}

export class BookingController {
  constructor(private service: BookingService = bookingService) {}

  /**
   * Check real-time resource availability
   * GET /api/v1/bookings/availability?resourceId=...&startTime=...&endTime=...
   */
  checkAvailability = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const validated = CheckAvailabilitySchema.parse(req.query);
      const data = await this.service.checkAvailability(validated);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Get sparse monthly calendar availability map
   * GET /api/v1/bookings/calendar-availability?resourceId=...&month=YYYY-MM
   */
  getCalendarAvailability = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const validated = CalendarAvailabilitySchema.parse(req.query);
      const data = await this.service.getCalendarAvailability(validated);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Create a 10-minute hold on a resource
   * POST /api/v1/bookings/hold
   */
  createHold = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const validated = CreateHoldSchema.parse(req.body);
      const userId = req.user!.id;
      const data = await this.service.createHold(userId, validated);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Extend hold expiry (e.g. during payment checkout)
   * POST /api/v1/bookings/:id/extend-hold
   */
  extendHold = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const bookingId = String(req.params.id);
      const userId = req.user!.id;
      const data = await this.service.extendHold(bookingId, userId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Get authenticated user's bookings
   * GET /api/v1/bookings/my
   */
  getMyBookings = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const userId = req.user!.id;
      const data = await this.service.getMyBookings(userId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Get single booking by ID or reference
   * GET /api/v1/bookings/:id
   */
  getBookingById = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const bookingId = String(req.params.id);
      const data = await this.service.getBookingById(bookingId);

      if (!data) {
        res.status(404).json({
          code: "BOOKING_NOT_FOUND",
          message: `Booking '${bookingId}' was not found`,
        });
        return;
      }

      // Allow owner or staff
      const isOwner = data.userId === req.user?.id;
      const isStaff =
        req.user?.role &&
        [
          "OPERATIONS_ADMIN",
          "SUPER_ADMIN",
          "RECEPTION_OFFICER",
          "FINANCE_OFFICER",
        ].includes(req.user.role);
      if (!isOwner && !isStaff) {
        res.status(403).json({
          code: "FORBIDDEN",
          message: "You are not authorized to view this booking",
        });
        return;
      }

      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Cancel an active booking
   * POST /api/v1/bookings/:id/cancel
   */
  cancelBooking = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const bookingId = String(req.params.id);
      const validated = CancelBookingSchema.parse(req.body);
      const userId = req.user!.id;
      const role = req.user?.role;

      const data = await this.service.cancelBooking(
        bookingId,
        userId,
        validated.reason,
        role,
      );
      res.json({
        success: true,
        message: "Booking cancelled successfully",
        booking: data,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Confirm booking
   * POST /api/v1/bookings/:id/confirm
   */
  confirmBooking = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const bookingId = String(req.params.id);
      const data = await this.service.confirmBooking(bookingId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Admin: View all bookings with filters & pagination
   * GET /api/v1/bookings/admin/all
   */
  getAdminBookings = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const validated = BookingFilterSchema.parse(req.query);
      const data = await this.service.getAdminBookings(validated);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Admin: Manual override / VIP force reservation
   * POST /api/v1/bookings/admin/override
   */
  adminOverride = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const validated = AdminOverrideBookingSchema.parse(req.body);
      const adminUserId = req.user!.id;
      const ipAddress = getIpAddress(req);

      const data = await this.service.adminOverride(
        adminUserId,
        validated,
        ipAddress,
      );
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Admin: Force-release an active hold
   * POST /api/v1/bookings/admin/:id/release
   */
  adminReleaseHold = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const bookingId = String(req.params.id);
      const adminUserId = req.user!.id;
      await this.service.cancelBooking(
        bookingId,
        adminUserId,
        "Admin manual hold release",
        req.user?.role,
      );
      res.json({
        success: true,
        message: `Hold for booking '${bookingId}' has been released.`,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Admin: Discretionary Reschedule for NO_SHOW booking
   * POST /api/v1/bookings/admin/:id/reschedule-noshow
   */
  rescheduleNoShow = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const bookingId = String(req.params.id);
      const validated = AdminNoShowRescheduleSchema.parse(req.body);
      const adminUserId = req.user!.id;
      const ipAddress = getIpAddress(req);

      const data = await this.service.rescheduleNoShowBooking(
        bookingId,
        adminUserId,
        validated,
        ipAddress,
      );
      res.json({
        success: true,
        message: "No-show booking has been rescheduled successfully.",
        data,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Consolidated Admin Operations Dashboard Summary
   * GET /api/v1/bookings/admin/dashboard-summary
   */
  getDashboardSummary = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const data = await this.service.getDashboardSummary(
        req.user?.role as any,
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Consolidated Admin Analytics Reports Summary
   * GET /api/v1/bookings/admin/analytics-summary
   */
  getAnalyticsSummary = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { startDate, endDate, preset } = req.query;
      const data = await this.service.getAnalyticsSummary({
        startDate: startDate ? String(startDate) : undefined,
        endDate: endDate ? String(endDate) : undefined,
        preset: preset ? String(preset) : undefined,
      });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };
}

export const bookingController = new BookingController();
