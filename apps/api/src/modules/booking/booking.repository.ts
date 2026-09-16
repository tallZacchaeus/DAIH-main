import { prisma } from "../../db/client.js";
import { BookingState, Prisma } from "@prisma/client";
import { ACTIVE_BOOKING_STATES } from "./booking.state-machine.js";

export class BookingRepository {
  /**
   * Find a bookable resource by ID or Slug with active pricing, schedules, and blackouts
   */
  async findResource(idOrSlug: string) {
    return prisma.facilityResource.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: {
        pricing: {
          where: { isActive: true },
          orderBy: { price: "asc" },
        },
        schedules: {
          orderBy: { dayOfWeek: "asc" },
        },
        blackouts: {
          where: { isActive: true },
          orderBy: { startDate: "asc" },
        },
      },
    });
  }

  /**
   * Count active overlapping bookings/holds for a given resource and time window.
   * Excludes expired holds automatically.
   */
  async countActiveOverlappingBookings(
    tx: Prisma.TransactionClient | typeof prisma,
    resourceId: string,
    startTime: Date,
    endTime: Date,
    excludeBookingId?: string,
  ): Promise<number> {
    const now = new Date();

    return tx.booking.count({
      where: {
        resourceId,
        ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
        state: { in: ACTIVE_BOOKING_STATES },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
        OR: [
          // Confirmed/Active bookings don't expire
          {
            state: {
              in: [
                BookingState.CONFIRMED,
                BookingState.ACTIVE,
                BookingState.CHECKED_IN,
              ],
            },
          },
          // Holds or Pending Payment are only active if not yet expired
          {
            state: { in: [BookingState.HELD, BookingState.PENDING_PAYMENT] },
            OR: [{ holdExpiresAt: null }, { holdExpiresAt: { gt: now } }],
          },
        ],
      },
    });
  }

  /**
   * Create a new booking in HELD state
   */
  async createHold(
    tx: Prisma.TransactionClient | typeof prisma,
    data: {
      reference: string;
      resourceId: string;
      userId: string;
      startTime: Date;
      endTime: Date;
      totalAmount: number | Prisma.Decimal;
      originalAmount?: number | Prisma.Decimal;
      discountAmount?: number | Prisma.Decimal;
      discountId?: string;
      discountCode?: string;
      currency?: string;
      holdExpiresAt: Date;
    },
  ) {
    return tx.booking.create({
      data: {
        reference: data.reference,
        resourceId: data.resourceId,
        userId: data.userId,
        startTime: data.startTime,
        endTime: data.endTime,
        state: BookingState.HELD,
        holdExpiresAt: data.holdExpiresAt,
        totalAmount: data.totalAmount,
        originalAmount: data.originalAmount,
        discountAmount: data.discountAmount ?? 0,
        discountId: data.discountId,
        discountCode: data.discountCode,
        currency: data.currency || "NGN",
      },
      include: {
        resource: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            clientId: true,
            phoneNumber: true,
          },
        },
      },
    });
  }

  /**
   * Find booking by unique ID
   */
  async findById(id: string) {
    return prisma.booking.findUnique({
      where: { id },
      include: {
        resource: {
          include: {
            pricing: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            clientId: true,
            phoneNumber: true,
          },
        },
        transactions: true,
        visitSessions: {
          orderBy: { checkInTime: "desc" },
          take: 5,
        },
      },
    });
  }

  /**
   * Find booking by human-readable reference number
   */
  async findByReference(reference: string) {
    return prisma.booking.findUnique({
      where: { reference },
      include: {
        resource: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            clientId: true,
            phoneNumber: true,
          },
        },
        transactions: true,
        visitSessions: {
          orderBy: { checkInTime: "desc" },
          take: 5,
        },
      },
    });
  }

  /**
   * Find customer's own bookings (with automatic overdue sweep)
   */
  async findMyBookings(userId: string) {
    return prisma.booking.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        resource: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            clientId: true,
          },
        },
        visitSessions: {
          orderBy: { checkInTime: "desc" },
          take: 5,
        },
      },
    });
  }

  /**
   * Find all bookings for Admin console with filters and pagination
   */
  async findAllAdminBookings(filters: {
    state?: string;
    resourceId?: string;
    userId?: string;
    search?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.max(1, Math.min(1000, filters.limit || 20));
    const skip = (page - 1) * limit;

    const now = new Date();
    const isActiveFilter = filters.state === "ACTIVE";

    const where: Prisma.BookingWhereInput = {
      ...(isActiveFilter
        ? {
            state: BookingState.CONFIRMED,
            startTime: { lte: now },
            endTime: { gte: now },
          }
        : filters.state
          ? { state: filters.state as BookingState }
          : {
              state: {
                notIn: [
                  BookingState.EXPIRED,
                  BookingState.DRAFT,
                  BookingState.HELD,
                  BookingState.PENDING_PAYMENT,
                ],
              },
            }),
      ...(filters.resourceId ? { resourceId: filters.resourceId } : {}),
      ...(filters.userId ? { userId: filters.userId } : {}),
      ...(!isActiveFilter && (filters.startDate || filters.endDate)
        ? {
            startTime: {
              ...(filters.startDate ? { gte: filters.startDate } : {}),
              ...(filters.endDate ? { lte: filters.endDate } : {}),
            },
          }
        : {}),
      ...(filters.search
        ? {
            OR: [
              { reference: { contains: filters.search, mode: "insensitive" } },
              {
                user: {
                  email: { contains: filters.search, mode: "insensitive" },
                },
              },
              {
                user: {
                  firstName: { contains: filters.search, mode: "insensitive" },
                },
              },
              {
                user: {
                  lastName: { contains: filters.search, mode: "insensitive" },
                },
              },
              {
                resource: {
                  name: { contains: filters.search, mode: "insensitive" },
                },
              },
            ],
          }
        : {}),
    };

    const [total, bookings] = await prisma.$transaction([
      prisma.booking.count({ where }),
      prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          resource: true,
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              clientId: true,
              phoneNumber: true,
            },
          },
        },
      }),
    ]);

    return { total, bookings, page, limit };
  }

  /**
   * Update booking state inside a transaction or standalone
   */
  async updateState(
    tx: Prisma.TransactionClient | typeof prisma,
    id: string,
    toState: BookingState,
    extraData: {
      qrToken?: string;
      checkedInAt?: Date;
      checkedOutAt?: Date;
      holdExpiresAt?: Date | null;
    } = {},
  ) {
    return tx.booking.update({
      where: { id },
      data: {
        state: toState,
        ...extraData,
      },
      include: {
        resource: true,
        user: true,
      },
    });
  }

  /**
   * Extend hold expiry timestamp
   */
  async extendHold(
    tx: Prisma.TransactionClient | typeof prisma,
    id: string,
    newExpiresAt: Date,
  ) {
    return tx.booking.update({
      where: { id },
      data: {
        holdExpiresAt: newExpiresAt,
      },
      include: {
        resource: true,
        user: true,
      },
    });
  }

  /**
   * Bulk updates all overdue HELD / PENDING_PAYMENT bookings to EXPIRED
   */
  async sweepOverdueHolds(now: Date = new Date()): Promise<number> {
    const result = await prisma.booking.updateMany({
      where: {
        state: { in: [BookingState.HELD, BookingState.PENDING_PAYMENT] },
        holdExpiresAt: { lte: now },
      },
      data: {
        state: BookingState.EXPIRED,
      },
    });
    return result.count;
  }

  /**
   * Bulk updates overdue CONFIRMED bookings with no check-in to NO_SHOW,
   * and overdue CHECKED_IN/ACTIVE bookings to COMPLETED.
   */
  async sweepOverdueBookings(
    now: Date = new Date(),
  ): Promise<{ noShowCount: number; completedCount: number }> {
    const [noShowResult, completedResult] = await Promise.all([
      // 1. Confirmed bookings whose end time has passed and never checked in -> NO_SHOW
      prisma.booking.updateMany({
        where: {
          state: BookingState.CONFIRMED,
          endTime: { lte: now },
          checkedInAt: null,
        },
        data: {
          state: BookingState.NO_SHOW,
        },
      }),
      // 2. Checked-in / Active / Checked-out bookings whose end time has passed -> COMPLETED
      prisma.booking.updateMany({
        where: {
          state: {
            in: [
              BookingState.CHECKED_IN,
              BookingState.ACTIVE,
              BookingState.CHECKED_OUT,
            ],
          },
          endTime: { lte: now },
        },
        data: {
          state: BookingState.COMPLETED,
        },
      }),
    ]);

    return {
      noShowCount: noShowResult.count,
      completedCount: completedResult.count,
    };
  }
}

export const bookingRepository = new BookingRepository();
