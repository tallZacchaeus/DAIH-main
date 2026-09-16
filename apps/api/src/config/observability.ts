import tracer from "dd-trace";
import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import { config } from "./env.js";
import {
  sanitizeMessage,
  sanitizeObject,
  safeLogger,
} from "../utils/sanitizer.js";

// 1. Initialize Datadog Tracer (must run before instrumented libraries)
if (
  process.env.DD_API_KEY ||
  process.env.DD_TRACE_ENABLED === "true" ||
  config.env === "production"
) {
  tracer.init({
    service: config.observability.ddService,
    env: config.observability.ddEnv,
    version: config.observability.ddVersion,
    logInjection: true,
  });
  safeLogger.info("Datadog Tracer initialized");
}

// 2. Initialize Sentry with Zero-Leakage Data Sanitization
if (config.observability.sentryDsn) {
  Sentry.init({
    dsn: config.observability.sentryDsn,
    environment: config.observability.ddEnv,
    integrations: [nodeProfilingIntegration()],
    tracesSampleRate: config.env === "production" ? 0.2 : 1.0,
    profilesSampleRate: 1.0,
    beforeSend(event) {
      if (event.exception?.values) {
        event.exception.values.forEach((val) => {
          if (val.value) {
            val.value = sanitizeMessage(val.value);
          }
        });
      }
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((b) => sanitizeObject(b));
      }
      if (event.request) {
        if (event.request.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.cookie;
        }
        if (event.request.data) {
          event.request.data = sanitizeObject(event.request.data);
        }
      }
      return event;
    },
  });
  safeLogger.info("Sentry Node SDK initialized with Zero-Leakage Sanitizer");
}

export { tracer, Sentry };
