import { z } from "zod";
import { sanitizeString } from "../../middleware/validate.middleware.js";
import {
  PaymentStatus,
  PaymentMethod,
  RefundStatus,
  RefundReasonCode,
} from "@daih/types";

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

// Dual-Authorization Refund Schemas
export const RaiseRefundRequestSchema = z.object({
  bookingId: z
    .string()
    .trim()
    .min(1, "Booking ID is required")
    .transform(sanitizeString),
  reasonCode: z.nativeEnum(RefundReasonCode),
  reason: z
    .string()
    .trim()
    .min(
      20,
      "Refund request reason must be at least 20 characters describing the justification",
    ),
});

export const RefundRequestIdParamsSchema = z.object({
  id: z
    .string()
    .trim()
    .min(1, "Refund request ID is required")
    .transform(sanitizeString),
});

export const RequestInfoBodySchema = z.object({
  question: z
    .string()
    .trim()
    .min(5, "Clarification question must be at least 5 characters"),
});

export const ProvideInfoBodySchema = z.object({
  response: z
    .string()
    .trim()
    .min(5, "Response clarification must be at least 5 characters"),
});

export const RejectRefundBodySchema = z.object({
  rejectionReason: z
    .string()
    .trim()
    .min(5, "Rejection reason must be at least 5 characters"),
});

export const ListRefundsQuerySchema = z.object({
  status: z.nativeEnum(RefundStatus).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
