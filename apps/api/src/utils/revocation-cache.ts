import { redis } from "../config/redis.js";
import { prisma } from "../db/client.js";
import { config } from "../config/env.js";
import { CircuitBreaker } from "./circuit-breaker.js";
import { safeLogger } from "./sanitizer.js";

export class InfrastructureUnavailableError extends Error {
  constructor(
    message = "Authentication infrastructure is temporarily unavailable. Please retry.",
  ) {
    super(message);
    this.name = "InfrastructureUnavailableError";
  }
}

// In-process short-TTL shielding cache (active only during Redis outages to protect Postgres)
interface InProcessSessionCacheEntry {
  isValid: boolean;
  expiresAt: number;
}
const inProcessRevocationCache = new Map<string, InProcessSessionCacheEntry>();

function getInProcessCache(sessionId: string): boolean | undefined {
  const entry = inProcessRevocationCache.get(sessionId);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    inProcessRevocationCache.delete(sessionId);
    return undefined;
  }
  return entry.isValid;
}

export function setInProcessCache(
  sessionId: string,
  isValid: boolean,
  ttlMs = 5000,
): void {
  // Prune map if overly large (prevent runaway memory usage)
  if (inProcessRevocationCache.size > 10000) {
    const now = Date.now();
    for (const [key, val] of inProcessRevocationCache.entries()) {
      if (now > val.expiresAt) {
        inProcessRevocationCache.delete(key);
      }
    }
  }

  inProcessRevocationCache.set(sessionId, {
    isValid,
    expiresAt: Date.now() + ttlMs,
  });
}

export function invalidateInProcessCache(sessionId: string): void {
  inProcessRevocationCache.set(sessionId, {
    isValid: false,
    expiresAt: Date.now() + 5000,
  });
}

// Circuit breaker specifically guarding the PostgreSQL session fallback path
export const postgresCircuitBreaker = new CircuitBreaker({
  name: "postgres-session-revocation",
  failureThreshold: 3,
  resetTimeoutMs: config.security.circuitBreakerResetTimeoutMs || 12000,
});

/**
 * Executes a promise with an explicit timeout rejection.
 */
function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string,
): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timer);
  });
}

// In-flight query coalescing map (Single-flight pattern per sessionId)
// Ensures concurrent requests for the same session during a Redis outage coalesce into 1 DB query
const inFlightQueries = new Map<string, Promise<{ isValid: boolean }>>();

/**
 * Checks whether a given sessionId is revoked or active.
 *
 * Resilient Multi-tier Hierarchy:
 * 1. Redis check with strict 250ms timeout.
 * 2. Continuous Write-Through: healthy Redis lookups continuously warm the in-process cache (5s TTL).
 * 3. In-Process Shielding Cache: absorbs all active session lookups if Redis drops.
 * 4. Request Coalescing (Single-Flight): concurrent cold lookups for the same sessionId share 1 DB query.
 * 5. PostgreSQL database verification protected by an FSM Circuit Breaker.
 * 6. Total Outage: fails CLOSED by throwing InfrastructureUnavailableError (HTTP 503).
 */
export async function checkSessionRevocation(
  sessionId: string,
): Promise<{ isValid: boolean }> {
  let redisAccessible = false;
  const timeoutMs = config.security.redisOpTimeoutMs || 250;

  // ─── Tier 1: Redis Fast Lookup with Explicit Timeout ───────────────────────
  try {
    const revoked = await withTimeout(
      redis.get(`daih:session:revoked:${sessionId}`),
      timeoutMs,
      `Redis timeout (${timeoutMs}ms) checking revoked status for ${sessionId}`,
    );

    if (revoked) {
      // Continuous warming: keep in-process cache warm before any outage
      setInProcessCache(sessionId, false, 5000);
      return { isValid: false };
    }

    const active = await withTimeout(
      redis.get(`daih:session:active:${sessionId}`),
      timeoutMs,
      `Redis timeout (${timeoutMs}ms) checking active status for ${sessionId}`,
    );

    if (active === "1") {
      // Continuous warming: keep in-process cache warm before any outage
      setInProcessCache(sessionId, true, 5000);
      return { isValid: true };
    }

    // Redis was reached cleanly, but neither key was found (cache miss)
    redisAccessible = true;
  } catch (redisError: any) {
    // Redis is timed out or unavailable -> Failover mode
    safeLogger.warn(
      `[REVOCATION_FAILOVER] Redis unavailable during session check (${redisError?.message || redisError}). Engaging failover tiers.`,
    );

    // Check Tier 2: In-Process Shielding Cache (pre-warmed by write-through)
    const inProcessValid = getInProcessCache(sessionId);
    if (inProcessValid !== undefined) {
      return { isValid: inProcessValid };
    }
  }

  // ─── Tier 3: Single-Flight Coalescing around PostgreSQL & Circuit Breaker ───
  // If multiple concurrent requests for the same session arrive during cold-start failover,
  // coalesce them into a single in-flight Promise so Postgres is queried exactly once.
  const existingInFlight = inFlightQueries.get(sessionId);
  if (existingInFlight) {
    return await existingInFlight;
  }

  const queryPromise = (async () => {
    try {
      const session = await postgresCircuitBreaker.execute(async () => {
        return await prisma.authSession.findUnique({
          where: { id: sessionId },
        });
      });

      const isValid = Boolean(
        session && !session.isRevoked && session.expiresAt > new Date(),
      );

      // Warm in-process cache to shield Postgres from subsequent requests for 5s
      setInProcessCache(sessionId, isValid, 5000);

      // If Redis is reachable, update Redis caches
      if (redisAccessible) {
        try {
          if (isValid) {
            await redis.setex(`daih:session:active:${sessionId}`, 900, "1");
          } else {
            await redis.setex(`daih:session:revoked:${sessionId}`, 900, "1");
          }
        } catch {
          // Non-blocking cache write error
        }
      }

      return { isValid };
    } catch (error: any) {
      // Tier 4: Total Outage - Fail CLOSED (Never pass through unverified tokens)
      safeLogger.error(
        `[REVOCATION_CRITICAL] Both Redis and PostgreSQL failed during session verification: ${error?.message || error}`,
      );
      throw new InfrastructureUnavailableError(
        "Session verification infrastructure unavailable",
      );
    } finally {
      inFlightQueries.delete(sessionId);
    }
  })();

  inFlightQueries.set(sessionId, queryPromise);
  return await queryPromise;
}
