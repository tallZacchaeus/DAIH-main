import { prisma } from "../../db/client.js";
import {
  UserRole,
  BookingState,
  CustomerFilterDTO,
  CustomerListResponse,
  CustomerRecord,
  CustomerMetrics,
  CreateCustomerDTO,
  AdminCustomerReferralsResponse,
  ReferralItem,
} from "@daih/types";
import { clientIdService } from "./client-id.service.js";
import { passwordService } from "./password.service.js";
import { generateReferralCode } from "./identity.service.js";

export class CustomerService {
  /**
   * Fetches paginated customers with search, status filters, and live aggregated metrics.
   */
  async getCustomers(
    filter: CustomerFilterDTO = {},
  ): Promise<CustomerListResponse> {
    const page = Number(filter.page) || 1;
    const limit = Number(filter.limit) || 20;
    const skip = (page - 1) * limit;

    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const andConditions: any[] = [{ role: UserRole.CUSTOMER }];

    if (filter.search && filter.search.trim()) {
      const q = filter.search.trim();
      andConditions.push({
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { clientId: { contains: q, mode: "insensitive" } },
          { phoneNumber: { contains: q, mode: "insensitive" } },
        ],
      });
    }

    if (filter.status && filter.status !== "ALL") {
      const st = filter.status.toUpperCase();
      if (st === "PENDING") {
        andConditions.push({ isVerified: false });
      } else if (st === "ACTIVE") {
        andConditions.push({
          isVerified: true,
          OR: [
            { createdAt: { gte: ninetyDaysAgo } },
            {
              bookings: {
                some: {
                  startTime: { gte: ninetyDaysAgo },
                  state: {
                    in: [
                      BookingState.CONFIRMED,
                      BookingState.ACTIVE,
                      BookingState.CHECKED_IN,
                      BookingState.CHECKED_OUT,
                      BookingState.COMPLETED,
                    ],
                  },
                },
              },
            },
          ],
        });
      } else if (st === "INACTIVE") {
        andConditions.push({
          isVerified: true,
          createdAt: { lt: ninetyDaysAgo },
          bookings: {
            none: {
              startTime: { gte: ninetyDaysAgo },
              state: {
                in: [
                  BookingState.CONFIRMED,
                  BookingState.ACTIVE,
                  BookingState.CHECKED_IN,
                  BookingState.CHECKED_OUT,
                  BookingState.COMPLETED,
                ],
              },
            },
          },
        });
      }
    }

