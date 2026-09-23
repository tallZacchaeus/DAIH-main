import { Request, Response, NextFunction } from "express";
import { reviewService, ReviewService } from "./review.service.js";
import {
  CreateReviewSchema,
  UpdateReviewSchema,
  AdminReviewFilterSchema,
  AdminStatusUpdateSchema,
  AdminReviewSettingSchema,
  AdminReplySchema,
  BookingIdParamSchema,
  ReviewIdParamSchema,
  ResourceIdParamSchema,
} from "./review.schema.js";
import { AuthRequest } from "../../middleware/auth.middleware.js";

export class ReviewController {
  constructor(private service: ReviewService = reviewService) {}

  /**
   * Public: Get featured reviews for marketing homepage
   * GET /api/v1/reviews/featured
   */
  getFeatured = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getFeaturedReviews();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Public: Get reviews for a workspace resource
   * GET /api/v1/reviews/resource/:resourceId
   */
  getResourceReviews = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { resourceId } = ResourceIdParamSchema.parse(req.params);
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 20;

      const data = await this.service.getResourceReviews(
        resourceId,
        page,
        limit,
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Customer: Check eligibility to review a booking
   * GET /api/v1/reviews/eligibility/:bookingId
   */
  checkEligibility = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { bookingId } = BookingIdParamSchema.parse(req.params);
      const userId = req.user!.id;
      const userRole = req.user!.role;

      const data = await this.service.checkEligibility(
        userId,
        userRole,
        bookingId,
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Customer: Submit a new review
   * POST /api/v1/reviews
   */
  submitReview = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const validated = CreateReviewSchema.parse(req.body);
      const userId = req.user!.id;
      const userRole = req.user!.role;

      const data = await this.service.submitReview(userId, userRole, validated);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Customer: Edit an existing review (within 48 hours)
   * PATCH /api/v1/reviews/:id
   */
  updateReview = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { id } = ReviewIdParamSchema.parse(req.params);
      const validated = UpdateReviewSchema.parse(req.body);
      const userId = req.user!.id;

      const data = await this.service.updateReview(userId, id, validated);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Admin: List reviews with moderation filters
   * GET /api/v1/reviews/admin
   */
  adminGetReviews = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const filters = AdminReviewFilterSchema.parse(req.query);
      const data = await this.service.adminGetReviews(filters);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Admin: Get platform review settings
   * GET /api/v1/reviews/admin/settings
   */
  adminGetSettings = async (
    _req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const data = await this.service.getSettings();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Admin: Update platform review settings (auto-publish toggle)
   * PATCH /api/v1/reviews/admin/settings
   */
  adminUpdateSettings = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const validated = AdminReviewSettingSchema.parse(req.body);
      const adminUserId = req.user!.id;

      const data = await this.service.updateSettings(adminUserId, validated);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Admin: Update review moderation status & homepage spotlight
   * PATCH /api/v1/reviews/admin/:id/status
   */
  adminUpdateStatus = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { id } = ReviewIdParamSchema.parse(req.params);
      const validated = AdminStatusUpdateSchema.parse(req.body);

      const data = await this.service.adminUpdateStatus(id, validated);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Admin: Post management reply
   * POST /api/v1/reviews/admin/:id/reply
   */
  adminReply = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = ReviewIdParamSchema.parse(req.params);
      const { reply } = AdminReplySchema.parse(req.body);
      const adminUserId = req.user!.id;

      const data = await this.service.adminReply(id, reply, adminUserId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };
}

export const reviewController = new ReviewController();
