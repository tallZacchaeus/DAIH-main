import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  recordTelemetry,
  sendDebouncedSecurityAlert,
} from "./security-alert.js";
import { redis } from "../config/redis.js";

describe("Security Alert & Telemetry", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("records telemetry events without debouncing", async () => {
    const incrSpy = vi.spyOn(redis, "incr").mockResolvedValue(1);
    const expireSpy = vi.spyOn(redis, "expire").mockResolvedValue(1);

    await recordTelemetry("auth.refresh.grace_window_hit", {
      matched: true,
      fingerprint_state: "matched",
      tokenFamily: "fam-1",
    });

    expect(incrSpy).toHaveBeenCalledWith(
      "daih:telemetry:auth.refresh.grace_window_hit:matched",
    );
    expect(expireSpy).toHaveBeenCalled();
  });

  it("sends alert on first occurrence and debounces consecutive occurrences of the same eventType", async () => {
    vi.spyOn(redis, "set").mockResolvedValueOnce("OK" as any);

    const payload = {
      eventType: "MISMATCH_WARNING" as const,
      sessionId: "sess-1",
      tokenFamily: "fam-debounce-test",
      requestIp: "192.168.1.1",
      userAgentHash: "ua-hash-123",
      mismatchCount: 1,
    };

    const firstResult = await sendDebouncedSecurityAlert(payload);
    expect(firstResult.alerted).toBe(true);

    // Second call within 60s for same eventType fails to acquire lock (null from SET NX)
    vi.spyOn(redis, "set").mockResolvedValueOnce(null as any);

    const secondResult = await sendDebouncedSecurityAlert(payload);
    expect(secondResult.alerted).toBe(false);
  });

  it("does not suppress REVOCATION alerts even if preceded by MISMATCH_WARNING for the same family", async () => {
    // 1. Warning arrives and acquires debounce lock
    vi.spyOn(redis, "set").mockImplementation(((key: string) => {
      if (key.includes("mismatch_warning")) return Promise.resolve("OK");
      if (key.includes("revocation")) return Promise.resolve("OK");
      return Promise.resolve(null);
    }) as any);

    const warningResult = await sendDebouncedSecurityAlert({
      eventType: "MISMATCH_WARNING",
      sessionId: "sess-1",
      tokenFamily: "fam-distinct-keys",
      requestIp: "192.168.1.1",
      userAgentHash: "ua-hash-123",
      mismatchCount: 1,
    });
    expect(warningResult.alerted).toBe(true);

    // 2. Critical revocation arrives 1 second later -> Uses distinct debounce key, so it alerts!
    const revocationResult = await sendDebouncedSecurityAlert({
      eventType: "REVOCATION",
      sessionId: "sess-1",
      tokenFamily: "fam-distinct-keys",
      requestIp: "192.168.1.1",
      userAgentHash: "ua-hash-123",
      mismatchCount: 2,
    });
    expect(revocationResult.alerted).toBe(true);
  });

  it("fails OPEN (delivers alert) when Redis debounce store throws an error", async () => {
    // Redis throws connection error
    vi.spyOn(redis, "set").mockRejectedValue(
      new Error("Redis connection dropped"),
    );

    const result = await sendDebouncedSecurityAlert({
      eventType: "MISMATCH_WARNING",
      sessionId: "sess-1",
      tokenFamily: "fam-store-down",
      requestIp: "192.168.1.1",
      userAgentHash: "ua-hash-123",
      mismatchCount: 1,
    });

    // Fails OPEN to prevent swallowing critical alerts during infrastructure outages
    expect(result.alerted).toBe(true);
  });
});
