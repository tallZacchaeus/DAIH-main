import { prisma } from "../../db/client.js";
import { BookingState } from "@daih/types";

export class AccessRepository {
  /**
   * Find booking by QR token
   */
  async findBookingByToken(qrToken: string) {
    return prisma.booking.findFirst({
      where: { qrToken },
      include: {
        resource: true,
        user: true,
        visitSessions: {
          orderBy: { checkInTime: "desc" },
        },
      },
    });
  }

  /**
   * Find booking by ID or Reference
   */
  async findBookingByIdOrReference(idOrReference: string) {
    return prisma.booking.findFirst({
      where: {
        OR: [{ id: idOrReference }, { reference: idOrReference }],
      },
      include: {
        resource: true,
        user: true,
        visitSessions: {
          orderBy: { checkInTime: "desc" },
        },
      },
    });
  }

  /**
   * Search bookings for reception manual lookup
   */
  async searchBookings(query: string, limit = 10) {
    const clean = query.trim();
    if (!clean) return [];

    return prisma.booking.findMany({
      where: {
        OR: [
          { reference: { contains: clean, mode: "insensitive" } },
          { id: { contains: clean, mode: "insensitive" } },
          { user: { email: { contains: clean, mode: "insensitive" } } },
          { user: { firstName: { contains: clean, mode: "insensitive" } } },
          { user: { lastName: { contains: clean, mode: "insensitive" } } },
          { user: { clientId: { contains: clean, mode: "insensitive" } } },
          { user: { phoneNumber: { contains: clean, mode: "insensitive" } } },
        ],
      },
      include: {
        resource: true,
        user: true,
        visitSessions: {
          orderBy: { checkInTime: "desc" },
        },
      },
      orderBy: { startTime: "desc" },
      take: limit,
    });
  }

  /**
   * Find the current active (open) visit session for a booking
   */
  async findActiveVisitSession(bookingId: string) {
    return prisma.visitSession.findFirst({
      where: {
        bookingId,
        checkOutTime: null,
      },
      orderBy: { checkInTime: "desc" },
    });
  }

  /**
   * Create a new visit session upon check-in
   */
  async createVisitSession(data: {
    bookingId: string;
    userId: string;
    staffUserId?: string | null;
    terminalId?: string;
    ipAddress?: string;
    notes?: string;
  }) {
    return prisma.visitSession.create({
      data: {
        bookingId: data.bookingId,
        userId: data.userId,
        staffUserId: data.staffUserId,
        terminalId: data.terminalId || "REC-GATE-01",
        checkInTime: new Date(),
        ipAddress: data.ipAddress,
        notes: data.notes,
      },
    });
  }

  /**
   * Close active visit session upon check-out
   */
  async closeVisitSession(visitSessionId: string, notes?: string) {
    return prisma.visitSession.update({
      where: { id: visitSessionId },
      data: {
        checkOutTime: new Date(),
        notes: notes ? notes : undefined,
      },
    });
  }

  /**
   * Update booking state to CHECKED_IN
   */
  async markBookingCheckedIn(bookingId: string, isFirstCheckIn: boolean) {
    return prisma.booking.update({
      where: { id: bookingId },
      data: {
        state: BookingState.CHECKED_IN,
        ...(isFirstCheckIn ? { checkedInAt: new Date() } : {}),
      },
      include: {
        resource: true,
        user: true,
      },
    });
  }

  /**
   * Update booking state to CHECKED_OUT
   */
  async markBookingCheckedOut(bookingId: string) {
    return prisma.booking.update({
      where: { id: bookingId },
      data: {
        state: BookingState.CHECKED_OUT,
        checkedOutAt: new Date(),
      },
      include: {
        resource: true,
        user: true,
      },
    });
  }

