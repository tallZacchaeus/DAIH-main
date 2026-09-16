import { z } from "zod";
import { sanitizeString } from "../../middleware/validate.middleware.js";

export const VerifyQrSchema = z.object({
  token: z
    .string()
    .trim()
    .min(1, "Access token or reference is required")
    .transform(sanitizeString),
});

export const BookingIdParamSchema = z.object({
  bookingId: z
    .string()
    .trim()
    .min(1, "Booking ID is required")
    .transform(sanitizeString),
});

export const CheckInSchema = z.object({
  terminalId: z
    .string()
    .optional()
    .transform((v) => (v ? sanitizeString(v) : "REC-GATE-01")),
  notes: z
    .string()
    .optional()
    .transform((v) => (v ? sanitizeString(v) : undefined)),
});

export const CheckOutSchema = z.object({
  terminalId: z
    .string()
    .optional()
    .transform((v) => (v ? sanitizeString(v) : "REC-GATE-01")),
  notes: z
    .string()
    .optional()
    .transform((v) => (v ? sanitizeString(v) : undefined)),
});

export const AccessSearchQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(1, "Search query is required")
    .transform(sanitizeString),
});

export const TerminalActivityQuerySchema = z.object({
  terminalId: z
    .string()
    .optional()
    .transform((v) => (v ? sanitizeString(v) : undefined)),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
});

export const VisitsActivityQuerySchema = z.object({
  terminalId: z
    .string()
    .optional()
    .transform((v) => (v ? sanitizeString(v) : undefined)),
  startDate: z
    .string()
    .optional()
    .transform((v) => (v ? sanitizeString(v) : undefined)),
  endDate: z
    .string()
    .optional()
    .transform((v) => (v ? sanitizeString(v) : undefined)),
  status: z.enum(["ALL", "ON_SITE", "CHECKED_OUT"]).optional().default("ALL"),
  search: z
    .string()
    .optional()
    .transform((v) => (v ? sanitizeString(v) : undefined)),
  limit: z.coerce.number().min(1).max(200).optional().default(100),
  offset: z.coerce.number().min(0).optional().default(0),
});
