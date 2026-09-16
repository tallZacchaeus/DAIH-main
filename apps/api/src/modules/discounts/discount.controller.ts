import { Request, Response, NextFunction } from "express";
import { discountService, DiscountService } from "./discount.service.js";
import {
  CreateDiscountSchema,
  UpdateDiscountSchema,
  PreviewDiscountSchema,
  ApplyCourtesyDiscountSchema,
  DiscountFilterSchema,
} from "./discount.schema.js";
import { AuthRequest } from "../../middleware/auth.middleware.js";

function getIpAddress(req: Request): string | undefined {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  if (Array.isArray(forwarded)) return forwarded[0];
  return req.ip || undefined;
}

export class DiscountController {
  constructor(private service: DiscountService = discountService) {}

  /**
   * Preview discount calculation for customer or staff
   * POST /api/v1/discounts/preview
   */
  previewDiscount = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const validated = PreviewDiscountSchema.parse(req.body);
      const userId = req.user?.id || "anonymous";
      const data = await this.service.previewDiscount(userId, validated);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Staff Courtesy Override
   * POST /api/v1/bookings/:id/courtesy-discount
   * OR POST /api/v1/discounts/courtesy-override
   */
  applyCourtesyDiscount = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const bookingId = req.params.id || req.body.bookingId;
      if (!bookingId) {
        return res.status(400).json({
          success: false,
          error: "Booking ID is required",
        });
      }
      const validated = ApplyCourtesyDiscountSchema.parse(req.body);
      const staffUserId = req.user!.id;
      const ipAddress = getIpAddress(req);
      const userAgent = req.headers["user-agent"];

      const result = await this.service.applyCourtesyOverride(
        staffUserId,
        bookingId,
        validated,
        ipAddress,
        userAgent,
      );

      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  /**
   * Admin: List all discount rules
   * GET /api/v1/discounts
   */
  listDiscounts = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const filters = DiscountFilterSchema.parse(req.query);
      const data = await this.service.listDiscounts(filters as any);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Admin: Get single discount rule by ID
   * GET /api/v1/discounts/:id
   */
  getDiscountById = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const id = String(req.params.id);
      const data = await this.service.getDiscountById(id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Admin: Create a new discount rule
   * POST /api/v1/discounts
   */
  createDiscount = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const validated = CreateDiscountSchema.parse(req.body);
      const staffUserId = req.user!.id;
      const ipAddress = getIpAddress(req);

      const data = await this.service.createDiscount(
        validated,
        staffUserId,
        ipAddress,
      );
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Admin: Update discount rule
   * PUT /api/v1/discounts/:id
   */
  updateDiscount = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const id = String(req.params.id);
      const validated = UpdateDiscountSchema.parse(req.body);
      const staffUserId = req.user!.id;
      const ipAddress = getIpAddress(req);

      const data = await this.service.updateDiscount(
        id,
        validated,
        staffUserId,
        ipAddress,
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Admin: Fast toggle discount active status
   * PATCH /api/v1/discounts/:id/status
   */
  toggleDiscountStatus = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const id = String(req.params.id);
      const isActive = Boolean(req.body.isActive);
      const staffUserId = req.user!.id;
      const ipAddress = getIpAddress(req);

      const data = await this.service.toggleDiscountStatus(
        id,
        isActive,
        staffUserId,
        ipAddress,
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Admin: Delete discount rule
   * DELETE /api/v1/discounts/:id
   */
  deleteDiscount = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const id = String(req.params.id);
      const staffUserId = req.user!.id;
      const ipAddress = getIpAddress(req);

      const data = await this.service.deleteDiscount(
        id,
        staffUserId,
        ipAddress,
      );
      res.json(data);
    } catch (err) {
      next(err);
    }
  };

  /**
   * Admin: Get redemption audit logs
   * GET /api/v1/discounts/:id/redemptions OR /api/v1/discounts/redemptions/all
   */
  getRedemptions = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const discountId =
        req.params.id && req.params.id !== "all"
          ? String(req.params.id)
          : undefined;
      const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
      const limit = req.query.limit
        ? parseInt(String(req.query.limit), 10)
        : 20;

      const data = await this.service.getRedemptions(discountId, {
        page,
        limit,
      });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };
}

export const discountController = new DiscountController();
