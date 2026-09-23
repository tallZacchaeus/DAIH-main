import { describe, it, expect } from "vitest";
import {
  sanitizeString,
  validateParams,
  validateBody,
} from "./validate.middleware.js";
import { z } from "zod";
import { Request, Response } from "express";

describe("Sanitization & Validation Middleware Suite", () => {
  describe("sanitizeString Helper", () => {
    it("should trim leading and trailing whitespace", () => {
      expect(sanitizeString("   hello world   ")).toBe("hello world");
    });

    it("should escape HTML tags and special characters to prevent XSS", () => {
      const input = '<script>alert("xss")</script>';
      const sanitized = sanitizeString(input);
      expect(sanitized).toBe(
        "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;",
      );
    });

    it("should escape single quotes and ampersands", () => {
      const input = "Tom & 'Jerry'";
      const sanitized = sanitizeString(input);
      expect(sanitized).toBe("Tom &amp; &#x27;Jerry&#x27;");
    });
  });

  describe("validateParams Middleware", () => {
    const schema = z.object({
      id: z.string().trim().min(1).transform(sanitizeString),
    });

    it("should pass valid route params through and sanitize", () => {
      const req = { params: { id: "<test-id>" } } as unknown as Request;
      const res = {} as Response;
      let nextCalled = false;
      const next = () => {
        nextCalled = true;
      };

      validateParams(schema)(req, res, next);

      expect(nextCalled).toBe(true);
      expect(req.params.id).toBe("&lt;test-id&gt;");
    });

    it("should return 400 status if param validation fails", () => {
      const req = { params: { id: "" } } as unknown as Request;
      let statusValue = 0;
      let jsonBody: any = null;
      const res = {
        status: (code: number) => {
          statusValue = code;
          return {
            json: (data: any) => {
              jsonBody = data;
            },
          };
        },
      } as unknown as Response;

      validateParams(schema)(req, res, (() => {}) as any);

      expect(statusValue).toBe(400);
      expect(jsonBody.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("Infrastructure & Upstash Redis Error Masking", () => {
    it("should scrub Upstash Redis quota limit errors in sanitizeMessage", async () => {
      const { sanitizeMessage } = await import("../utils/sanitizer.js");
      const upstashError =
        "ERR max requests limit exceeded. Limit: 500000, Usage: 500000. See https://upstash.com/docs/redis/troubleshooting/max_requests_limit for details";
      const cleaned = sanitizeMessage(upstashError);
      expect(cleaned).not.toContain("500000");
      expect(cleaned).not.toContain("upstash.com");
      expect(cleaned).toBe("Service temporarily unavailable");
    });

    it("should return generic friendly message on 500 in errorHandler", async () => {
      const { errorHandler } = await import("./error-handler.middleware.js");
      const error: any = new Error(
        "ERR max requests limit exceeded. Limit: 500000, Usage: 500000. See https://upstash.com/docs/redis/troubleshooting/max_requests_limit for details",
      );

      let statusValue = 0;
      let jsonBody: any = null;
      const res = {
        status: (code: number) => {
          statusValue = code;
          return {
            json: (data: any) => {
              jsonBody = data;
            },
          };
        },
      } as unknown as Response;

      errorHandler(error, {} as Request, res, (() => {}) as any);

      expect(statusValue).toBe(500);
      expect(jsonBody.code).toBe("INTERNAL_SERVER_ERROR");
      expect(jsonBody.message).toBe(
        "Service temporarily unavailable. Please try again shortly.",
      );
      expect(jsonBody.message).not.toContain("upstash");
      expect(jsonBody.message).not.toContain("500000");
    });
  });
});
