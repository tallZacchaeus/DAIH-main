import { redis } from "../config/redis.js";
import { config } from "../config/env.js";
import { safeLogger } from "./sanitizer.js";

export interface TelemetryTags {
  matched: boolean;
  fingerprint_state: "null" | "matched" | "mismatched";
  tokenFamily?: string;
  sessionId?: string;
}

export interface SecurityAlertPayload {
  sessionId: string;
  tokenFamily: string;
  requestIp: string;
  userAgentHash: string;
  mismatchCount: number;
  eventType?: "MISMATCH_WARNING" | "REVOCATION";
}

// In-memory fallback debounce set (active if Redis is unreachable)
const inMemoryDebounceMap = new Map<string, number>();

/**
 * Records an un-debounced telemetry event.
 * Emits structured telemetry logs and increments Redis metric counters when available.
 */
export async function recordTelemetry(
  metricName: string,
  tags: TelemetryTags,
): Promise<void> {
  // 1. Structured log for Datadog / cloud log pipelines
  safeLogger.info(`[TELEMETRY] ${metricName}`, {
    metric: metricName,
    ...tags,
    timestamp: new Date().toISOString(),
  });

  // 2. Increment live Redis metric counters if Redis is accessible
  try {
    const key = `daih:telemetry:${metricName}:${tags.fingerprint_state}`;
    await redis.incr(key);
    // Set 24-hour expiry on live counter buckets
    await redis.expire(key, 86400);
  } catch {
    // Non-blocking telemetry persistence error
  }
}

/**
 * Delivers a real-time security alert with a 60-second debounce per tokenFamily and eventType.
 * Uses atomic Redis `SET NX EX 60` across distributed instances.
 * Fails OPEN (delivers alert) if the Redis debounce store is unreachable to prevent silence during outages.
 */
export async function sendDebouncedSecurityAlert(
  payload: SecurityAlertPayload,
): Promise<{ alerted: boolean }> {
  const eventPrefix = (payload.eventType || "mismatch_warning").toLowerCase();
  const debounceKey = `debounce:${eventPrefix}:${payload.tokenFamily}`;
  let acquiredLock = false;

  try {
    // Attempt distributed Redis atomic acquisition (60s TTL)
    const result = await redis.set(debounceKey, "1", "EX", 60, "NX");
    if (result === "OK") {
      acquiredLock = true;
    }
  } catch (redisError: any) {
    // FAIL-OPEN ON ALERTING: If Redis is unavailable, do NOT suppress the alert!
    // Over-alerting during an infrastructure degradation or attack is much safer than going silent.
    safeLogger.warn(
      `[SECURITY_ALERT_FAILOVER] Redis unavailable for alert debouncing (${redisError?.message || redisError}). Failing OPEN to guarantee alert delivery.`,
    );
    acquiredLock = true;
  }

  if (!acquiredLock) {
    // Debounced - alert was already dispatched within the 60s window
    return { alerted: false };
  }

  // Build the alert payload
  const alertDetails = {
    title:
      "⚠️ High Priority: Refresh Token Fingerprint Mismatch within Grace Window",
    severity: payload.mismatchCount >= 1 ? "CRITICAL" : "HIGH",
    sessionId: payload.sessionId,
    tokenFamily: payload.tokenFamily,
    requestIp: payload.requestIp,
    userAgentHash: payload.userAgentHash,
    mismatchCount: payload.mismatchCount,
    timestamp: new Date().toISOString(),
  };

  safeLogger.warn(
    "[SECURITY_ALERT] Grace Window Fingerprint Mismatch",
    alertDetails,
  );

  // Deliver to configured webhook (Slack, Discord, PagerDuty, or internal SIEM)
  if (config.security.alertWebhookUrl) {
    try {
      const response = await fetch(config.security.alertWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text:
            `🚨 *SECURITY ALERT*: Fingerprint mismatch during refresh grace window\n` +
            `*Session ID:* \`${payload.sessionId}\`\n` +
            `*Token Family:* \`${payload.tokenFamily}\`\n` +
            `*Request IP:* \`${payload.requestIp}\`\n` +
            `*UA Hash:* \`${payload.userAgentHash}\`\n` +
            `*Mismatch Count:* \`${payload.mismatchCount}\`\n` +
            `*Action:* ${payload.mismatchCount >= 1 ? "💥 Entire Token Family Revoked" : "⚠️ Grace granted (Strike 1)"}`,
        }),
      });

      if (!response.ok) {
        safeLogger.error(
          `Failed to deliver security alert webhook: HTTP ${response.status}`,
        );
      }
    } catch (err: any) {
      safeLogger.error(`Error sending security alert webhook: ${err.message}`);
    }
  }

  return { alerted: true };
}
