import { z } from "zod";
import { sanitizeString } from "../../middleware/validate.middleware.js";
import {
  CampaignType,
  CampaignTriggerType,
  CampaignChannel,
  CampaignStatus,
} from "@daih/types";

export const CampaignIdParamsSchema = z.object({
  id: z
    .string()
    .trim()
    .min(1, "Campaign ID is required")
    .transform(sanitizeString),
});

export const CreateCampaignSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Campaign name must be at least 3 characters")
    .max(100),
  description: z.string().trim().max(300).optional(),
  type: z.nativeEnum(CampaignType),
  triggerType: z
    .nativeEnum(CampaignTriggerType)
    .optional()
    .default(CampaignTriggerType.SCHEDULED_CRON),
  channel: z
    .nativeEnum(CampaignChannel)
    .optional()
    .default(CampaignChannel.EMAIL),
  subject: z.string().trim().min(3).max(200).optional(),
  body: z
    .string()
    .trim()
    .min(10, "Campaign body content must be at least 10 characters"),
  coinReward: z.coerce.number().min(0).max(5000).optional(),
  discountPercentage: z.coerce.number().min(0).max(100).optional(),
  isDiscretionary: z.boolean().optional().default(true),
  frequencyCapDays: z.coerce
    .number()
    .int()
    .min(1)
    .max(30)
    .optional()
    .default(7),
  budgetLimitNgn: z.coerce.number().min(0).optional(),
  holdoutPercentage: z.coerce
    .number()
    .int()
    .min(0)
    .max(50)
    .optional()
    .default(10),
  aiGenerated: z.boolean().optional().default(false),
  aiPrompt: z.string().optional(),
  audienceFilter: z.record(z.unknown()).optional(),
  scheduledAt: z.string().datetime().optional(),
  status: z.nativeEnum(CampaignStatus).optional(),
});

export const UpdateCampaignSchema = CreateCampaignSchema.partial().extend({
  status: z.nativeEnum(CampaignStatus).optional(),
});

export const GenerateCopySchema = z.object({
  campaignType: z.nativeEnum(CampaignType),
  goal: z.string().trim().min(5, "Campaign goal must be at least 5 characters"),
  tone: z
    .enum(["enthusiastic", "professional", "urgent", "friendly"])
    .optional()
    .default("friendly"),
  targetAudienceDescription: z.string().trim().optional(),
  coinReward: z.coerce.number().min(0).optional(),
  discountPercentage: z.coerce.number().min(0).max(100).optional(),
});

export const ListCampaignsQuerySchema = z.object({
  status: z.nativeEnum(CampaignStatus).optional(),
  type: z.nativeEnum(CampaignType).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
