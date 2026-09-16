import { z } from "zod";
import { sanitizeString } from "../../middleware/validate.middleware.js";
import { PaymentStatus, PaymentMethod } from "@daih/types";

export const InitializePaymentParamsSchema = z.object({
  bookingId: z
    .string()
    .trim()
    .min(1, "Booking ID is required")
    .transform(sanitizeString),
});

export const InitializePaymentBodySchema = z.object({
  callbackUrl: z.string().url("Invalid callback URL").optional(),
});

export const TransactionIdParamsSchema = z.object({
  transactionId: z
    .string()
    .trim()
    .min(1, "Transaction ID is required")
    .transform(sanitizeString),
});

export const BookingIdParamsSchema = z.object({
  bookingId: z
    .string()
    .trim()
    .min(1, "Booking ID is required")
    .transform(sanitizeString),
});

export const TransactionFilterQuerySchema = z.object({
  status: z.nativeEnum(PaymentStatus).optional(),
  method: z.nativeEnum(PaymentMethod).optional(),
  search: z.string().trim().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(1000).default(20),
});

export const ReconciliationQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const DailySummaryQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
    .optional(),
});

export const PaystackWebhookSchema = z.object({
  event: z.string().trim().min(1, "Webhook event is required"),
  data: z
    .object({
      id: z.union([z.number(), z.string()]).optional(),
      reference: z.string().optional(),
      amount: z.number().optional(),
      status: z.string().optional(),
      channel: z.string().nullable().optional(),
      paid_at: z.string().nullable().optional(),
      gateway_response: z.string().nullable().optional(),
      currency: z.string().optional(),
      metadata: z
        .union([z.record(z.unknown()), z.number(), z.string(), z.null()])
        .optional(),
    })
    .passthrough()
    .optional(),
});
