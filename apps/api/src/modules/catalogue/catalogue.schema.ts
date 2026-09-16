import { z } from "zod";
import { ResourceCategory } from "@prisma/client";
import { sanitizeString } from "../../middleware/validate.middleware.js";

export const SlugParamSchema = z.object({
  slug: z.string().trim().min(1, "Slug is required").transform(sanitizeString),
});

export const IdParamSchema = z.object({
  id: z.string().trim().min(1, "ID is required").transform(sanitizeString),
});

export const PricingPlanIdParamSchema = z.object({
  planId: z
    .string()
    .trim()
    .min(1, "Plan ID is required")
    .transform(sanitizeString),
});

export const BlackoutIdParamSchema = z.object({
  blackoutId: z
    .string()
    .trim()
    .min(1, "Blackout ID is required")
    .transform(sanitizeString),
});

export const CreateResourceSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .transform(sanitizeString),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .regex(/^[a-z0-9-]+$/, "Slug must be alphanumeric with hyphens"),
  category: z.nativeEnum(ResourceCategory),
  description: z
    .string()
    .min(5, "Description must be at least 5 characters")
    .transform(sanitizeString),
  capacity: z.number().int().min(1, "Capacity must be at least 1"),
  location: z.string().min(2, "Location is required").transform(sanitizeString),
  amenities: z.array(z.string().transform(sanitizeString)).default([]),
  imageUrl: z.string().optional().nullable(),
  sortOrder: z.number().int().optional().default(0),
  isPopular: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
});

export const UpdateResourceSchema = CreateResourceSchema.partial();

export const CreatePricingPlanSchema = z.object({
  planName: z
    .string()
    .min(2, "Plan name is required")
    .transform(sanitizeString),
  durationHours: z.coerce.number().int().positive().optional().nullable(),
  durationDays: z.coerce.number().int().positive().optional().nullable(),
  durationMonths: z.coerce.number().int().positive().optional().nullable(),
  price: z.coerce.number().positive("Price must be greater than 0"),
  currency: z.string().default("NGN").transform(sanitizeString),
  isPopular: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
  isNightPlan: z.boolean().optional().default(false),
  operatingHours: z.string().optional().nullable(),
  effectiveFrom: z.string().optional().nullable(),
  effectiveTo: z.string().optional().nullable(),
});

export const UpdatePricingPlanSchema = CreatePricingPlanSchema.partial();

export const CreateBlackoutSchema = z.object({
  startDate: z.string().datetime({ message: "Invalid start date format" }),
  endDate: z.string().datetime({ message: "Invalid end date format" }),
  reason: z
    .string()
    .min(3, "Reason must be at least 3 characters")
    .transform(sanitizeString),
  isActive: z.boolean().optional().default(true),
});

export const UpsertSchedulesSchema = z.object({
  schedules: z.array(
    z.object({
      dayOfWeek: z.number().int().min(0).max(6),
      openTime: z
        .string()
        .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:MM)"),
      closeTime: z
        .string()
        .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:MM)"),
      is24Hours: z.boolean().optional().default(false),
      isClosed: z.boolean().optional().default(false),
    }),
  ),
});

export const UploadResourceImageSchema = z.object({
  data: z.string().min(1, "Image data is required"),
  fileName: z
    .string()
    .optional()
    .transform((val) => (val ? sanitizeString(val) : undefined)),
  contentType: z.string().optional(),
  resourceId: z
    .string()
    .optional()
    .transform((val) => (val ? sanitizeString(val) : undefined)),
});

export type CreateResourceInput = z.infer<typeof CreateResourceSchema>;
export type UpdateResourceInput = z.infer<typeof UpdateResourceSchema>;
export type CreatePricingPlanInput = z.infer<typeof CreatePricingPlanSchema>;
export type UpdatePricingPlanInput = z.infer<typeof UpdatePricingPlanSchema>;
export type CreateBlackoutInput = z.infer<typeof CreateBlackoutSchema>;
export type UpsertSchedulesInput = z.infer<typeof UpsertSchedulesSchema>;
export type UploadResourceImageInput = z.infer<
  typeof UploadResourceImageSchema
>;
