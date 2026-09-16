import { Router } from "express";
import { Sentry, tracer } from "../../config/observability.js";
import { config } from "../../config/env.js";

export const debugRouter = Router();

// Middleware ensuring debug endpoints are not publicly accessible in production
debugRouter.use((_req, res, next) => {
  if (config.env === "production" && process.env.ENABLE_PROD_DEBUG !== "true") {
    res.status(404).json({
      code: "NOT_FOUND",
      message: "Debug routes disabled in production",
    });
    return;
  }
  next();
});

/**
 * Deliberate Sentry test exception endpoint
 */
debugRouter.get("/sentry-error", (_req, _res, next) => {
  try {
    throw new Error(
      "DAIH Smoke Test Exception — Milestone 1.1 Sentry Verification",
    );
  } catch (error) {
    Sentry.captureException(error);
    next(error);
  }
});

/**
 * Deliberate Datadog custom span endpoint
 */
debugRouter.get("/datadog-span", (_req, res) => {
  const span = tracer.startSpan("smoke_test.custom_span", {
    tags: {
      "test.name": "Milestone 1.1 Datadog Smoke Test",
      "test.timestamp": new Date().toISOString(),
    },
  });

  setTimeout(() => {
    span.finish();
    res.json({
      success: true,
      message: "Datadog span created and finished successfully",
      traceId: span.context().toTraceId(),
      spanId: span.context().toSpanId(),
    });
  }, 50);
});
