import { prisma } from "../../db/client.js";
import {
  CreateResourceInput,
  UpdateResourceInput,
  CreatePricingPlanInput,
  UpdatePricingPlanInput,
  CreateBlackoutInput,
  UpsertSchedulesInput,
} from "./catalogue.schema.js";

export class CatalogueRepository {
  async findActiveResources() {
    return prisma.facilityResource.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        pricing: {
          where: { isActive: true },
          orderBy: { price: "asc" },
        },
        schedules: {
          orderBy: { dayOfWeek: "asc" },
        },
      },
    });
  }

  async findResourceBySlug(slug: string) {
    return prisma.facilityResource.findUnique({
      where: { slug },
      include: {
        pricing: {
          where: { isActive: true },
          orderBy: { price: "asc" },
        },
        schedules: {
          orderBy: { dayOfWeek: "asc" },
        },
        blackouts: {
          where: {
            isActive: true,
            endDate: { gte: new Date() },
          },
          orderBy: { startDate: "asc" },
        },
      },
    });
  }

  async findResourceById(id: string) {
    return prisma.facilityResource.findUnique({
      where: { id },
      include: {
        pricing: {
          orderBy: { createdAt: "asc" },
        },
        schedules: {
          orderBy: { dayOfWeek: "asc" },
        },
        blackouts: {
          orderBy: { startDate: "desc" },
        },
      },
    });
  }

  async findAllAdminResources() {
    return prisma.facilityResource.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      include: {
        pricing: {
          orderBy: { price: "asc" },
        },
        schedules: {
          orderBy: { dayOfWeek: "asc" },
        },
        blackouts: {
          orderBy: { startDate: "desc" },
        },
        _count: {
          select: { bookings: true },
        },
      },
    });
  }

  async createResource(data: CreateResourceInput) {
    return prisma.facilityResource.create({
      data: {
        name: data.name,
        slug: data.slug,
        category: data.category,
        description: data.description,
        capacity: data.capacity,
        location: data.location,
        amenities: data.amenities,
        imageUrl: data.imageUrl,
        sortOrder: data.sortOrder,
        isPopular: data.isPopular,
        isActive: data.isActive,
      },
      include: {
        pricing: true,
      },
    });
  }

  async updateResource(id: string, data: UpdateResourceInput) {
    return prisma.facilityResource.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.capacity !== undefined && { capacity: data.capacity }),
        ...(data.location !== undefined && { location: data.location }),
        ...(data.amenities !== undefined && { amenities: data.amenities }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
        ...(data.isPopular !== undefined && { isPopular: data.isPopular }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      include: {
        pricing: true,
        schedules: true,
        blackouts: true,
      },
    });
  }

  async deleteResource(id: string) {
    return prisma.$transaction(async (tx) => {
      // Find all bookings for this resource
      const bookings = await tx.booking.findMany({
        where: { resourceId: id },
        select: { id: true },
      });
      const bookingIds = bookings.map((b) => b.id);

      if (bookingIds.length > 0) {
        // 1. Find all transactions linked to these bookings
        const transactions = await tx.transaction.findMany({
          where: { bookingId: { in: bookingIds } },
          select: { id: true },
        });
        const transactionIds = transactions.map((t) => t.id);

        // 2. Cascade delete invoices linked to these transactions or bookings
        if (transactionIds.length > 0) {
          await tx.invoice.deleteMany({
            where: {
              OR: [
                { transactionId: { in: transactionIds } },
                { bookingId: { in: bookingIds } },
              ],
            },
          });
        } else {
          await tx.invoice.deleteMany({
            where: { bookingId: { in: bookingIds } },
          });
        }

        // 3. Cascade delete refund requests linked to these bookings
        await tx.refundRequest.deleteMany({
          where: { bookingId: { in: bookingIds } },
        });

        // 4. Cascade delete coin holds linked to these bookings
        await tx.coinHold.deleteMany({
          where: { bookingId: { in: bookingIds } },
        });

        // 5. Cascade delete discount redemptions linked to these bookings
        await tx.discountRedemption.deleteMany({
          where: { bookingId: { in: bookingIds } },
        });

        // 6. Cascade delete visit sessions linked to these bookings
        await tx.visitSession.deleteMany({
          where: { bookingId: { in: bookingIds } },
        });

        // 7. Cascade delete transactions linked to these bookings
        await tx.transaction.deleteMany({
          where: { bookingId: { in: bookingIds } },
        });

        // 8. Cascade delete reviews linked to these bookings or resource
        await tx.review.deleteMany({
          where: {
            OR: [{ bookingId: { in: bookingIds } }, { resourceId: id }],
          },
        });

        // 9. Delete the bookings
        await tx.booking.deleteMany({
          where: { id: { in: bookingIds } },
        });
      } else {
        // Delete reviews linked directly to the resource
        await tx.review.deleteMany({
          where: { resourceId: id },
        });
      }

      // Delete targeted discounts
      await tx.discountTargetResource.deleteMany({ where: { resourceId: id } });

      // Delete pricing tiers, schedules, and blackouts
      await tx.resourcePricing.deleteMany({ where: { resourceId: id } });
      await tx.resourceSchedule.deleteMany({ where: { resourceId: id } });
      await tx.resourceBlackout.deleteMany({ where: { resourceId: id } });

      // Delete the resource
      return tx.facilityResource.delete({ where: { id } });
    });
  }

  async findPricingPlanById(planId: string) {
    return prisma.resourcePricing.findUnique({
      where: { id: planId },
    });
  }

  async createPricingPlan(resourceId: string, data: CreatePricingPlanInput) {
    return prisma.resourcePricing.create({
      data: {
        resourceId,
        planName: data.planName,
        durationHours: data.durationHours,
        durationDays: data.durationDays,
        durationMonths: data.durationMonths,
        price: data.price,
        currency: data.currency || "NGN",
        isPopular: data.isPopular ?? false,
        isActive: data.isActive ?? true,
        isNightPlan: data.isNightPlan ?? false,
        operatingHours: data.operatingHours,
        ...(data.effectiveFrom
          ? { effectiveFrom: new Date(data.effectiveFrom) }
          : {}),
        ...(data.effectiveTo
          ? { effectiveTo: new Date(data.effectiveTo) }
          : {}),
      },
    });
  }

  async updatePricingPlan(planId: string, data: UpdatePricingPlanInput) {
    return prisma.resourcePricing.update({
      where: { id: planId },
      data: {
        ...(data.planName !== undefined && { planName: data.planName }),
        ...(data.durationHours !== undefined && {
          durationHours: data.durationHours,
        }),
        ...(data.durationDays !== undefined && {
          durationDays: data.durationDays,
        }),
        ...(data.durationMonths !== undefined && {
          durationMonths: data.durationMonths,
        }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.currency !== undefined && { currency: data.currency }),
        ...(data.isPopular !== undefined && { isPopular: data.isPopular }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.isNightPlan !== undefined && {
          isNightPlan: data.isNightPlan,
        }),
        ...(data.operatingHours !== undefined && {
          operatingHours: data.operatingHours,
        }),
        ...(data.effectiveFrom !== undefined && {
          effectiveFrom: data.effectiveFrom
            ? new Date(data.effectiveFrom)
            : undefined,
        }),
        ...(data.effectiveTo !== undefined && {
          effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : null,
        }),
      },
    });
  }

  async deletePricingPlan(planId: string) {
    return prisma.resourcePricing.delete({
      where: { id: planId },
    });
  }

  async createBlackout(
    resourceId: string,
    data: CreateBlackoutInput,
    createdByUserId?: string,
  ) {
    return prisma.resourceBlackout.create({
      data: {
        resourceId,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        reason: data.reason,
        isActive: data.isActive ?? true,
        createdByUserId,
      },
    });
  }

  async deleteBlackout(blackoutId: string) {
    return prisma.resourceBlackout.delete({
      where: { id: blackoutId },
    });
  }

  async findBlackoutsByResource(resourceId: string) {
    return prisma.resourceBlackout.findMany({
      where: { resourceId },
      orderBy: { startDate: "desc" },
    });
  }

  async upsertSchedules(resourceId: string, data: UpsertSchedulesInput) {
    return prisma.$transaction(async (tx) => {
      const results = [];
      for (const item of data.schedules) {
        const schedule = await tx.resourceSchedule.upsert({
          where: {
            resourceId_dayOfWeek: {
              resourceId,
              dayOfWeek: item.dayOfWeek,
            },
          },
          update: {
            openTime: item.openTime,
            closeTime: item.closeTime,
            is24Hours: item.is24Hours ?? false,
            isClosed: item.isClosed ?? false,
          },
          create: {
            resourceId,
            dayOfWeek: item.dayOfWeek,
            openTime: item.openTime,
            closeTime: item.closeTime,
            is24Hours: item.is24Hours ?? false,
            isClosed: item.isClosed ?? false,
          },
        });
        results.push(schedule);
      }
      return results;
    });
  }
}

export const catalogueRepository = new CatalogueRepository();
