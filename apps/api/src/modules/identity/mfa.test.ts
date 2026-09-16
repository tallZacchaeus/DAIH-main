import { describe, it, expect, beforeEach, vi } from "vitest";
import jwt from "jsonwebtoken";
import { mfaService, generateTotpCode } from "./mfa.service.js";
import { identityService } from "./identity.service.js";
import { passwordService } from "./password.service.js";
import { prisma } from "../../db/client.js";
import { config } from "../../config/env.js";
import { UserRole } from "@daih/types";

// In-memory test store for isolated testing
const mockUsers: any[] = [];
const mockOtpTokens: any[] = [];
const mockSessions: any[] = [];
const mockAuditLogs: any[] = [];
const mockResetTokens: any[] = [];

vi.mock("../../db/client.js", () => {
  return {
    prisma: {
      user: {
        findUnique: vi.fn(async ({ where }: any) => {
          if (where.email)
            return mockUsers.find((u) => u.email === where.email) || null;
          if (where.id) return mockUsers.find((u) => u.id === where.id) || null;
          return null;
        }),
        update: vi.fn(async ({ where, data }: any) => {
          const idx = mockUsers.findIndex((u) => u.id === where.id);
          if (idx === -1) throw new Error("User not found");
          mockUsers[idx] = { ...mockUsers[idx], ...data };
          return mockUsers[idx];
        }),
      },
      mfaOtpToken: {
        create: vi.fn(async ({ data }: any) => {
          const rec = {
            id: `otp_${Date.now()}_${Math.random()}`,
            usedAt: null,
            ...data,
            createdAt: new Date(),
          };
          mockOtpTokens.push(rec);
          return rec;
        }),
        findFirst: vi.fn(async ({ where }: any) => {
          return (
            mockOtpTokens.find(
              (t) =>
                t.userId === where.userId &&
                t.tokenHash === where.tokenHash &&
                (where.usedAt === null ? t.usedAt === null : true) &&
                (where.expiresAt?.gt ? t.expiresAt > where.expiresAt.gt : true),
            ) || null
          );
        }),
        update: vi.fn(async ({ where, data }: any) => {
          const idx = mockOtpTokens.findIndex((t) => t.id === where.id);
          if (idx !== -1)
            mockOtpTokens[idx] = { ...mockOtpTokens[idx], ...data };
          return mockOtpTokens[idx];
        }),
        updateMany: vi.fn(async ({ where, data }: any) => {
          let count = 0;
          mockOtpTokens.forEach((t, i) => {
            if (
              t.userId === where.userId &&
              (!where.usedAt || t.usedAt === where.usedAt)
            ) {
              mockOtpTokens[i] = { ...t, ...data };
              count++;
            }
          });
          return { count };
        }),
      },
      authSession: {
        create: vi.fn(async ({ data }: any) => {
          const rec = {
            id: `sess_${Date.now()}`,
            ...data,
            createdAt: new Date(),
          };
          mockSessions.push(rec);
          return rec;
        }),
        findMany: vi.fn(async ({ where }: any) => {
          return mockSessions.filter(
            (s) =>
              s.userId === where.userId &&
              (where.isRevoked === false ? !s.isRevoked : true),
          );
        }),
        updateMany: vi.fn(async ({ where, data }: any) => {
          let count = 0;
          mockSessions.forEach((s, idx) => {
            if (s.userId === where.userId) {
              mockSessions[idx] = { ...s, ...data };
              count++;
            }
          });
          return { count };
        }),
      },
      passwordResetToken: {
        findUnique: vi.fn(async ({ where }: any) => {
          return (
            mockResetTokens.find((t) => t.tokenHash === where.tokenHash) || null
          );
        }),
        update: vi.fn(async ({ where, data }: any) => {
          const idx = mockResetTokens.findIndex((t) => t.id === where.id);
          if (idx !== -1)
            mockResetTokens[idx] = { ...mockResetTokens[idx], ...data };
          return mockResetTokens[idx];
        }),
      },
      outboxEvent: {
        create: vi.fn(async ({ data }: any) => {
          return { id: `outbox_${Date.now()}`, ...data };
        }),
      },
      emailTemplate: {
        findUnique: vi.fn(async ({ where }: any) => ({
          id: `tmpl_${where.type}`,
          type: where.type,
          subject: "Your One-Time Password",
          htmlBody: "<p>Your code is: {{otp_code}}</p>",
          textBody: "Your code is: {{otp_code}}",
          isActive: true,
        })),
      },
      auditLog: {
        create: vi.fn(async ({ data }: any) => {
          mockAuditLogs.push(data);
          return { id: `audit_${Date.now()}`, ...data };
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

describe("MFA (Multi-Factor Authentication) Module", () => {
  beforeEach(() => {
    mockUsers.length = 0;
    mockOtpTokens.length = 0;
    mockSessions.length = 0;
    mockAuditLogs.length = 0;
    mockResetTokens.length = 0;
    vi.clearAllMocks();
  });

  describe("MfaService — TOTP and Email OTP Core Logic", () => {
    it("generates valid TOTP setup data with QR Data URI and spaced manual key", async () => {
      const setup = await mfaService.generateTotpSetup("admin@daih.ng");

      expect(setup.secret).toBeDefined();
      expect(setup.secret.length).toBeGreaterThanOrEqual(16);
      expect(setup.qrCodeDataUri).toBeDefined();
      expect(setup.qrCodeDataUri).toContain("qr");
      expect(setup.manualEntryKey).toContain(" ");
      expect(setup.otpauthUri).toContain("otpauth://totp/");
    });

    it("verifies valid TOTP codes and rejects invalid codes", async () => {
      const setup = await mfaService.generateTotpSetup("admin@daih.ng");
      const secret = setup.secret;
      const validCode = generateTotpCode(secret);

      expect(mfaService.verifyTotpCode(secret, validCode)).toBe(true);
      expect(mfaService.verifyTotpCode(secret, "000000")).toBe(false);
      expect(mfaService.verifyTotpCode(secret, "abcdef")).toBe(false);
    });

    it("encrypts TOTP secret at rest and verifies correctly from encrypted storage", async () => {
      const testUser = {
        id: "usr_totp_1",
        email: "officer@daih.ng",
        role: UserRole.RECEPTION_OFFICER,
        mfaEnabled: false,
      };
      mockUsers.push(testUser);

      const setup = await mfaService.generateTotpSetup("officer@daih.ng");
      const rawSecret = setup.secret;
      await mfaService.enableTotpMfa(testUser.id, rawSecret);

      const updated = mockUsers.find((u) => u.id === testUser.id);
      expect(updated.mfaEnabled).toBe(true);
      expect(updated.mfaMethod).toBe("TOTP");
      expect(updated.mfaSecret).not.toBe(rawSecret); // Must be encrypted
      expect(updated.mfaSecret).toContain(":"); // IV:Tag:Ciphertext format

      const currentCode = generateTotpCode(rawSecret);
      expect(
        mfaService.verifyTotpCodeFromStorage(updated.mfaSecret, currentCode),
      ).toBe(true);
      expect(
        mfaService.verifyTotpCodeFromStorage(updated.mfaSecret, "999999"),
      ).toBe(false);
    });

    it("generates 6-digit Email OTP and prevents replay attacks", async () => {
      const userId = "usr_email_otp_1";
      const rawCode = await mfaService.generateEmailOtp(userId);

      expect(rawCode).toMatch(/^\d{6}$/);
      expect(mockOtpTokens.length).toBe(1);

      // First verification succeeds
      const firstTry = await mfaService.verifyEmailOtp(userId, rawCode);
      expect(firstTry).toBe(true);

      // Replay attempt fails because token was marked as used
      const secondTry = await mfaService.verifyEmailOtp(userId, rawCode);
      expect(secondTry).toBe(false);
    });
  });

  describe("IdentityService — MFA Login & Setup State Machine", () => {
    it("allows CUSTOMER role to log in directly without MFA", async () => {
      const passwordHash = await passwordService.hashPassword("Password123!");
      const customer = {
        id: "usr_cust_1",
        email: "customer@example.com",
        firstName: "Tunde",
        lastName: "Customer",
        role: UserRole.CUSTOMER,
        isVerified: true,
        passwordHash,
        clientId: "DAIH-0001",
      };
      mockUsers.push(customer);

      const result: any = await identityService.login({
        email: "customer@example.com",
        password: "Password123!",
        portal: "customer",
      });

      expect(result.accessToken).toBeDefined();
      expect(result.user.email).toBe("customer@example.com");
      expect(result.requiresMfa).toBeUndefined();
      expect(result.requiresMfaSetup).toBeUndefined();
    });

    it("requires MFA setup for staff users logging in for the first time", async () => {
      const passwordHash =
        await passwordService.hashPassword("SuperSecret123!");
      const admin = {
        id: "usr_admin_1",
        email: "admin@daih.ng",
        firstName: "Super",
        lastName: "Admin",
        role: UserRole.SUPER_ADMIN,
        isVerified: true,
        mfaEnabled: false,
        passwordHash,
        clientId: "DAIH-0002",
      };
      mockUsers.push(admin);

      const result: any = await identityService.login({
        email: "admin@daih.ng",
        password: "SuperSecret123!",
        portal: "admin",
      });

      expect(result.requiresMfaSetup).toBe(true);
      expect(result.setupToken).toBeDefined();
      expect(result.user.email).toBe("admin@daih.ng");

      // Verify setupToken claim
      const decoded: any = jwt.verify(result.setupToken, config.jwt.secret);
      expect(decoded.id).toBe(admin.id);
      expect(decoded.purpose).toBe("mfa_setup");
    });

    it("issues MFA challenge for staff users with Email OTP configured", async () => {
      const passwordHash =
        await passwordService.hashPassword("FinancePass123!");
      const financeUser = {
        id: "usr_finance_1",
        email: "finance@daih.ng",
        firstName: "Finance",
        lastName: "Officer",
        role: UserRole.FINANCE_OFFICER,
        isVerified: true,
        mfaEnabled: true,
        mfaMethod: "EMAIL_OTP",
        passwordHash,
        clientId: "DAIH-0003",
      };
      mockUsers.push(financeUser);

      const result: any = await identityService.login({
        email: "finance@daih.ng",
        password: "FinancePass123!",
        portal: "admin",
      });

      expect(result.requiresMfa).toBe(true);
      expect(result.method).toBe("EMAIL_OTP");
      expect(result.mfaChallengeToken).toBeDefined();
      expect(result.emailHint).toBe("fi***@daih.ng");

      // An OTP token should have been generated
      expect(mockOtpTokens.length).toBe(1);
    });

    it("completes MFA challenge verification and issues session tokens", async () => {
      const financeUser = {
        id: "usr_finance_2",
        email: "audit@daih.ng",
        firstName: "Audit",
        lastName: "Officer",
        role: UserRole.FINANCE_OFFICER,
        isVerified: true,
        mfaEnabled: true,
        mfaMethod: "EMAIL_OTP",
        clientId: "DAIH-0004",
      };
      mockUsers.push(financeUser);

      const rawCode = await mfaService.generateEmailOtp(financeUser.id);
      const challengeToken = jwt.sign(
        { id: financeUser.id, purpose: "mfa_challenge" },
        config.jwt.secret,
        { expiresIn: "5m" },
      );

      const sessionResult = await identityService.verifyMfaChallenge(
        challengeToken,
        rawCode,
      );

      expect(sessionResult.accessToken).toBeDefined();
      expect(sessionResult.user.email).toBe("audit@daih.ng");
    });

    it("rejects MFA challenge verification with invalid code", async () => {
      const testStaff = {
        id: "usr_sec_1",
        email: "security@daih.ng",
        firstName: "Security",
        lastName: "Guard",
        role: UserRole.SECURITY_OFFICER,
        isVerified: true,
        mfaEnabled: true,
        mfaMethod: "EMAIL_OTP",
        clientId: "DAIH-0005",
      };
      mockUsers.push(testStaff);

      await mfaService.generateEmailOtp(testStaff.id);
      const challengeToken = jwt.sign(
        { id: testStaff.id, purpose: "mfa_challenge" },
        config.jwt.secret,
        { expiresIn: "5m" },
      );

      await expect(
        identityService.verifyMfaChallenge(challengeToken, "000000"),
      ).rejects.toThrow("Invalid or expired verification code");
    });

    it("setupMfa generates and dispatches Email OTP when method is EMAIL_OTP", async () => {
      const newStaff = {
        id: "usr_new_staff_1",
        email: "onboarding@daih.ng",
        firstName: "New",
        lastName: "Staff",
        role: UserRole.OPERATIONS_ADMIN,
        isVerified: true,
        mfaEnabled: false,
        clientId: "DAIH-0006",
      };
      mockUsers.push(newStaff);

      const setupToken = jwt.sign(
        { id: newStaff.id, purpose: "mfa_setup" },
        config.jwt.secret,
        { expiresIn: "15m" },
      );

      const result = await identityService.setupMfa(setupToken, "EMAIL_OTP");
      expect(result.method).toBe("EMAIL_OTP");

      // Verify OTP token record created in DB
      expect(mockOtpTokens.length).toBe(1);
      expect(mockOtpTokens[0].userId).toBe(newStaff.id);
    });

    it("setupAccount returns setupToken for privileged staff roles requiring MFA", async () => {
      const staffUser = {
        id: "usr_invite_staff_1",
        email: "invited.admin@daih.ng",
        firstName: "Invited",
        lastName: "Admin",
        role: UserRole.SUPER_ADMIN,
        isVerified: true,
        mfaEnabled: false,
        clientId: "DAIH-0007",
      };
      mockUsers.push(staffUser);

      const rawToken = "raw-setup-token-12345";
      const tokenHash = passwordService.hashToken(rawToken);
      mockResetTokens.push({
        id: "reset_token_1",
        userId: staffUser.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        usedAt: null,
      });

      const res = await identityService.setupAccount(
        rawToken,
        "PermanentPass123!@#",
      );
      expect(res.success).toBe(true);
      expect(res.requiresMfaSetup).toBe(true);
      expect(res.setupToken).toBeDefined();
      expect(res.user?.email).toBe("invited.admin@daih.ng");

      // Verify setupToken validity
      const decoded: any = jwt.verify(res.setupToken!, config.jwt.secret);
      expect(decoded.id).toBe(staffUser.id);
      expect(decoded.purpose).toBe("mfa_setup");
    });
  });
});
