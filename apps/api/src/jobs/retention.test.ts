import { describe, it, expect, beforeEach, vi } from "vitest";
import { retentionService } from "./retention.worker.js";
import { prisma } from "../db/client.js";
import { UserRole } from "@daih/types";

const mockUsers: any[] = [];
const mockSessions: any[] = [];
const mockBookings: any[] = [];
const mockResetTokens: any[] = [];
const mockVerifyTokens: any[] = [];
const mockMfaTokens: any[] = [];
const mockAuditLogs: any[] = [];

vi.mock("../db/client.js", () => {
  return {
    prisma: {
      passwordResetToken: {
        deleteMany: vi.fn(async () => ({ count: 3 })),
      },
      verificationToken: {
        deleteMany: vi.fn(async () => ({ count: 5 })),
      },
      mfaOtpToken: {
        deleteMany: vi.fn(async () => ({ count: 2 })),
      },
      authSession: {
        deleteMany: vi.fn(async () => ({ count: 4 })),
      },
      user: {
        findMany: vi.fn(async () => mockUsers),
        update: vi.fn(async ({ where, data }: any) => {
          const u = mockUsers.find((user) => user.id === where.id);
          if (u) Object.assign(u, data);
          return u;
        }),
      },
      auditLog: {
        create: vi.fn(async ({ data }: any) => {
          mockAuditLogs.push(data);
          return { id: "audit_1", ...data };
        }),
      },
      $transaction: vi.fn(async (callback: any) => {
        if (typeof callback === "function") {
          return callback(prisma);
        }
        return callback;
      }),
    },
  };
});

vi.mock("../modules/events/outbox.service.js", () => ({
  outboxService: {
    publish: vi.fn(async () => {}),
    recordEvent: vi.fn(async () => {}),
  },
}));

describe("Data Retention & Anonymization Worker", () => {
  beforeEach(() => {
    mockUsers.length = 0;
    mockSessions.length = 0;
    mockBookings.length = 0;
    mockAuditLogs.length = 0;
    vi.clearAllMocks();
  });

  it("purges expired reset, verification, MFA OTP tokens and stale sessions", async () => {
    const summary = await retentionService.purgeExpiredTokens();

    expect(summary.expiredPasswordResetTokens).toBe(3);
    expect(summary.expiredVerificationTokens).toBe(5);
    expect(summary.expiredMfaOtpTokens).toBe(2);
    expect(summary.expiredSessions).toBe(4);
  });

  it("anonymizes inactive customer accounts and preserves clientId for audit trail", async () => {
    const dormantUser = {
      id: "usr_dormant_1",
      email: "dormant@example.com",
      firstName: "Dormant",
      lastName: "User",
      phoneNumber: "+2348000000000",
      clientId: "DAIH-2024-000042",
      role: UserRole.CUSTOMER,
      skipAnonymization: false,
    };
    mockUsers.push(dormantUser);

    const result = await retentionService.anonymizeInactiveCustomers(24);

    expect(result.anonymizedUsersCount).toBe(1);
    expect(result.anonymizedUserIds).toContain("usr_dormant_1");

    // Personal fields replaced
    expect(dormantUser.firstName).toBe("Anonymized");
    expect(dormantUser.lastName).toBe("Customer");
    expect(dormantUser.phoneNumber).toBeNull();
    expect(dormantUser.email).toContain("@daih.anonymized");

    // Client ID preserved for financial accounting & audit trail
    expect(dormantUser.clientId).toBe("DAIH-2024-000042");

    // Audit log created
    expect(mockAuditLogs.length).toBe(1);
    expect(mockAuditLogs[0].action).toBe("USER_ANONYMIZED");
  });
});
