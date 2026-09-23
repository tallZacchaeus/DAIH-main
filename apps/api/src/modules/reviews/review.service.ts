import { prisma } from "../../db/client.js";
import { BookingState, ReviewStatus, UserRole } from "@prisma/client";
import { reviewRepository, ReviewRepository } from "./review.repository.js";
import {
  CreateReviewDTO,
  UpdateReviewDTO,
  AdminReviewFilterDTO,
  ReviewEligibilityDTO,
  UpdateReviewStatusDTO,
  UpdateReviewSettingDTO,
} from "@daih/types";

export class ReviewService {
  constructor(private repo: ReviewRepository = reviewRepository) {}

  /**
   * Evaluates whether a customer is eligible to review a given booking.
   * Enforces:
   * - CUSTOMER role
   * - Booking ownership
   * - Non-disqualified booking states
   * - Mandatory physical check-in proof (no-show prevention)
   * - Session completion OR pro-rated 30-min mid-stay
   * - Exactly 1 review per booking reference
   */
  async checkEligibility(
    userId: string,
    userRole: string,
    bookingId: string,
  ): Promise<ReviewEligibilityDTO> {
    // 1. Check if review already exists
    const existing = await this.repo.findByBooking(bookingId);
    if (existing) {
      const isWithin48h =
        Date.now() - new Date(existing.createdAt).getTime() <=
        48 * 60 * 60 * 1000;
      return {
        eligible: false,
        hasReviewed: true,
        canEdit: isWithin48h,
        existingReview: {
          ...existing,
          createdAt: existing.createdAt.toISOString(),
          updatedAt: existing.updatedAt.toISOString(),
          adminRepliedAt: existing.adminRepliedAt
            ? existing.adminRepliedAt.toISOString()
            : null,
          status: existing.status as any,
        },
        bookingId,
        reason: "You have already reviewed this workspace stay.",
      };
    }

    // 2. Only customer accounts can submit reviews
    if (userRole !== UserRole.CUSTOMER) {
      return {
        eligible: false,
        hasReviewed: false,
        bookingId,
        reason: "Only customer accounts can submit reviews.",
      };
    }

    // 3. Fetch booking with physical check-in records
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { visitSessions: true, resource: true },
    });

    if (!booking) {
      return {
        eligible: false,
        hasReviewed: false,
        bookingId,
        reason: "Booking not found.",
      };
    }

    // 4. Booking ownership
    if (booking.userId !== userId) {
      return {
        eligible: false,
        hasReviewed: false,
        bookingId,
        reason: "You do not own this booking.",
      };
    }

    // 5. Disqualified states (DAIH No-Refund Policy & Incomplete Bookings)
    const DISQUALIFIED: BookingState[] = [
      BookingState.CANCELLED,
      BookingState.NO_SHOW,
      BookingState.EXPIRED,
      BookingState.DRAFT,
      BookingState.HELD,
      BookingState.PENDING_PAYMENT,
    ];
    if (DISQUALIFIED.includes(booking.state)) {
      return {
        eligible: false,
        hasReviewed: false,
        bookingId,
        reason: `Bookings in '${booking.state}' state are not eligible for review.`,
      };
    }

    // 6. Mandatory Proof of Physical Arrival / Check-in
    const hasCheckedIn =
      booking.checkedInAt !== null ||
      (booking.visitSessions && booking.visitSessions.length > 0);

    if (!hasCheckedIn) {
      return {
        eligible: false,
        hasReviewed: false,
        bookingId,
        reason:
          "Only members who have physically checked in and used the workspace can submit a review.",
      };
    }

    // 7. Timing & Session Conclusion Gate (supports hourly bookings and 30-min mid-stay)
    const now = new Date();
    const isCheckoutDone =
      booking.state === BookingState.CHECKED_OUT ||
      booking.checkedOutAt !== null ||
      booking.visitSessions.some((s) => s.checkOutTime !== null);

    const isTimeElapsed = now >= new Date(booking.endTime);
    const isCompleted = booking.state === BookingState.COMPLETED;

    // Calculate pro-rated minimum stay for active mid-stay reviews (min 30 mins or half session)
    const firstCheckIn = booking.checkedInAt
      ? new Date(booking.checkedInAt)
      : new Date(booking.visitSessions[0].checkInTime);

    const sessionDurationMinutes =
      (new Date(booking.endTime).getTime() -
        new Date(booking.startTime).getTime()) /
      (60 * 1000);
    const minStayMinutes = Math.min(
      30,
      Math.max(5, sessionDurationMinutes / 2),
    );
    const hasSpentMinTime =
      now.getTime() - firstCheckIn.getTime() >= minStayMinutes * 60 * 1000;

    if (!isCheckoutDone && !isTimeElapsed && !isCompleted && !hasSpentMinTime) {
      return {
        eligible: false,
        hasReviewed: false,
        bookingId,
        reason: `You can review after checking out, once your scheduled session ends, or after spending at least ${Math.round(minStayMinutes)} minutes on-site.`,
      };
    }

    return {
      eligible: true,
      hasReviewed: false,
      bookingId,
    };
  }

  /**
   * Submits a customer review for an eligible booking
   */
  async submitReview(userId: string, userRole: string, dto: CreateReviewDTO) {
    const eligibility = await this.checkEligibility(
      userId,
      userRole,
      dto.bookingId,
    );
    if (!eligibility.eligible) {
      const error: any = new Error(
        eligibility.reason || "Booking is not eligible for review",
      );
      error.statusCode = 403;
      error.code = "REVIEW_NOT_ELIGIBLE";
      throw error;
    }

    const booking = await prisma.booking.findUnique({
      where: { id: dto.bookingId },
      select: { resourceId: true },
    });

    if (!booking) {
      const error: any = new Error("Associated booking not found");
      error.statusCode = 404;
      error.code = "BOOKING_NOT_FOUND";
      throw error;
    }

    // Check platform review settings
    const settings = await this.repo.getSettings();
    const initialStatus = settings.requireApproval
      ? ReviewStatus.PENDING
      : ReviewStatus.APPROVED;

    const review = await this.repo.create({
      userId,
      bookingId: dto.bookingId,
      resourceId: booking.resourceId,
      rating: dto.rating,
      title: dto.title,
      comment: dto.comment,
      powerRating: dto.powerRating,
      wifiRating: dto.wifiRating,
      comfortRating: dto.comfortRating,
      staffRating: dto.staffRating,
      status: initialStatus,
    });

    return {
      review: {
        ...review,
        createdAt: review.createdAt.toISOString(),
        updatedAt: review.updatedAt.toISOString(),
        status: review.status as any,
      },
      message: settings.requireApproval
        ? "Thank you for your feedback! Your review has been submitted and is pending operations review."
        : "Thank you for your feedback! Your review has been published.",
    };
  }

  /**
   * Updates an existing review (within 48-hour window).
   * Resets status to PENDING if requireApproval is true.
   */
  async updateReview(userId: string, reviewId: string, dto: UpdateReviewDTO) {
    const existing = await this.repo.findById(reviewId);
    if (!existing) {
      const error: any = new Error("Review not found");
      error.statusCode = 404;
      error.code = "REVIEW_NOT_FOUND";
      throw error;
    }

    if (existing.userId !== userId) {
      const error: any = new Error("Unauthorized to edit this review");
      error.statusCode = 403;
      error.code = "FORBIDDEN";
      throw error;
    }

    const ageMs = Date.now() - new Date(existing.createdAt).getTime();
    if (ageMs > 48 * 60 * 60 * 1000) {
      const error: any = new Error(
        "Reviews can only be edited within 48 hours of submission",
      );
      error.statusCode = 400;
      error.code = "EDIT_WINDOW_EXPIRED";
      throw error;
    }

    const settings = await this.repo.getSettings();
    const newStatus = settings.requireApproval
      ? ReviewStatus.PENDING
      : existing.status;
    const isFeaturedOnHome = settings.requireApproval
      ? false
      : existing.isFeaturedOnHome;

    const updated = await this.repo.update(reviewId, {
      ...dto,
      status: newStatus,
      isFeaturedOnHome,
    });

    return {
      review: {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
        status: updated.status as any,
      },
      message: settings.requireApproval
        ? "Your review has been updated and resubmitted for admin approval."
        : "Your review has been updated successfully.",
    };
  }

  /**
   * Public: Fetches featured reviews for the homepage (with backfill)
   */
  async getFeaturedReviews() {
    const reviews = await this.repo.findFeatured(6);
    return reviews.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      adminRepliedAt: r.adminRepliedAt ? r.adminRepliedAt.toISOString() : null,
      status: r.status as any,
      booking: r.booking
        ? {
            ...r.booking,
            startTime: r.booking.startTime.toISOString(),
            endTime: r.booking.endTime.toISOString(),
          }
        : undefined,
    }));
  }

  /**
   * Public: Fetches approved reviews and rating breakdown for a workspace
   */
  async getResourceReviews(resourceId: string, page = 1, limit = 20) {
    return this.repo.findByResource(resourceId, page, limit);
  }

  /**
   * Admin: Retrieves platform review settings
   */
  async getSettings() {
    const s = await this.repo.getSettings();
    return {
      id: s.id,
      requireApproval: s.requireApproval,
      isHomepageSpotlightEnabled: s.isHomepageSpotlightEnabled,
      updatedAt: s.updatedAt.toISOString(),
      updatedBy: s.updatedBy,
    };
  }

  /**
   * Admin: Updates platform review settings (auto-publish toggle)
   */
  async updateSettings(adminUserId: string, dto: UpdateReviewSettingDTO) {
    const updated = await this.repo.upsertSettings({
      requireApproval: dto.requireApproval,
      isHomepageSpotlightEnabled: dto.isHomepageSpotlightEnabled,
      updatedBy: adminUserId,
    });

    return {
      id: updated.id,
      requireApproval: updated.requireApproval,
      isHomepageSpotlightEnabled: updated.isHomepageSpotlightEnabled,
      updatedAt: updated.updatedAt.toISOString(),
      updatedBy: updated.updatedBy,
    };
  }

  /**
   * Admin: Lists reviews with moderation filters and metrics
   */
  async adminGetReviews(filters: AdminReviewFilterDTO) {
    const result = await this.repo.findAdminList(filters);
    return {
      ...result,
      reviews: result.reviews.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        adminRepliedAt: r.adminRepliedAt
          ? r.adminRepliedAt.toISOString()
          : null,
        status: r.status as any,
        booking: r.booking
          ? {
              ...r.booking,
              startTime: r.booking.startTime.toISOString(),
              endTime: r.booking.endTime.toISOString(),
            }
          : undefined,
      })),
    };
  }

  /**
   * Admin: Updates review moderation status and homepage spotlight flag
   */
  async adminUpdateStatus(id: string, dto: UpdateReviewStatusDTO) {
    const existing = await this.repo.findById(id);
    if (!existing) {
      const error: any = new Error("Review not found");
      error.statusCode = 404;
      error.code = "REVIEW_NOT_FOUND";
      throw error;
    }

    const updated = await this.repo.updateStatus(
      id,
      dto.status as ReviewStatus,
      dto.isFeaturedOnHome,
    );
    return {
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      status: updated.status as any,
    };
  }

  /**
   * Admin: Post official DAIH management reply
   */
  async adminReply(id: string, reply: string, adminUserId: string) {
    const existing = await this.repo.findById(id);
    if (!existing) {
      const error: any = new Error("Review not found");
      error.statusCode = 404;
      error.code = "REVIEW_NOT_FOUND";
      throw error;
    }

    const updated = await this.repo.saveReply(id, reply, adminUserId);
    return {
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      adminRepliedAt: updated.adminRepliedAt
        ? updated.adminRepliedAt.toISOString()
        : null,
      status: updated.status as any,
    };
  }
}

export const reviewService = new ReviewService();
