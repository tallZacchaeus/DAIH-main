import { z } from "zod";
import { ReviewStatus } from "@daih/types";
import { sanitizeString } from "../../middleware/validate.middleware.js";

export const CreateReviewSchema = z.object({
  bookingId: z.string().uuid("A valid booking ID is required"),
  rating: z.coerce
    .number()
    .int()
    .min(1, "Rating must be between 1 and 5")
    .max(5, "Rating must be between 1 and 5"),
  title: z
    .string()
    .trim()
    .max(120, "Title must not exceed 120 characters")
    .optional()
    .transform((val) => (val ? sanitizeString(val) : undefined)),
  comment: z
    .string()
    .trim()
    .min(5, "Review comment must be at least 5 characters")
    .max(2000, "Review comment must not exceed 2000 characters")
    .transform(sanitizeString),
  powerRating: z.coerce.number().int().min(1).max(5).optional(),
  wifiRating: z.coerce.number().int().min(1).max(5).optional(),
  comfortRating: z.coerce.number().int().min(1).max(5).optional(),
  staffRating: z.coerce.number().int().min(1).max(5).optional(),
});

export const UpdateReviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5).optional(),
  title: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((val) => (val ? sanitizeString(val) : undefined)),
  comment: z
    .string()
    .trim()
    .min(5)
    .max(2000)
    .optional()
    .transform((val) => (val ? sanitizeString(val) : undefined)),
  powerRating: z.coerce.number().int().min(1).max(5).optional(),
  wifiRating: z.coerce.number().int().min(1).max(5).optional(),
  comfortRating: z.coerce.number().int().min(1).max(5).optional(),
  staffRating: z.coerce.number().int().min(1).max(5).optional(),
});

export const AdminReviewFilterSchema = z.object({
  status: z
    .enum([
      "ALL",
      ReviewStatus.PENDING,
      ReviewStatus.APPROVED,
      ReviewStatus.REJECTED,
      ReviewStatus.ARCHIVED,
    ])
    .optional()
    .default("ALL"),
  resourceId: z.string().optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const AdminStatusUpdateSchema = z.object({
  status: z.enum([
    ReviewStatus.PENDING,
    ReviewStatus.APPROVED,
    ReviewStatus.REJECTED,
    ReviewStatus.ARCHIVED,
  ]),
  isFeaturedOnHome: z.boolean().optional(),
});

export const AdminReviewSettingSchema = z.object({
  requireApproval: z.boolean(),
  isHomepageSpotlightEnabled: z.boolean().optional(),
});

export const AdminReplySchema = z.object({
  reply: z
    .string()
    .trim()
    .min(2, "Reply must be at least 2 characters")
    .max(1500, "Reply must not exceed 1500 characters")
    .transform(sanitizeString),
});

export const BookingIdParamSchema = z.object({
  bookingId: z.string().uuid("Invalid booking ID"),
});

export const ReviewIdParamSchema = z.object({
  id: z.string().uuid("Invalid review ID"),
});

export const ResourceIdParamSchema = z.object({
  resourceId: z.string().min(1, "Invalid resource ID"),
});
