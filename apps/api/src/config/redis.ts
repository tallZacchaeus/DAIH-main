import Redis from "ioredis";
import { config } from "./env.js";
import { sanitizeMessage, safeLogger } from "../utils/sanitizer.js";

function createRedisClient(): Redis {
  const isPlaceholder =
    config.redisUrl.includes("********") || !config.redisUrl;

  if (config.env === "test") {
    const dummy = new Redis({
      lazyConnect: true,
      enableOfflineQueue: false,
    });
    dummy.on("error", () => {});
    return dummy;
  }

  if (isPlaceholder) {
    safeLogger.info(
      "Redis: Disabled (placeholder credentials in REDIS_URL) - Using in-memory store.",
    );
    const dummy = new Redis({
      lazyConnect: true,
      enableOfflineQueue: false,
    });
    dummy.on("error", () => {});
    return dummy;
  }

  const isUpstash = config.redisUrl.includes("upstash.io");
  const isRediss = config.redisUrl.startsWith("rediss://");

  let resolvedUrl = config.redisUrl;
  if (isUpstash && !isRediss && resolvedUrl.startsWith("redis://")) {
    resolvedUrl = resolvedUrl.replace("redis://", "rediss://");
  }

  const options: any = {
    maxRetriesPerRequest: null,
    lazyConnect: true,
    retryStrategy(times: number) {
      if (times > 3 && config.env !== "production") {
        // In local dev, back off after 3 attempts so console isn't spammed
        return 15000;
      }
      return Math.min(times * 1000, 10000);
    },
  };

  if (isUpstash || isRediss || resolvedUrl.startsWith("rediss://")) {
    options.tls = {
      rejectUnauthorized: false,
    };
  }

  return new Redis(resolvedUrl, options);
}

export const redis = createRedisClient();

let lastErrorLog = 0;
let isConnected = false;

redis.on("ready", () => {
  isConnected = true;
  safeLogger.info(
    "Redis: Connected successfully (Distributed caching & rate-limiting active)",
  );
});

redis.on("connect", () => {
  isConnected = true;
});

redis.on("close", () => {
  if (isConnected) {
    isConnected = false;
    safeLogger.warn(
      "Redis: Connection closed - Falling back to in-memory store",
    );
  }
});

redis.on("error", (err) => {
  if (config.env === "test" || config.redisUrl.includes("********")) return;
  const now = Date.now();
  if (now - lastErrorLog > 30000) {
    const safeErrorMsg = sanitizeMessage(
      err?.message || "Connection unreachable",
    );
    safeLogger.warn(
      `Redis: Connection notice (${safeErrorMsg}) - Falling back to in-memory store`,
    );
    lastErrorLog = now;
  }
});