  /**
   * Fetch recent terminal activity (visit sessions)
   */
  async getTerminalActivity(options: {
    terminalId?: string;
    limit?: number;
    offset?: number;
  }) {
    const { terminalId, limit = 50, offset = 0 } = options;

    return prisma.visitSession.findMany({
      where: terminalId ? { terminalId } : {},
      include: {
        booking: {
          include: {
            resource: true,
            user: true,
          },
        },
        user: true,
      },
      orderBy: { checkInTime: "desc" },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Fetch paginated and filtered visits for log audits
   */
  async getVisitsActivity(options: {
    terminalId?: string;
    startDate?: string;
    endDate?: string;
    status?: "ALL" | "ON_SITE" | "CHECKED_OUT";
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};
    if (options.terminalId) {
      where.terminalId = options.terminalId;
    }

    if (options.startDate || options.endDate) {
      where.checkInTime = {};
      if (options.startDate) {
        where.checkInTime.gte = new Date(options.startDate);
      }
      if (options.endDate) {
        where.checkInTime.lte = new Date(options.endDate);
      }
    }

    if (options.status === "ON_SITE") {
      where.checkOutTime = null;
    } else if (options.status === "CHECKED_OUT") {
      where.checkOutTime = { not: null };
    }

    if (options.search && options.search.trim()) {
      const clean = options.search.trim();
      where.OR = [
        { booking: { reference: { contains: clean, mode: "insensitive" } } },
        { user: { firstName: { contains: clean, mode: "insensitive" } } },
        { user: { lastName: { contains: clean, mode: "insensitive" } } },
        { user: { email: { contains: clean, mode: "insensitive" } } },
        { user: { clientId: { contains: clean, mode: "insensitive" } } },
        {
          booking: {
            resource: { name: { contains: clean, mode: "insensitive" } },
          },
        },
      ];
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [items, total, currentlyOnSiteCount, todayTotalCount] =
      await Promise.all([
        prisma.visitSession.findMany({
          where,
          include: {
            booking: {
              include: {
                resource: true,
                user: true,
              },
            },
            user: true,
          },
          orderBy: { checkInTime: "desc" },
          take: options.limit ?? 100,
          skip: options.offset ?? 0,
        }),
        prisma.visitSession.count({ where }),
        prisma.visitSession.count({ where: { checkOutTime: null } }),
        prisma.visitSession.count({
          where: {
            checkInTime: { gte: todayStart },
          },
        }),
      ]);

    return {
      items,
      total,
      currentlyOnSiteCount,
      todayTotalCount,
    };
  }

  /**
   * Fetch live workspace occupancy
   */
  async getLiveOccupancy() {
    const resources = await prisma.facilityResource.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });

    const checkedInBookings = await prisma.booking.findMany({
      where: {
        state: BookingState.CHECKED_IN,
      },
      select: {
        resourceId: true,
      },
    });

    const occupancyByResource = new Map<string, number>();
    checkedInBookings.forEach((b) => {
      occupancyByResource.set(
        b.resourceId,
        (occupancyByResource.get(b.resourceId) || 0) + 1,
      );
    });

    let totalCapacity = 0;
    let totalCheckedIn = 0;

    const resourceItems = resources.map((r) => {
      const current = occupancyByResource.get(r.id) || 0;
      totalCapacity += r.capacity;
      totalCheckedIn += current;
      const available = Math.max(0, r.capacity - current);
      const rate =
        r.capacity > 0 ? Math.round((current / r.capacity) * 100) : 0;

      return {
        resourceId: r.id,
        resourceName: r.name,
        category: r.category,
        capacity: r.capacity,
        currentOccupancy: current,
        availableSpots: available,
        occupancyRate: rate,
      };
    });

    const overallRate =
      totalCapacity > 0
        ? Math.round((totalCheckedIn / totalCapacity) * 100)
        : 0;

    return {
      totalCapacity,
      totalCheckedIn,
      overallOccupancyRate: overallRate,
      timestamp: new Date().toISOString(),
      resources: resourceItems,
    };
  }
}

export const accessRepository = new AccessRepository();
