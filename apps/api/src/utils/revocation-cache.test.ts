import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  checkSessionRevocation,
  InfrastructureUnavailableError,
  postgresCircuitBreaker,
  clearInProcessCache,
} from "./revocation-cache.js";
import { redis } from "../config/redis.js";
import { prisma } from "../db/client.js";

describe("Revocation Cache & Resilient Failover", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    postgresCircuitBreaker.reset();
    clearInProcessCache();
  });

  it("returns { isValid: false } when Redis identifies session as revoked and warms in-process cache", async () => {
    vi.spyOn(redis, "get").mockImplementation(((key: string) => {
      if (key.includes("revoked")) return Promise.resolve("1");
      return Promise.resolve(null);
    }) as any);

    const result = await checkSessionRevocation("session-123");
    expect(result).toEqual({ isValid: false });

    // Now make Redis fail -> In-process cache was warmed by write-through and still knows it's revoked
    vi.spyOn(redis, "get").mockRejectedValue(new Error("Redis dropped"));
    const failoverResult = await checkSessionRevocation("session-123");
    expect(failoverResult).toEqual({ isValid: false });
  });

  it("returns { isValid: true } when Redis identifies session as active and warms in-process cache", async () => {
    vi.spyOn(redis, "get").mockImplementation(((key: string) => {
      if (key.includes("revoked")) return Promise.resolve(null);
      if (key.includes("active")) return Promise.resolve("1");
      return Promise.resolve(null);
    }) as any);

    const result = await checkSessionRevocation("session-123");
    expect(result).toEqual({ isValid: true });

    // Now make Redis fail -> In-process cache was pre-warmed and still serves active state
    vi.spyOn(redis, "get").mockRejectedValue(new Error("Redis dropped"));
    const failoverResult = await checkSessionRevocation("session-123");
    expect(failoverResult).toEqual({ isValid: true });
  });

  it("falls back to PostgreSQL when Redis times out or throws an error", async () => {
    vi.spyOn(redis, "get").mockRejectedValue(
      new Error("Redis connection timeout"),
    );

    vi.spyOn(prisma.authSession, "findUnique").mockResolvedValue({
      id: "session-456",
      isRevoked: false,
      expiresAt: new Date(Date.now() + 60000),
    } as any);

    const result = await checkSessionRevocation("session-456");
    expect(result).toEqual({ isValid: true });
  });

  it("coalesces concurrent requests for the same session during a Redis outage into 1 Postgres query (single-flight)", async () => {
    // Redis is down
    vi.spyOn(redis, "get").mockRejectedValue(new Error("Redis outage"));

    // PostgreSQL mock with delay to simulate DB latency
    const dbQuerySpy = vi
      .spyOn(prisma.authSession, "findUnique")
      .mockImplementation((async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return {
          id: "session-coalesce-test",
          isRevoked: false,
          expiresAt: new Date(Date.now() + 60000),
        } as any;
      }) as any);

    // Fire 10 simultaneous concurrent verification requests for the same cold session ID
    const promises = Array.from({ length: 10 }).map(() =>
      checkSessionRevocation("session-coalesce-test"),
    );

    const results = await Promise.all(promises);

    // All 10 requests succeeded
    expect(results).toHaveLength(10);
    for (const r of results) {
      expect(r).toEqual({ isValid: true });
    }

    // Crucial: Postgres was queried EXACTLY ONCE, absorbing the thundering herd!
    expect(dbQuerySpy).toHaveBeenCalledTimes(1);
  });

  it("throws InfrastructureUnavailableError (fail closed) when both Redis and PostgreSQL fail", async () => {
    vi.spyOn(redis, "get").mockRejectedValue(new Error("Redis unreachable"));
    vi.spyOn(prisma.authSession, "findUnique").mockRejectedValue(
      new Error("PostgreSQL connection refused"),
    );

    await expect(checkSessionRevocation("session-789")).rejects.toThrow(
      InfrastructureUnavailableError,
    );
  });

  it("permits in-flight requests during rotation grace window when an active family session exists", async () => {
    vi.spyOn(redis, "get").mockRejectedValue(new Error("Redis offline"));

    // Session was marked isRevoked: true just 5 seconds ago during rotation
    vi.spyOn(prisma.authSession, "findUnique").mockResolvedValue({
      id: "session-old-rotated",
      tokenFamily: "family-grace-123",
      isRevoked: true,
      updatedAt: new Date(Date.now() - 5000), // 5 seconds ago
      expiresAt: new Date(Date.now() + 600000), // access token still unexpired
    } as any);

    // Active replacement session in the same token family exists
    vi.spyOn(prisma.authSession, "findFirst").mockResolvedValue({
      id: "session-new-active",
    } as any);

    const result = await checkSessionRevocation("session-old-rotated");
    expect(result).toEqual({ isValid: true });
  });

  it("rejects revoked session immediately if no active family session exists (e.g. explicit logout)", async () => {
    vi.spyOn(redis, "get").mockRejectedValue(new Error("Redis offline"));

    // Session was revoked during explicit logout
    vi.spyOn(prisma.authSession, "findUnique").mockResolvedValue({
      id: "session-logged-out",
      tokenFamily: "family-logout-456",
      isRevoked: true,
      updatedAt: new Date(Date.now() - 2000),
      expiresAt: new Date(Date.now() + 600000),
    } as any);

    // No active session in this family (all were revoked on logout)
    vi.spyOn(prisma.authSession, "findFirst").mockResolvedValue(null);

    const result = await checkSessionRevocation("session-logged-out");
    expect(result).toEqual({ isValid: false });
  });
});
