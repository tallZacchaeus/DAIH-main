import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import sharp from "sharp";
import {
  catalogueRepository,
  CatalogueRepository,
} from "./catalogue.repository.js";
import {
  CreateResourceInput,
  UpdateResourceInput,
  CreatePricingPlanInput,
  UpdatePricingPlanInput,
  CreateBlackoutInput,
  UpsertSchedulesInput,
  UploadResourceImageInput,
} from "./catalogue.schema.js";
import { prisma } from "../../db/client.js";
import { redis } from "../../config/redis.js";
import { outboxService } from "../events/outbox.service.js";

export class CatalogueService {
  constructor(private repo: CatalogueRepository = catalogueRepository) {}

  private async invalidateCatalogueCache(): Promise<void> {
    try {
      const keys = await redis.keys("daih:catalogue:*");
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch {
      // Non-blocking cache invalidation failure
    }
  }

  private formatResource(resource: any) {
    if (!resource) return null;

    let dailyRate: number | undefined;
    let hourlyRate: number | undefined;
    let monthlyRate: number | undefined;

    const pricing = (resource.pricing || []).map((p: any) => {
      const priceNum = Number(p.price);
      if (p.durationDays === 1 && dailyRate === undefined) dailyRate = priceNum;
      if (p.durationHours === 1 && hourlyRate === undefined)
        hourlyRate = priceNum;
      if (p.durationMonths === 1 && monthlyRate === undefined)
        monthlyRate = priceNum;
      return {
        ...p,
        price: priceNum,
      };
    });

    return {
      ...resource,
      pricing,
      blackouts:
        resource.blackouts?.map((b: any) => ({
          ...b,
          startDate:
            b.startDate instanceof Date
              ? b.startDate.toISOString()
              : b.startDate,
          endDate:
            b.endDate instanceof Date ? b.endDate.toISOString() : b.endDate,
        })) || [],
      schedules: resource.schedules || [],
      dailyRate,
      hourlyRate,
      monthlyRate,
    };
  }

  async getActiveResources() {
    const cacheKey = "daih:catalogue:active_resources";
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {}

    const resources = await this.repo.findActiveResources();
    const formatted = resources.map((r) => this.formatResource(r));

    try {
      await redis.setex(cacheKey, 120, JSON.stringify(formatted)); // 2 min TTL
    } catch {}

    return formatted;
  }

  async getResourceBySlug(slug: string) {
    const cacheKey = `daih:catalogue:resource:${slug}`;
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {}

    let resource = await this.repo.findResourceBySlug(slug);
    if (!resource) {
      resource = await this.repo.findResourceById(slug);
    }
    if (!resource) return null;
    const formatted = this.formatResource(resource);

    try {
      await redis.setex(cacheKey, 120, JSON.stringify(formatted));
    } catch {}

    return formatted;
  }

  async getAdminResources() {
    const resources = await this.repo.findAllAdminResources();
    return resources.map((r) => {
      const formatted = this.formatResource(r);
      return {
        ...formatted,
        totalBookings: r._count?.bookings ?? 0,
      };
    });
  }

  async getResourceById(id: string) {
    const resource = await this.repo.findResourceById(id);
    if (!resource) return null;
    return this.formatResource(resource);
  }

  async createResource(
    input: CreateResourceInput,
    actorUserId?: string,
    ipAddress?: string,
  ) {
    // Verify unique slug
    const existing = await this.repo.findResourceBySlug(input.slug);
    if (existing) {
      const error: any = new Error(
        `Resource with slug '${input.slug}' already exists`,
      );
      error.statusCode = 409;
      error.code = "RESOURCE_SLUG_CONFLICT";
      throw error;
    }

    const resource = await this.repo.createResource(input);

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: actorUserId,
        action: "CATALOGUE_RESOURCE_CREATED",
        entityType: "FacilityResource",
        entityId: resource.id,
        metadata: {
          name: resource.name,
          slug: resource.slug,
          category: resource.category,
        },
        ipAddress,
      },
    });

    // Outbox event
    await outboxService.recordEvent({
      eventType: "catalogue.resource_created",
      aggregateType: "FacilityResource",
      aggregateId: resource.id,
      payload: {
        resourceId: resource.id,
        name: resource.name,
        slug: resource.slug,
      },
    });

    // Invalidate Redis catalogue cache
    await this.invalidateCatalogueCache();

    return this.formatResource(resource);
  }

  async updateResource(
    id: string,
    input: UpdateResourceInput,
    actorUserId?: string,
    ipAddress?: string,
  ) {
    const existing = await this.repo.findResourceById(id);
    if (!existing) {
      const error: any = new Error(`Resource '${id}' not found`);
      error.statusCode = 404;
      error.code = "RESOURCE_NOT_FOUND";
      throw error;
    }

    if (input.slug && input.slug !== existing.slug) {
      const slugConflict = await this.repo.findResourceBySlug(input.slug);
      if (slugConflict && slugConflict.id !== id) {
        const error: any = new Error(
          `Resource with slug '${input.slug}' already exists`,
        );
        error.statusCode = 409;
        error.code = "RESOURCE_SLUG_CONFLICT";
        throw error;
      }
    }

    const updated = await this.repo.updateResource(id, input);

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: actorUserId,
        action: "CATALOGUE_RESOURCE_UPDATED",
        entityType: "FacilityResource",
        entityId: id,
        metadata: { changes: input },
        ipAddress,
      },
    });

    // Outbox event
    await outboxService.recordEvent({
      eventType: "catalogue.resource_updated",
      aggregateType: "FacilityResource",
      aggregateId: id,
      payload: { resourceId: id, changes: input },
    });

    // Invalidate Redis catalogue cache
    await this.invalidateCatalogueCache();

    return this.formatResource(updated);
  }

  async uploadResourceImage(
    input: UploadResourceImageInput,
    actorUserId?: string,
    ipAddress?: string,
    reqProtocol?: string,
    reqHost?: string,
  ) {
    let base64Data = input.data;
    let mimeType = input.contentType || "image/jpeg";

    // Parse data URI if present (e.g. data:image/png;base64,iVBORw0KGgo...)
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      mimeType = matches[1];
      base64Data = matches[2];
    }

    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/avif",
      "image/gif",
      "image/svg+xml",
    ];
    if (!allowedMimeTypes.includes(mimeType.toLowerCase())) {
      const error: any = new Error(
        `Unsupported image format '${mimeType}'. Supported formats: JPEG, PNG, WebP, AVIF, GIF, SVG.`,
      );
      error.statusCode = 400;
      error.code = "INVALID_IMAGE_FORMAT";
      throw error;
    }

    const inputBuffer = Buffer.from(base64Data, "base64");
    if (inputBuffer.length === 0) {
      const error: any = new Error("Invalid image data: Buffer is empty");
      error.statusCode = 400;
      error.code = "INVALID_IMAGE_DATA";
      throw error;
    }

    // Size limit check (max 15MB input)
    if (inputBuffer.length > 15 * 1024 * 1024) {
      const error: any = new Error(
        "Image file size exceeds maximum limit of 15MB",
      );
      error.statusCode = 400;
      error.code = "IMAGE_TOO_LARGE";
      throw error;
    }

    const uploadLocations = [
      path.join(process.cwd(), "uploads", "resources"),
      path.resolve(__dirname, "..", "..", "..", "uploads", "resources"),
    ];
    for (const dir of uploadLocations) {
      await fs.mkdir(dir, { recursive: true }).catch(() => {});
    }
    const resourcesDir = uploadLocations[0];

    let finalBuffer: Buffer;
    let ext = "webp";
    let width: number | undefined;
    let height: number | undefined;

    if (mimeType.toLowerCase() === "image/svg+xml") {
      finalBuffer = inputBuffer;
      ext = "svg";
    } else {
      // Compress and optimize with sharp to WebP format
      const sharpInstance = sharp(inputBuffer)
        .rotate()
        .resize({
          width: 1920,
          height: 1080,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({
          quality: 82,
          effort: 4,
          lossless: false,
        });

      const metadata = await sharpInstance.metadata();
      width = metadata.width;
      height = metadata.height;
      finalBuffer = await sharpInstance.toBuffer();
    }

    const uniqueId = crypto.randomUUID().slice(0, 8);
    const timestamp = Date.now();
    const cleanPrefix = input.fileName
      ? input.fileName
          .replace(/\.[^/.]+$/, "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .slice(0, 30)
      : "resource";
    const filename = `${cleanPrefix}-${timestamp}-${uniqueId}.${ext}`;

    for (const dir of uploadLocations) {
      await fs.writeFile(path.join(dir, filename), finalBuffer).catch(() => {});
    }

    const relativeUrl = `/uploads/resources/${filename}`;
    const host = reqHost || process.env.API_HOST || "localhost:4000";
    const protocol =
      reqProtocol || (host.includes("localhost") ? "http" : "https");
    const fullUrl = `${protocol}://${host}${relativeUrl}`;

    let updatedResource = null;
    if (input.resourceId) {
      const existing = await this.repo.findResourceById(input.resourceId);
      if (existing) {
        updatedResource = await this.repo.updateResource(input.resourceId, {
          imageUrl: relativeUrl,
        });

        // Audit log
        await prisma.auditLog.create({
          data: {
            userId: actorUserId,
            action: "CATALOGUE_RESOURCE_IMAGE_UPDATED",
            entityType: "FacilityResource",
            entityId: input.resourceId,
            metadata: {
              previousImageUrl: existing.imageUrl,
              newImageUrl: relativeUrl,
              fileSize: finalBuffer.length,
              format: ext,
            },
            ipAddress,
          },
        });

        // Outbox event
        await outboxService.recordEvent({
          eventType: "catalogue.resource_image_updated",
          aggregateType: "FacilityResource",
          aggregateId: input.resourceId,
          payload: {
            resourceId: input.resourceId,
            imageUrl: relativeUrl,
          },
        });

        await this.invalidateCatalogueCache();
      }
    }

    return {
      url: relativeUrl,
      fullUrl,
      filename,
      size: finalBuffer.length,
      format: ext,
      width,
      height,
      resourceId: input.resourceId,
      resource: updatedResource
        ? this.formatResource(updatedResource)
        : undefined,
    };
  }

  async deleteResource(id: string, actorUserId?: string, ipAddress?: string) {
    const existing = await this.repo.findResourceById(id);
    if (!existing) {
      const error: any = new Error(`Resource '${id}' not found`);
      error.statusCode = 404;
      error.code = "RESOURCE_NOT_FOUND";
      throw error;
    }

    const updated = await this.repo.deleteResource(id);

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: actorUserId,
        action: "CATALOGUE_RESOURCE_DEACTIVATED",
        entityType: "FacilityResource",
        entityId: id,
        metadata: { name: existing.name },
        ipAddress,
      },
    });

    // Invalidate Redis catalogue cache
    await this.invalidateCatalogueCache();

    return this.formatResource(updated);
  }

  async createPricingPlan(
    resourceId: string,
    input: CreatePricingPlanInput,
    actorUserId?: string,
    ipAddress?: string,
  ) {
    const resource = await this.repo.findResourceById(resourceId);
    if (!resource) {
      const error: any = new Error(`Resource '${resourceId}' not found`);
      error.statusCode = 404;
      error.code = "RESOURCE_NOT_FOUND";
      throw error;
    }

    const plan = await this.repo.createPricingPlan(resourceId, input);

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: actorUserId,
        action: "CATALOGUE_PRICING_CREATED",
        entityType: "ResourcePricing",
        entityId: plan.id,
        metadata: {
          resourceId,
          planName: plan.planName,
          price: Number(plan.price),
        },
        ipAddress,
      },
    });

    // Outbox event
    await outboxService.recordEvent({
      eventType: "catalogue.pricing_created",
      aggregateType: "ResourcePricing",
      aggregateId: plan.id,
      payload: { resourceId, planId: plan.id, price: Number(plan.price) },
    });

    // Invalidate Redis catalogue cache
    await this.invalidateCatalogueCache();

    return {
      ...plan,
      price: Number(plan.price),
    };
  }

  async updatePricingPlan(
    planId: string,
    input: UpdatePricingPlanInput,
    actorUserId?: string,
    ipAddress?: string,
  ) {
    const plan = await this.repo.findPricingPlanById(planId);
    if (!plan) {
      const error: any = new Error(`Pricing plan '${planId}' not found`);
      error.statusCode = 404;
      error.code = "PRICING_PLAN_NOT_FOUND";
      throw error;
    }

    const updated = await this.repo.updatePricingPlan(planId, input);

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: actorUserId,
        action: "CATALOGUE_PRICING_UPDATED",
        entityType: "ResourcePricing",
        entityId: planId,
        metadata: {
          previousPrice: Number(plan.price),
          updatedPrice: Number(updated.price),
          changes: input,
        },
        ipAddress,
      },
    });

    // Outbox event
    await outboxService.recordEvent({
      eventType: "catalogue.pricing_updated",
      aggregateType: "ResourcePricing",
      aggregateId: planId,
      payload: {
        planId,
        resourceId: updated.resourceId,
        price: Number(updated.price),
      },
    });

    // Invalidate Redis catalogue cache
    await this.invalidateCatalogueCache();

    return {
      ...updated,
      price: Number(updated.price),
    };
  }

  async deletePricingPlan(
    planId: string,
    actorUserId?: string,
    ipAddress?: string,
  ) {
    const plan = await this.repo.findPricingPlanById(planId);
    if (!plan) {
      const error: any = new Error(`Pricing plan '${planId}' not found`);
      error.statusCode = 404;
      error.code = "PRICING_PLAN_NOT_FOUND";
      throw error;
    }

    await this.repo.deletePricingPlan(planId);

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: actorUserId,
        action: "CATALOGUE_PRICING_DELETED",
        entityType: "ResourcePricing",
        entityId: planId,
        metadata: { resourceId: plan.resourceId, planName: plan.planName },
        ipAddress,
      },
    });

    // Invalidate Redis catalogue cache
    await this.invalidateCatalogueCache();

    return {
      success: true,
      message: `Pricing plan '${plan.planName}' deleted successfully`,
    };
  }

  async createBlackout(
    resourceId: string,
    input: CreateBlackoutInput,
    actorUserId?: string,
    ipAddress?: string,
  ) {
    const resource = await this.repo.findResourceById(resourceId);
    if (!resource) {
      const error: any = new Error(`Resource '${resourceId}' not found`);
      error.statusCode = 404;
      error.code = "RESOURCE_NOT_FOUND";
      throw error;
    }

    const blackout = await this.repo.createBlackout(
      resourceId,
      input,
      actorUserId,
    );

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: actorUserId,
        action: "CATALOGUE_BLACKOUT_CREATED",
        entityType: "ResourceBlackout",
        entityId: blackout.id,
        metadata: {
          resourceId,
          reason: blackout.reason,
          startDate: blackout.startDate,
          endDate: blackout.endDate,
        },
        ipAddress,
      },
    });

    // Invalidate Redis catalogue cache
    await this.invalidateCatalogueCache();

    return blackout;
  }

  async deleteBlackout(
    blackoutId: string,
    actorUserId?: string,
    ipAddress?: string,
  ) {
    await this.repo.deleteBlackout(blackoutId);

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: actorUserId,
        action: "CATALOGUE_BLACKOUT_DELETED",
        entityType: "ResourceBlackout",
        entityId: blackoutId,
        ipAddress,
      },
    });

    // Invalidate Redis catalogue cache
    await this.invalidateCatalogueCache();

    return { success: true, message: "Blackout schedule deleted successfully" };
  }

  async updateSchedules(
    resourceId: string,
    input: UpsertSchedulesInput,
    actorUserId?: string,
    ipAddress?: string,
  ) {
    const resource = await this.repo.findResourceById(resourceId);
    if (!resource) {
      const error: any = new Error(`Resource '${resourceId}' not found`);
      error.statusCode = 404;
      error.code = "RESOURCE_NOT_FOUND";
      throw error;
    }

    const schedules = await this.repo.upsertSchedules(resourceId, input);

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: actorUserId,
        action: "CATALOGUE_SCHEDULES_UPDATED",
        entityType: "ResourceSchedule",
        entityId: resourceId,
        metadata: { count: schedules.length },
        ipAddress,
      },
    });

    // Invalidate Redis catalogue cache
    await this.invalidateCatalogueCache();

    return schedules;
  }
}

export const catalogueService = new CatalogueService();
