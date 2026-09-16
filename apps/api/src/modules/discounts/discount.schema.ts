import { z } from "zod";
import {
  DiscountType,
  CustomerEligibility,
  ResourceCategory,
} from "@daih/types";
import { sanitizeString } from "../../middleware/validate.middleware.js";

/**
 * Normalizes code: strips whitespace, converts to uppercase.
 */
export const normalizeCode = (val: string): string => val.trim().toUpperCase();

export const CreateDiscountSchema = z
  .object({
    code: z
      .string()
      .trim()
      .optional()
      .nullable()
      .transform((val) => (val && val.trim() ? normalizeCode(val) : undefined))
      .refine(
        (val) =>
          !val ||
          (val.length >= 3 && val.length <= 30 && /^[A-Za-z0-9_-]+$/.test(val)),
        {
          message:
            "Promo code must be between 3 and 30 characters and contain only alphanumeric characters, dashes, or underscores",
        },
      ),
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name must not exceed 100 characters")
      .transform(sanitizeString),
    description: z
      .string()
      .max(500)
      .optional()
      .transform((val) => (val ? sanitizeString(val) : val)),
    type: z.enum([
      DiscountType.PERCENTAGE,
      DiscountType.FIXED_AMOUNT,
      DiscountType.FIXED_PRICE,
    ]),
    value: z.number(),
    maxDiscountAmount: z.number().positive().optional().nullable(),
    minOrderAmount: z.number().nonnegative().optional().default(0),
    currency: z.string().default("NGN").transform(sanitizeString),
    isAutomatic: z.boolean().optional().default(false),
    isActive: z.boolean().optional().default(true),
    validFrom: z
      .string()
      .datetime({ message: "Valid ISO validFrom timestamp required" })
      .optional(),
    validUntil: z
      .string()
      .datetime({ message: "Valid ISO validUntil timestamp required" })
      .optional()
      .nullable(),
    maxUsageTotal: z.number().int().positive().optional().nullable(),
    maxUsagePerUser: z.number().int().positive().optional().default(1),
    appliesToAll: z.boolean().optional().default(true),
    targetCategories: z
      .array(
        z.enum([
          ResourceCategory.HOT_DESK,
          ResourceCategory.FLEX_DESK,
          ResourceCategory.DEDICATED_DESK,
          ResourceCategory.OFFICE_SUITE,
          ResourceCategory.CONFERENCE_HALL,
          ResourceCategory.TRAINING_ROOM,
          ResourceCategory.ROOFTOP_LOUNGE,
          ResourceCategory.STUDIO,
        ]),
      )
      .optional()
      .default([]),
    customerEligibility: z
      .enum([
        CustomerEligibility.ALL,
        CustomerEligibility.SPECIFIC_CUSTOMERS,
        CustomerEligibility.FIRST_TIME_ONLY,
        CustomerEligibility.DOMAIN_MATCH,
      ])
      .optional()
      .default(CustomerEligibility.ALL),
    targetEmailDomains: z
      .array(z.string().trim().toLowerCase())
      .optional()
      .default([]),
    targetResourceIds: z.array(z.string().uuid()).optional().default([]),
    targetCustomerIds: z.array(z.string().uuid()).optional().default([]),
  })
  .refine(
    (data) => {
      if (data.type === DiscountType.PERCENTAGE) {
        return data.value > 0 && data.value <= 100;
      }
      if (data.type === DiscountType.FIXED_AMOUNT) {
        return data.value > 0;
      }
      if (data.type === DiscountType.FIXED_PRICE) {
        return data.value >= 0;
      }
      return true;
    },
    {
      message:
        "Invalid discount value: Percentage must be between 0.01% and 100%, and fixed amount must be greater than 0",
      path: ["value"],
    },
  )
  .refine(
    (data) => {
      if (data.validFrom && data.validUntil) {
        return new Date(data.validUntil) > new Date(data.validFrom);
      }
      return true;
    },
    {
      message: "validUntil must be strictly after validFrom",
      path: ["validUntil"],
    },
  );

