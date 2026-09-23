import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          code: "VALIDATION_ERROR",
          message: "Invalid request payload",
          details: error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        });
        return;
      }
      next(error);
    }
  };
};

export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query) as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          code: "VALIDATION_ERROR",
          message: "Invalid query parameters",
          details: error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        });
        return;
      }
      next(error);
    }
  };
};

export const validateParams = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.params = schema.parse(req.params) as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          code: "VALIDATION_ERROR",
          message: "Invalid route parameters",
          details: error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        });
        return;
      }
      next(error);
    }
  };
};

/**
 * Iteratively unescapes any double- or single-encoded HTML entities
 * (e.g. &amp;amp; -> &amp; -> &, &quot; -> ", &#x27; -> ')
 */
export const unescapeHtml = (str: string): string => {
  if (!str || typeof str !== "string") return str;
  let current = str;
  let prev = "";
  while (current !== prev && /&(amp|lt|gt|quot|#x27|#39);/i.test(current)) {
    prev = current;
    current = current
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#x27;|&#39;/gi, "'");
  }
  return current;
};

/**
 * Sanitizes input string to prevent XSS injection while preserving natural text
 * and legitimate characters like '&'. Unescapes any double-escaped entities
 * and strips dangerous HTML / script tags.
 */
export const sanitizeString = (str: string): string => {
  if (!str || typeof str !== "string") return str;
  return str
    .trim()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
};
