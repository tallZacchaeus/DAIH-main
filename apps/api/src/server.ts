import "./config/observability.js";
import { app } from "./app.js";
import { config, validateProductionConfig } from "./config/env.js";
import {
  safeLogger,
  sanitizeMessage,
  sanitizeStack,
} from "./utils/sanitizer.js";

// Validate production security configuration
validateProductionConfig();

// Catch unhandled promise rejections and uncaught exceptions with zero-leakage guarantee
process.on("unhandledRejection", (reason: any) => {
  const message =
    typeof reason === "string"
      ? reason
      : reason?.message || "Unhandled Rejection";
  const stack = reason?.stack;
  safeLogger.error(
    "[Unhandled Rejection]",
    sanitizeMessage(message),
    sanitizeStack(stack) || "",
  );
});

process.on("uncaughtException", (error: Error) => {
  safeLogger.error(
    "[Uncaught Exception]",
    sanitizeMessage(error.message),
    sanitizeStack(error.stack) || "",
  );
});

const server = app.listen(config.port, () => {
  safeLogger.info(
    `DAIH Modular API running on http://localhost:${config.port}`,
  );
  safeLogger.info(`Health endpoint: http://localhost:${config.port}/health`);
  safeLogger.info(`Uploads endpoint: http://localhost:${config.port}/uploads`);
});

export default server;
