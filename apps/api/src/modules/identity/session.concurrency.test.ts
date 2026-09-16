import { describe, it, expect, vi, beforeEach } from "vitest";
import { SessionService } from "./session.service.js";
import { prisma } from "../../db/client.js";
import { redis } from "../../config/redis.js";
import * as securityAlert from "../../utils/security-alert.js";

describe("Session Family Concurrency & Atomic Mismatch Tracking", () => {
  let sessionService: SessionService;

  beforeEach(() => {
    vi.restoreAllMocks();
    sessionService = new SessionService();
  });

  it("propagates mismatchCount across family and revokes when strike 2 hits a different session row", async () => {
    const tokenFamily = "family-concurrency-123";
    const user = {
      id: "user-1",
      email: "test@daih.ng",
      role: "CUSTOMER" as const,
      clientId: "client-1",
      firstName: "Test",
      lastName: "User",
      phoneNumber: "08012345678",
      avatarUrl: null,
      birthday: null,
      isVerified: true,
      createdAt: new Date(),
      referralCode: null,
    };

    // Shared family mismatch state
    let familyMismatchCount = 0;

    // Session Row A (revoked recently within grace window)
    const sessionRowA: any = {
      id: "session-row-a",
      userId: user.id,
      tokenFamily,
      deviceFingerprint: "fingerprint-legitimate",
      mismatchCount: familyMismatchCount,
      isRevoked: true,
      updatedAt: new Date(), // Just revoked 500ms ago (within 3000ms grace window)
      expiresAt: new Date(Date.now() + 60000),
      user,
    };

    // Session Row B (active rotated session in the same family)
    const sessionRowB: any = {
      id: "session-row-b",
      userId: user.id,
      tokenFamily,
      deviceFingerprint: "fingerprint-legitimate",
      mismatchCount: familyMismatchCount,
      isRevoked: false,
      expiresAt: new Date(Date.now() + 60000),
      user,
    };

    // Track security alert calls
    const alertSpy = vi
      .spyOn(securityAlert, "sendDebouncedSecurityAlert")
      .mockResolvedValue({ alerted: true });
    vi.spyOn(securityAlert, "recordTelemetry").mockResolvedValue();
    vi.spyOn(redis, "setex").mockResolvedValue("OK" as any);

    // Mock prisma
    vi.spyOn(prisma.authSession, "findUnique").mockImplementation(
      (async () => sessionRowA) as any,
    );
    vi.spyOn(prisma.authSession, "findFirst").mockImplementation((async (
      args: any,
    ) => {
      // If querying for activeSession
      if (args?.where?.isRevoked === false) {
        return sessionRowB;
      }
      // If querying for post-increment mismatchCount
      return { mismatchCount: familyMismatchCount } as any;
    }) as any);

    vi.spyOn(prisma.authSession, "updateMany").mockImplementation((async (
      args: any,
    ) => {
      if (args?.data?.mismatchCount?.increment) {
        familyMismatchCount += args.data.mismatchCount.increment;
      }
      return { count: 2 } as any;
    }) as any);

    vi.spyOn(prisma.authSession, "create").mockResolvedValue({
      id: "session-row-c",
      ...sessionRowB,
    } as any);

    // ─── STRIKE 1: Presented against Session Row A with mismatched fingerprint ───
    const strike1Context = {
      ipAddress: "198.51.100.1",
      userAgent: "AttackerBot/1.0",
      deviceFingerprint: "fingerprint-attacker-1",
    };

    const result1 = await sessionService.rotateRefreshToken(
      "raw-token-strike-1",
      strike1Context,
    );

    // Strike 1 granted with active token pair
    expect(result1.accessToken).toBeDefined();
    expect(familyMismatchCount).toBe(1);

    // Warning alert fired
    expect(alertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "MISMATCH_WARNING",
        tokenFamily,
        mismatchCount: 1,
      }),
    );

    // ─── STRIKE 2: Presented against Session Row B with another mismatched fingerprint ───
    // Now sessionRowB is revoked or another token in the family is presented
    sessionRowB.isRevoked = true;
    sessionRowB.updatedAt = new Date();
    vi.spyOn(prisma.authSession, "findUnique").mockImplementation(
      (async () => sessionRowB) as any,
    );

    const strike2Context = {
      ipAddress: "203.0.113.99",
      userAgent: "AttackerBot/2.0",
      deviceFingerprint: "fingerprint-attacker-2",
    };

    // Strike 2 MUST throw REFRESH_TOKEN_REUSE_DETECTED and revoke the family
    await expect(
      sessionService.rotateRefreshToken("raw-token-strike-2", strike2Context),
    ).rejects.toThrow("REFRESH_TOKEN_REUSE_DETECTED");

    expect(familyMismatchCount).toBe(2);

    // Revocation alert fired with distinct eventType
    expect(alertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "REVOCATION",
        tokenFamily,
        mismatchCount: 2,
      }),
    );
  });
});