export const UpdateDiscountSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3)
      .max(30)
      .regex(/^[A-Za-z0-9_-]+$/)
      .transform(normalizeCode)
      .optional()
      .nullable(),
    name: z
      .string()
      .trim()
      .min(2)
      .max(100)
      .transform(sanitizeString)
      .optional(),
    description: z
      .string()
      .max(500)
      .optional()
      .nullable()
      .transform((val) => (val ? sanitizeString(val) : val)),
    type: z
      .enum([
        DiscountType.PERCENTAGE,
        DiscountType.FIXED_AMOUNT,
        DiscountType.FIXED_PRICE,
      ])
      .optional(),
    value: z.number().optional(),
    maxDiscountAmount: z.number().positive().optional().nullable(),
    minOrderAmount: z.number().nonnegative().optional(),
    currency: z
      .string()
      .optional()
      .transform((val) => (val ? sanitizeString(val) : val)),
    isAutomatic: z.boolean().optional(),
    isActive: z.boolean().optional(),
    validFrom: z.string().datetime().optional(),
    validUntil: z.string().datetime().optional().nullable(),
    maxUsageTotal: z.number().int().positive().optional().nullable(),
    maxUsagePerUser: z.number().int().positive().optional(),
    appliesToAll: z.boolean().optional(),
    targetCategories: z
      .array(
        z.enum([
          ResourceCategory.HOT_DESK,
          ResourceCategory.FLEX_DESK,
          ResourceCategory.DEDICATED_DESK,
          ResourceCategory.OFFICE_SUITE,
          ResourceCategory.CONFERENCE_HALL,
          ResourceCategory.TRAINING_ROOM,
          ResourceCategory.ROOFTOP_LOUNGE,
          ResourceCategory.STUDIO,
        ]),
      )
      .optional(),
    customerEligibility: z
      .enum([
        CustomerEligibility.ALL,
        CustomerEligibility.SPECIFIC_CUSTOMERS,
        CustomerEligibility.FIRST_TIME_ONLY,
        CustomerEligibility.DOMAIN_MATCH,
      ])
      .optional(),
    targetEmailDomains: z.array(z.string().trim().toLowerCase()).optional(),
    targetResourceIds: z.array(z.string().uuid()).optional(),
    targetCustomerIds: z.array(z.string().uuid()).optional(),
  })
  .refine(
    (data) => {
      if (data.type === DiscountType.PERCENTAGE && data.value !== undefined) {
        return data.value > 0 && data.value <= 100;
      }
      if (data.type === DiscountType.FIXED_AMOUNT && data.value !== undefined) {
        return data.value > 0;
      }
      if (data.type === DiscountType.FIXED_PRICE && data.value !== undefined) {
        return data.value >= 0;
      }
      return true;
    },
    {
      message:
        "Invalid discount value: Percentage must be between 0.01% and 100%, and fixed amount must be greater than 0",
      path: ["value"],
    },
  );

export const PreviewDiscountSchema = z.object({
  code: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((val) => (val && val.trim() ? normalizeCode(val) : undefined)),
  resourceId: z.string().trim().min(1, "Resource ID is required"),
  planId: z.string().trim().optional(),
  startTime: z.string().datetime({ message: "Valid ISO startTime required" }),
  endTime: z.string().datetime({ message: "Valid ISO endTime required" }),
});

export const ApplyCourtesyDiscountSchema = z
  .object({
    type: z.enum([
      DiscountType.PERCENTAGE,
      DiscountType.FIXED_AMOUNT,
      DiscountType.FIXED_PRICE,
    ]),
    value: z.number(),
    justificationNote: z
      .string()
      .trim()
      .min(
        10,
        "A detailed justification note of at least 10 characters is mandatory for staff courtesy overrides",
      )
      .max(1000)
      .transform(sanitizeString),
    waiveFee: z.boolean().optional().default(false),
  })
  .refine(
    (data) => {
      if (data.waiveFee) return true;
      if (data.type === DiscountType.PERCENTAGE) {
        return data.value > 0 && data.value <= 100;
      }
      if (data.type === DiscountType.FIXED_AMOUNT) {
        return data.value > 0;
      }
      if (data.type === DiscountType.FIXED_PRICE) {
        return data.value >= 0;
      }
      return true;
    },
    {
      message:
        "Percentage discount must be between 0.01% and 100%, and fixed amount must be greater than 0",
      path: ["value"],
    },
  );

export const DiscountFilterSchema = z.object({
  search: z.string().trim().optional(),
  isActive: z.preprocess((val) => {
    if (val === true || val === "true") return true;
    if (val === false || val === "false") return false;
    return undefined;
  }, z.boolean().optional()),
  type: z
    .enum([
      DiscountType.PERCENTAGE,
      DiscountType.FIXED_AMOUNT,
      DiscountType.FIXED_PRICE,
    ])
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