    const whereClause: any = {
      AND: andConditions,
    };

    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    );

    const [
      users,
      total,
      totalCount,
      activeCount,
      newThisMonthCount,
      completedBookings,
    ] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        include: {
          bookings: {
            where: {
              state: {
                in: [
                  BookingState.CONFIRMED,
                  BookingState.ACTIVE,
                  BookingState.CHECKED_IN,
                  BookingState.CHECKED_OUT,
                  BookingState.COMPLETED,
                ],
              },
            },
            orderBy: { startTime: "desc" },
            take: 10,
            include: {
              resource: {
                select: { name: true, category: true },
              },
            },
          },
          _count: {
            select: { bookings: true, referredUsers: true },
          },
          referredUsers: {
            select: {
              id: true,
              _count: {
                select: {
                  bookings: {
                    where: {
                      state: {
                        in: [
                          BookingState.CONFIRMED,
                          BookingState.ACTIVE,
                          BookingState.CHECKED_IN,
                          BookingState.CHECKED_OUT,
                          BookingState.COMPLETED,
                        ],
                      },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.user.count({ where: whereClause }),
      prisma.user.count({ where: { role: UserRole.CUSTOMER } }),
      prisma.user.count({
        where: {
          role: UserRole.CUSTOMER,
          isVerified: true,
          OR: [
            { createdAt: { gte: ninetyDaysAgo } },
            {
              bookings: {
                some: {
                  startTime: { gte: ninetyDaysAgo },
                  state: {
                    in: [
                      BookingState.CONFIRMED,
                      BookingState.ACTIVE,
                      BookingState.CHECKED_IN,
                      BookingState.CHECKED_OUT,
                      BookingState.COMPLETED,
                    ],
                  },
                },
              },
            },
          ],
        },
      }),
      prisma.user.count({
        where: {
          role: UserRole.CUSTOMER,
          createdAt: { gte: startOfMonth },
        },
      }),
      // Aggregate revenue in PostgreSQL — avoids loading all booking rows into memory
      prisma.booking.aggregate({
        where: {
          state: {
            in: ["CONFIRMED", "COMPLETED", "CHECKED_IN", "CHECKED_OUT"],
          },
        },
        _sum: { totalAmount: true },
      }),
    ]);

    const totalRevSum = Number(completedBookings._sum?.totalAmount || 0);
    const formattedRev =
      totalRevSum >= 1000000
        ? `₦${(totalRevSum / 1000000).toFixed(1)}M`
        : totalRevSum >= 1000
          ? `₦${(totalRevSum / 1000).toFixed(1)}k`
          : `₦${totalRevSum.toLocaleString()}`;

    const metrics: CustomerMetrics = {
      totalMembers: totalCount,
      activeNow: activeCount,
      newThisMonth: newThisMonthCount,
      mrrGrowth: formattedRev,
    };

    const now = new Date();

    const customers: CustomerRecord[] = users.map((u) => {
      // Find the most recent actual visit (checked in, or past confirmed/completed booking)
      const pastVisits = u.bookings.filter(
        (b) =>
          Boolean(b.checkedInAt) ||
          new Date(b.startTime) <= now ||
          b.state === BookingState.COMPLETED ||
          b.state === BookingState.CHECKED_IN ||
          b.state === BookingState.CHECKED_OUT,
      );

      const latestVisit = pastVisits[0]; // Already ordered by startTime desc
      const latestBooking = u.bookings[0]; // May be future or past

      let tier = "Dedicated Desk";
      if (latestVisit?.resource?.name) {
        tier = latestVisit.resource.name;
      } else if (latestBooking?.resource?.name) {
        tier = latestBooking.resource.name;
      }

      let lastVisit = "No visits yet";
      if (latestVisit) {
        const visitDate = latestVisit.checkedInAt
          ? new Date(latestVisit.checkedInAt)
          : new Date(latestVisit.startTime);

        lastVisit = visitDate.toLocaleDateString("en-NG", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
      } else if (latestBooking && new Date(latestBooking.startTime) > now) {
        const futureDate = new Date(latestBooking.startTime).toLocaleDateString(
          "en-NG",
          {
            day: "numeric",
            month: "short",
            year: "numeric",
          },
        );
        lastVisit = `Upcoming (${futureDate})`;
      }

      const totalSpent = u.bookings.reduce(
        (sum, b) => sum + Number(b.totalAmount || 0),
        0,
      );

      const isPending = !u.isVerified;
      const hasRecentActivity =
        new Date(u.createdAt) >= ninetyDaysAgo ||
        u.bookings.some(
          (b) =>
            new Date(b.startTime) >= ninetyDaysAgo &&
            [
              BookingState.CONFIRMED,
              BookingState.ACTIVE,
              BookingState.CHECKED_IN,
              BookingState.CHECKED_OUT,
              BookingState.COMPLETED,
            ].includes(b.state as any),
        );

      const status: "Active" | "Pending" | "Inactive" = isPending
        ? "Pending"
        : hasRecentActivity
          ? "Active"
          : "Inactive";

      return {
        id: u.clientId,
        userId: u.id,
        name: `${u.firstName} ${u.lastName}`.trim(),
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        phone: u.phoneNumber ?? undefined,
        avatarUrl: (u as any).avatarUrl || undefined,
        tier,
        status,
        lastVisit,
        joinedDate: new Date(u.createdAt).toLocaleDateString("en-NG", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        totalBookings: u._count.bookings,
        totalSpent,
        isVerified: u.isVerified,
        createdAt: u.createdAt.toISOString(),
        referralCode: u.referralCode || undefined,
        referralCount: (u as any)._count?.referredUsers || 0,
        activeReferralCount: ((u as any).referredUsers || []).filter(
          (r: any) => r._count?.bookings > 0,
        ).length,
        birthday: (u as any).birthday || null,
        dateOfBirth: (u as any).birthday || null,
      };
    });

    return {
      customers,
      total,
      page,
      limit,
      metrics,
    };
  }

  /**
   * Admin manually provisions a new Customer Member.
   */
  async createCustomer(dto: CreateCustomerDTO): Promise<CustomerRecord> {
    const existing = await prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (existing) {
      const err: any = new Error(
        "A user with this email address already exists.",
      );
      err.statusCode = 409;
      err.code = "EMAIL_ALREADY_EXISTS";
      throw err;
    }

    const clientId = await clientIdService.generateNextClientId();
    const tempPassword = passwordService.generateSecureToken(12);
    const passwordHash = await passwordService.hashPassword(tempPassword);

    const referralCode = generateReferralCode();

    const user = await prisma.user.create({
      data: {
        email: dto.email.toLowerCase().trim(),
        passwordHash,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        phoneNumber: dto.phoneNumber?.trim() || null,
        birthday: dto.dateOfBirth || dto.birthday || null,
        role: UserRole.CUSTOMER,
        clientId,
        isVerified: true,
        referralCode,
      },
    });

    await prisma.policyConsent.create({
      data: {
        userId: user.id,
        policyVersion: "1.0",
        purpose: "ADMIN_ONBOARDED_CONSENT",
      },
    });

    return {
      id: user.clientId,
      userId: user.id,
      name: `${user.firstName} ${user.lastName}`.trim(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phoneNumber ?? undefined,
      avatarUrl: (user as any).avatarUrl || undefined,
      tier: dto.tier || "Dedicated Desk",
      status: "Active",
      lastVisit: "No visits yet",
      joinedDate: new Date(user.createdAt).toLocaleDateString("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      totalBookings: 0,
      totalSpent: 0,
      isVerified: true,
      createdAt: user.createdAt.toISOString(),
      referralCode: user.referralCode || undefined,
      referralCount: 0,
      activeReferralCount: 0,
      birthday: (user as any).birthday || dto.dateOfBirth || null,
      dateOfBirth: (user as any).birthday || dto.dateOfBirth || null,
    };
  }

  /**
   * Fetches customer's referral details and list of referred users for staff admin inspection.
   */
  async getCustomerReferrals(
    customerId: string,
  ): Promise<AdminCustomerReferralsResponse> {
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ id: customerId }, { clientId: customerId }],
      },
    });

    if (!user) {
      const error: any = new Error("Customer not found");
      error.statusCode = 404;
      throw error;
    }

    const PAID_BOOKING_STATES: BookingState[] = [
      BookingState.CONFIRMED,
      BookingState.ACTIVE,
      BookingState.CHECKED_IN,
      BookingState.CHECKED_OUT,
      BookingState.COMPLETED,
    ];

    const referredUsers = await prisma.user.findMany({
      where: { referredById: user.id },
      select: {
        id: true,
        clientId: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        createdAt: true,
        _count: {
          select: {
            bookings: {
              where: {
                state: { in: PAID_BOOKING_STATES },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const items: ReferralItem[] = referredUsers.map((u) => {
      const paidBookingsCount = u._count.bookings;
      const isActive = paidBookingsCount > 0;
      return {
        id: u.id,
        clientId: u.clientId,
        name: `${u.firstName} ${u.lastName}`.trim(),
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        phoneNumber: u.phoneNumber,
        joinedAt: u.createdAt.toISOString(),
        isActive,
        status: isActive ? "Active" : "Inactive",
        paidBookingsCount,
      };
    });

    const totalReferred = items.length;
    const activeReferred = items.filter((i) => i.isActive).length;

    return {
      customerId: user.id,
      customerName: `${user.firstName} ${user.lastName}`.trim(),
      customerEmail: user.email,
      customerClientId: user.clientId,
      referralCode: user.referralCode || "N/A",
      totalReferred,
      activeReferred,
      referredUsers: items,
    };
  }
}

export const customerService = new CustomerService();
