import { prisma } from "../../db/client.js";
import { ReviewStatus, Prisma } from "@prisma/client";
import {
  AdminReviewFilterDTO,
  CreateReviewDTO,
  UpdateReviewDTO,
  ResourceReviewsSummaryDTO,
} from "@daih/types";

export class ReviewRepository {
  /**
   * Retrieves or initializes platform review settings
   */
  async getSettings() {
    let settings = await prisma.reviewSetting.findUnique({
      where: { id: "default" },
    });

    if (!settings) {
      settings = await prisma.reviewSetting.create({
        data: {
          id: "default",
          requireApproval: true,
          isHomepageSpotlightEnabled: true,
        },
      });
    }

    return settings;
  }

  /**
   * Upserts platform review settings
   */
  async upsertSettings(data: {
    requireApproval: boolean;
    isHomepageSpotlightEnabled?: boolean;
    updatedBy?: string;
  }) {
    return prisma.reviewSetting.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        requireApproval: data.requireApproval,
        isHomepageSpotlightEnabled: data.isHomepageSpotlightEnabled ?? true,
        updatedBy: data.updatedBy,
      },
      update: {
        requireApproval: data.requireApproval,
        ...(data.isHomepageSpotlightEnabled !== undefined
          ? { isHomepageSpotlightEnabled: data.isHomepageSpotlightEnabled }
          : {}),
        updatedBy: data.updatedBy,
      },
    });
  }

  /**
   * Finds featured reviews for the public homepage.
   * Fetches explicitly pinned reviews first; if fewer than 3, backfills with 5-star approved reviews up to limit.
   */
  async findFeatured(limit = 6) {
    // 1. Fetch explicitly pinned reviews
    const pinned = await prisma.review.findMany({
      where: {
        status: ReviewStatus.APPROVED,
        isFeaturedOnHome: true,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        resource: {
          select: {
            id: true,
            name: true,
            slug: true,
            category: true,
          },
        },
        booking: {
          select: {
            id: true,
            reference: true,
            startTime: true,
            endTime: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    if (pinned.length >= limit || pinned.length >= 3) {
      return pinned;
    }

    // 2. Backfill with latest 5-star approved reviews
    const pinnedIds = pinned.map((r) => r.id);
    const needed = limit - pinned.length;

    const backfill = await prisma.review.findMany({
      where: {
        status: ReviewStatus.APPROVED,
        rating: 5,
        id: { notIn: pinnedIds },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        resource: {
          select: {
            id: true,
            name: true,
            slug: true,
            category: true,
          },
        },
        booking: {
          select: {
            id: true,
            reference: true,
            startTime: true,
            endTime: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: needed,
    });

    return [...pinned, ...backfill];
  }

  /**
   * Finds approved reviews and aggregate stats for a specific workspace resource
   */
  async findByResource(
    resourceIdOrSlug: string,
    page = 1,
    limit = 20,
  ): Promise<ResourceReviewsSummaryDTO> {
    // Find the resource first (by ID or Slug)
    const resource = await prisma.facilityResource.findFirst({
      where: {
        OR: [{ id: resourceIdOrSlug }, { slug: resourceIdOrSlug }],
      },
      select: { id: true },
    });

    const resourceId = resource?.id || resourceIdOrSlug;

    const skip = (page - 1) * limit;

    const [reviews, totalCount, aggregate, distribution] = await Promise.all([
      prisma.review.findMany({
        where: {
          resourceId,
          status: ReviewStatus.APPROVED,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
          booking: {
            select: {
              id: true,
              reference: true,
              startTime: true,
              endTime: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.review.count({
        where: {
          resourceId,
          status: ReviewStatus.APPROVED,
        },
      }),
      prisma.review.aggregate({
        where: {
          resourceId,
          status: ReviewStatus.APPROVED,
        },
        _avg: { rating: true },
      }),
      prisma.review.groupBy({
        by: ["rating"],
        where: {
          resourceId,
          status: ReviewStatus.APPROVED,
        },
        _count: { rating: true },
      }),
    ]);

    const breakdown = {
      fiveStar: 0,
      fourStar: 0,
      threeStar: 0,
      twoStar: 0,
      oneStar: 0,
    };

    distribution.forEach((d) => {
      if (d.rating === 5) breakdown.fiveStar = d._count.rating;
      if (d.rating === 4) breakdown.fourStar = d._count.rating;
      if (d.rating === 3) breakdown.threeStar = d._count.rating;
      if (d.rating === 2) breakdown.twoStar = d._count.rating;
      if (d.rating === 1) breakdown.oneStar = d._count.rating;
    });

    const avg = aggregate._avg.rating
      ? Number(aggregate._avg.rating.toFixed(1))
      : 5.0;

    return {
      resourceId,
      averageRating: avg,
      totalReviews: totalCount,
      ratingBreakdown: breakdown,
      reviews: reviews.map((r) => ({
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
   * Find a review by booking ID
   */
  async findByBooking(bookingId: string) {
    return prisma.review.findUnique({
      where: { bookingId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        resource: {
          select: {
            id: true,
            name: true,
            slug: true,
            category: true,
          },
        },
      },
    });
  }

  /**
   * Find a review by ID
   */
  async findById(id: string) {
    return prisma.review.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        resource: {
          select: {
            id: true,
            name: true,
            slug: true,
            category: true,
          },
        },
        booking: {
          select: {
            id: true,
            reference: true,
            startTime: true,
            endTime: true,
          },
        },
      },
    });
  }

  /**
   * Creates a new review
   */
  async create(data: {
    userId: string;
    bookingId: string;
    resourceId: string;
    rating: number;
    title?: string;
    comment: string;
    powerRating?: number;
    wifiRating?: number;
    comfortRating?: number;
    staffRating?: number;
    status: ReviewStatus;
  }) {
    return prisma.review.create({
      data: {
        userId: data.userId,
        bookingId: data.bookingId,
        resourceId: data.resourceId,
        rating: data.rating,
        title: data.title,
        comment: data.comment,
        powerRating: data.powerRating,
        wifiRating: data.wifiRating,
        comfortRating: data.comfortRating,
        staffRating: data.staffRating,
        status: data.status,
        isFeaturedOnHome: false,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        resource: {
          select: {
            id: true,
            name: true,
            slug: true,
            category: true,
          },
        },
      },
    });
  }

  /**
   * Updates an existing review (within edit window)
   */
  async update(
    id: string,
    data: UpdateReviewDTO & {
      status?: ReviewStatus;
      isFeaturedOnHome?: boolean;
    },
  ) {
    return prisma.review.update({
      where: { id },
      data: {
        ...(data.rating !== undefined ? { rating: data.rating } : {}),
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.comment !== undefined ? { comment: data.comment } : {}),
        ...(data.powerRating !== undefined
          ? { powerRating: data.powerRating }
          : {}),
        ...(data.wifiRating !== undefined
          ? { wifiRating: data.wifiRating }
          : {}),
        ...(data.comfortRating !== undefined
          ? { comfortRating: data.comfortRating }
          : {}),
        ...(data.staffRating !== undefined
          ? { staffRating: data.staffRating }
          : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.isFeaturedOnHome !== undefined
          ? { isFeaturedOnHome: data.isFeaturedOnHome }
          : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        resource: {
          select: {
            id: true,
            name: true,
            slug: true,
            category: true,
          },
        },
      },
    });
  }

  /**
   * Finds reviews for admin moderation
   */
  async findAdminList(filters: AdminReviewFilterDTO) {
    const where: Prisma.ReviewWhereInput = {};

    if (filters.status && filters.status !== "ALL") {
      where.status = filters.status as ReviewStatus;
    }

    if (filters.resourceId) {
      where.resourceId = filters.resourceId;
    }

    if (filters.rating) {
      where.rating = filters.rating;
    }

    if (filters.search) {
      const q = filters.search.trim();
      where.OR = [
        { comment: { contains: q, mode: "insensitive" } },
        { title: { contains: q, mode: "insensitive" } },
        { user: { firstName: { contains: q, mode: "insensitive" } } },
        { user: { lastName: { contains: q, mode: "insensitive" } } },
        { user: { email: { contains: q, mode: "insensitive" } } },
        { booking: { reference: { contains: q, mode: "insensitive" } } },
      ];
    }

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const [reviews, totalCount, stats] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatarUrl: true,
            },
          },
          resource: {
            select: {
              id: true,
              name: true,
              slug: true,
              category: true,
            },
          },
          booking: {
            select: {
              id: true,
              reference: true,
              startTime: true,
              endTime: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.review.count({ where }),
      prisma.review.aggregate({
        _avg: { rating: true },
        _count: { id: true },
      }),
    ]);

    const pendingCount = await prisma.review.count({
      where: { status: ReviewStatus.PENDING },
    });

    const featuredCount = await prisma.review.count({
      where: { isFeaturedOnHome: true, status: ReviewStatus.APPROVED },
    });

    return {
      reviews,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
      kpis: {
        averageRating: stats._avg.rating
          ? Number(stats._avg.rating.toFixed(1))
          : 5.0,
        totalReviews: stats._count.id,
        pendingCount,
        featuredCount,
      },
    };
  }

  /**
   * Updates moderation status and homepage feature flag.
   * Enforces invariant: if status !== APPROVED, isFeaturedOnHome is set to false.
   */
  async updateStatus(
    id: string,
    status: ReviewStatus,
    isFeaturedOnHome?: boolean,
  ) {
    const effectiveFeatured =
      status === ReviewStatus.APPROVED ? Boolean(isFeaturedOnHome) : false;

    return prisma.review.update({
      where: { id },
      data: {
        status,
        isFeaturedOnHome: effectiveFeatured,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        resource: {
          select: {
            id: true,
            name: true,
            slug: true,
            category: true,
          },
        },
      },
    });
  }

  /**
   * Records an official DAIH management response to a review
   */
  async saveReply(id: string, reply: string, adminUserId: string) {
    return prisma.review.update({
      where: { id },
      data: {
        adminReply: reply,
        adminRepliedAt: new Date(),
        adminRepliedBy: adminUserId,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });
  }
}

export const reviewRepository = new ReviewRepository();
