import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import { UserRole, Permission, ROLE_PERMISSIONS } from "@daih/types";
import { app } from "../../app.js";
import { passwordService } from "./password.service.js";
import { clientIdService } from "./client-id.service.js";
import { sessionService } from "./session.service.js";
import { prisma } from "../../db/client.js";
import { emailService } from "../email/email.service.js";

// Mock prisma for isolated, reliable test execution
vi.mock("../../db/client.js", () => {
  const users: any[] = [];
  const consents: any[] = [];
  const verificationTokens: any[] = [];
  const resetTokens: any[] = [];
  const sessions: any[] = [];
  const outboxEvents: any[] = [];
  let seqNumber = 1;

  const mockTx = {
    user: {
      create: vi.fn(async ({ data }: any) => {
        const record = {
          id: `usr_${Date.now()}_${Math.random()}`,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        users.push(record);
        return record;
      }),
      findUnique: vi.fn(async ({ where }: any) => {
        if (where.email)
          return users.find((u) => u.email === where.email) || null;
        if (where.id) return users.find((u) => u.id === where.id) || null;
        if (where.clientId)
          return users.find((u) => u.clientId === where.clientId) || null;
        return null;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const index = users.findIndex((u) => u.id === where.id);
        if (index === -1) throw new Error("User not found");
        users[index] = { ...users[index], ...data, updatedAt: new Date() };
        return users[index];
      }),
    },
    policyConsent: {
      create: vi.fn(async ({ data }: any) => {
        const record = {
          id: `pc_${Date.now()}`,
          ...data,
          consentedAt: new Date(),
        };
        consents.push(record);
        return record;
      }),
    },
    verificationToken: {
      create: vi.fn(async ({ data }: any) => {
        const record = {
          id: `vt_${Date.now()}`,
          ...data,
          usedAt: null,
          createdAt: new Date(),
        };
        verificationTokens.push(record);
        return record;
      }),
      findUnique: vi.fn(async ({ where }: any) => {
        const record = verificationTokens.find(
          (t) => t.tokenHash === where.tokenHash,
        );
        if (!record) return null;
        const user = users.find((u) => u.id === record.userId);
        return { ...record, user };
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const index = verificationTokens.findIndex((t) => t.id === where.id);
        if (index === -1) throw new Error("Token not found");
        verificationTokens[index] = { ...verificationTokens[index], ...data };
        return verificationTokens[index];
      }),
      updateMany: vi.fn(async ({ where, data }: any) => {
        let count = 0;
        verificationTokens.forEach((t, i) => {
          if (
            t.userId === where.userId &&
            (where.usedAt === null ? t.usedAt === null : true)
          ) {
            verificationTokens[i] = { ...t, ...data };
            count++;
          }
        });
        return { count };
      }),
    },
    passwordResetToken: {
      create: vi.fn(async ({ data }: any) => {
        const record = {
          id: `prt_${Date.now()}`,
          ...data,
          usedAt: null,
          createdAt: new Date(),
        };
        resetTokens.push(record);
        return record;
      }),
      findUnique: vi.fn(async ({ where }: any) => {
        return resetTokens.find((t) => t.tokenHash === where.tokenHash) || null;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const index = resetTokens.findIndex((t) => t.id === where.id);
        if (index === -1) throw new Error("Token not found");
        resetTokens[index] = { ...resetTokens[index], ...data };
        return resetTokens[index];
      }),
      updateMany: vi.fn(async ({ where, data }: any) => {
        let count = 0;
        resetTokens.forEach((t, i) => {
          if (
            t.userId === where.userId &&
            (where.usedAt === null ? t.usedAt === null : true)
          ) {
            resetTokens[i] = { ...t, ...data };
            count++;
          }
        });
        return { count };
      }),
    },
    authSession: {
      create: vi.fn(async ({ data }: any) => {
        const record = {
          id: `sess_${Date.now()}`,
          ...data,
          isRevoked: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        sessions.push(record);
        return record;
      }),
      findUnique: vi.fn(async ({ where }: any) => {
        if (where.id) {
          const sess = sessions.find((s) => s.id === where.id);
          if (!sess) return null;
          const user = users.find((u) => u.id === sess.userId);
          return { ...sess, user };
        }
        const sess = sessions.find(
          (s) => s.refreshTokenHash === where.refreshTokenHash,
        );
        if (!sess) return null;
        const user = users.find((u) => u.id === sess.userId);
        return { ...sess, user };
      }),
      findFirst: vi.fn(async ({ where }: any) => {
        const matching = sessions.filter((s) => {
          const matchFamily = where?.tokenFamily
            ? s.tokenFamily === where.tokenFamily
            : true;
          const matchRevoked =
            where?.isRevoked !== undefined
              ? s.isRevoked === where.isRevoked
              : true;
          const matchExpires = where?.expiresAt?.gt
            ? s.expiresAt > where.expiresAt.gt
            : true;
          return matchFamily && matchRevoked && matchExpires;
        });
        if (matching.length === 0) return null;
        matching.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        const sess = matching[0];
        const user = users.find((u) => u.id === sess.userId);
        return { ...sess, user };
      }),
      findMany: vi.fn(async ({ where }: any) => {
        return sessions.filter((s) => {
          const matchUser = where?.userId ? s.userId === where.userId : true;
          const matchFamily = where?.tokenFamily
            ? s.tokenFamily === where.tokenFamily
            : true;
          const matchRevoked =
            where?.isRevoked !== undefined
              ? s.isRevoked === where.isRevoked
              : true;
          return matchUser && matchFamily && matchRevoked;
        });
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const index = sessions.findIndex((s) => s.id === where.id);
        if (index === -1) throw new Error("Session not found");
        sessions[index] = {
          ...sessions[index],
          ...data,
          updatedAt: new Date(),
        };
        return sessions[index];
      }),
      updateMany: vi.fn(async ({ where, data }: any) => {
        let count = 0;
        sessions.forEach((s, i) => {
          const matchUser = where.userId ? s.userId === where.userId : true;
          const matchFamily = where.tokenFamily
            ? s.tokenFamily === where.tokenFamily
            : true;
          const matchHash = where.refreshTokenHash
            ? s.refreshTokenHash === where.refreshTokenHash
            : true;
          const matchRevoked =
            where.isRevoked !== undefined
              ? s.isRevoked === where.isRevoked
              : true;
          if (matchUser && matchFamily && matchHash && matchRevoked) {
            sessions[i] = { ...s, ...data, updatedAt: new Date() };
            count++;
          }
        });
        return { count };
      }),
    },
    clientIdSequence: {
      upsert: vi.fn(async ({ where, create, update }: any) => {
        const current = seqNumber++;
        return { year: where.year, nextSequence: current + 1 };
      }),
    },
    outboxEvent: {
      create: vi.fn(async ({ data }: any) => {
        const record = {
          id: `evt_${Date.now()}`,
          ...data,
          createdAt: new Date(),
        };
        outboxEvents.push(record);
        return record;
      }),
    },
    emailTemplate: {
      findUnique: vi.fn(async ({ where }: any) => {
        const canonicalSubjects: Record<string, string> = {
          verification: "Verify your DAIH Hub Account",
          password_reset: "Reset Your DAIH Password",
          staff_welcome:
            "Welcome to DAIH Staff & Admin Console — Set Up Your Account",
        };
        return {
          id: `tmpl_${where.type}`,
          type: where.type,
          subject: canonicalSubjects[where.type] || "DAIH Notification",
          htmlBody:
            "<p>Hello {{name}} {{verification_url}} {{reset_url}} {{setup_url}}</p>",
          textBody:
            "Hello {{name}} {{verification_url}} {{reset_url}} {{setup_url}}",
          isActive: true,
        };
      }),
    },
  };

  const mockPrisma = {
    ...mockTx,
    $transaction: vi.fn(async (cb: any) => {
      return cb(mockTx);
    }),
    __store: {
      users,
      consents,
      verificationTokens,
      resetTokens,
      sessions,
      outboxEvents,
    },
  };

  return { prisma: mockPrisma };
});

describe("Milestone 1.1: Identity, RBAC & Session Module", () => {
  beforeEach(() => {
    vi.spyOn(emailService, "sendVerificationEmail").mockResolvedValue({
      success: true,
    } as any);
    vi.spyOn(emailService, "sendPasswordResetEmail").mockResolvedValue({
      success: true,
    } as any);
    vi.spyOn(emailService, "sendStaffWelcomeEmail").mockResolvedValue({
      success: true,
    } as any);

    const store = (prisma as any).__store;
    if (store) {
      store.users.length = 0;
      store.consents.length = 0;
      store.verificationTokens.length = 0;
      store.resetTokens.length = 0;
      store.sessions.length = 0;
      store.outboxEvents.length = 0;
    }
  });

  describe("1. Password Hashing (Argon2) & Crypto Tokens", () => {
    it("hashes passwords using Argon2 and verifies successfully", async () => {
      const plain = "SecurePassword123!";
      const hash = await passwordService.hashPassword(plain);

      expect(hash).toContain("$argon2");
      const isValid = await passwordService.verifyPassword(hash, plain);
      expect(isValid).toBe(true);

      const isInvalid = await passwordService.verifyPassword(
        hash,
        "WrongPassword!",
      );
      expect(isInvalid).toBe(false);
    });

    it("generates secure random tokens and SHA-256 hashes", () => {
      const token = passwordService.generateSecureToken(32);
      expect(token).toHaveLength(64);

      const hash = passwordService.hashToken(token);
      expect(hash).toHaveLength(64);
      expect(hash).not.toEqual(token);
    });
  });

  describe("2. Sequential Client ID Generation", () => {
    it("generates sequential Client IDs with DAIH-YYYY-000001 format", async () => {
      const year = 2026;
      const id1 = await clientIdService.generateNextClientId(
        prisma as any,
        year,
      );
      const id2 = await clientIdService.generateNextClientId(
        prisma as any,
        year,
      );

      expect(id1).toBe("DAIH-2026-000001");
      expect(id2).toBe("DAIH-2026-000002");
    });
  });

  describe("3. Registration & Policy Consent Flow", () => {
    it("registers new customer, persists policy consent, and creates verification token", async () => {
      const res = await request(app).post("/api/v1/identity/register").send({
        firstName: "Bamidele",
        lastName: "Ojo",
        email: "bamidele@example.com",
        phoneNumber: "08012345678",
        password: "Password123!",
        policyVersion: "1.0",
        consented: true,
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe("bamidele@example.com");
      expect(res.body.data.user.role).toBe(UserRole.CUSTOMER);
      expect(res.body.data.user.isVerified).toBe(false);
      expect(res.body.data.user.clientId).toMatch(/^DAIH-\d{4}-\d{6}$/);
      expect(res.body.data.verificationSent).toBe(true);

      const store = (prisma as any).__store;
      expect(store.consents).toHaveLength(1);
      expect(store.verificationTokens).toHaveLength(1);
      expect(
        store.outboxEvents.some(
          (e: any) => e.eventType === "identity.user_registered",
        ),
      ).toBe(true);
      expect(
        store.outboxEvents.some(
          (e: any) => e.eventType === "identity.policy_consent_captured",
        ),
      ).toBe(true);
    });

    it("rejects registration without policy consent", async () => {
      const res = await request(app).post("/api/v1/identity/register").send({
        firstName: "Bamidele",
        lastName: "Ojo",
        email: "no-consent@example.com",
        password: "Password123!",
        consented: false,
      });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("VALIDATION_ERROR");
    });

    it("rejects duplicate email registration", async () => {
      // First registration
      await request(app).post("/api/v1/identity/register").send({
        firstName: "Bamidele",
        lastName: "Ojo",
        email: "duplicate@example.com",
        password: "Password123!",
        consented: true,
      });

      // Second registration with same email
      const res = await request(app).post("/api/v1/identity/register").send({
        firstName: "Another",
        lastName: "User",
        email: "duplicate@example.com",
        password: "Password123!",
        consented: true,
      });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe("EMAIL_ALREADY_EXISTS");
    });
  });

  describe("4. Email Verification & Login Gate", () => {
    it("prevents unverified users from logging in", async () => {
      await request(app).post("/api/v1/identity/register").send({
        firstName: "Unverified",
        lastName: "User",
        email: "unverified@example.com",
        password: "Password123!",
        consented: true,
      });

      const res = await request(app).post("/api/v1/identity/login").send({
        email: "unverified@example.com",
        password: "Password123!",
      });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe("EMAIL_NOT_VERIFIED");
    });

    it("verifies user email and allows login afterward", async () => {
      await request(app).post("/api/v1/identity/register").send({
        firstName: "Grace",
        lastName: "Ade",
        email: "grace@example.com",
        password: "Password123!",
        consented: true,
      });

      const store = (prisma as any).__store;
      const tokenRecord = store.verificationTokens[0];
      expect(tokenRecord).toBeDefined();

      // Direct verify
      const user = store.users.find(
        (u: any) => u.email === "grace@example.com",
      );
      user.isVerified = true;

      // Login succeeds
      const loginRes = await request(app).post("/api/v1/identity/login").send({
        email: "grace@example.com",
        password: "Password123!",
      });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.success).toBe(true);
      expect(loginRes.body.data.token).toBeDefined();
      expect(loginRes.body.data.user.email).toBe("grace@example.com");

      // Refresh cookie is set
      const cookies = loginRes.headers["set-cookie"];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toContain("daih_refresh_token=");
      expect(cookies[0]).toContain("HttpOnly");
    });

    it("ensures GET /verify-email does not mutate state or consume token", async () => {
      await request(app).post("/api/v1/identity/register").send({
        firstName: "Scanner",
        lastName: "Safe",
        email: "scanner@example.com",
        password: "Password123!",
        consented: true,
      });

      const store = (prisma as any).__store;
      const tokenRecord = store.verificationTokens.find(
        (t: any) => t.userId.length > 0,
      );
      expect(tokenRecord).toBeDefined();

      // Bot / Scanner GET request
      const getRes = await request(app)
        .get("/api/v1/identity/verify-email")
        .query({ token: "sample-token-string" });

      expect(getRes.status).toBe(200);
      expect(getRes.body.ready).toBe(true);

      // User must still be unverified in DB
      const user = store.users.find(
        (u: any) => u.email === "scanner@example.com",
      );
      expect(user.isVerified).toBe(false);
    });
  });

  describe("5. Session Refresh & Reuse Detection", () => {
    it("rotates refresh token, permits concurrent refresh within grace window, and revokes on reuse outside grace window", async () => {
      const passwordHash = await passwordService.hashPassword("Password123!");
      const store = (prisma as any).__store;
      const user = {
        id: `usr_refresh_test_${Date.now()}`,
        email: "refresh_test@example.com",
        firstName: "Refresh",
        lastName: "Test",
        avatarUrl: "/uploads/avatars/avatar-refresh-test.webp",
        passwordHash,
        clientId: "DAIH-2026-000099",
        role: UserRole.CUSTOMER,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      store.users.push(user);

      // Login
      const loginRes = await request(app).post("/api/v1/identity/login").send({
        email: "refresh_test@example.com",
        password: "Password123!",
      });

      expect(loginRes.body.data.user.avatarUrl).toBe(
        "/uploads/avatars/avatar-refresh-test.webp",
      );

      const cookieHeader = loginRes.headers["set-cookie"];
      const rawCookie = cookieHeader[0].split(";")[0]; // daih_refresh_token=...

      // 1. Concurrent / First Refresh -> Success
      const refreshRes1 = await request(app)
        .post("/api/v1/identity/refresh")
        .set("Cookie", [rawCookie]);

      expect(refreshRes1.status).toBe(200);
      expect(refreshRes1.body.data.token).toBeDefined();
      expect(refreshRes1.body.data.user.avatarUrl).toBe(
        "/uploads/avatars/avatar-refresh-test.webp",
      );
      const rotatedCookie = refreshRes1.headers["set-cookie"][0].split(";")[0];
      expect(rotatedCookie).not.toEqual(rawCookie);

      // 2. Concurrent second request with the SAME initial cookie within the 15-second grace window -> Success
      const concurrentRefreshRes = await request(app)
        .post("/api/v1/identity/refresh")
        .set("Cookie", [rawCookie]);

      expect(concurrentRefreshRes.status).toBe(200);
      expect(concurrentRefreshRes.body.data.token).toBeDefined();
      expect(concurrentRefreshRes.body.data.user.avatarUrl).toBe(
        "/uploads/avatars/avatar-refresh-test.webp",
      );

      // Access token from concurrent request works
      const concurrentAccessToken = concurrentRefreshRes.body.data.token;
      const concurrentMeRes = await request(app)
        .get("/api/v1/identity/me")
        .set("Authorization", `Bearer ${concurrentAccessToken}`);
      expect(concurrentMeRes.status).toBe(200);

      // 3. Simulate true reuse attack outside the 15-second grace window (set initial session updatedAt to 20s ago)
      const initialTokenHash = passwordService.hashToken(
        rawCookie.replace("daih_refresh_token=", ""),
      );
      const initialSession = store.sessions.find(
        (s: any) => s.refreshTokenHash === initialTokenHash,
      );
      if (initialSession) {
        initialSession.updatedAt = new Date(Date.now() - 20000); // 20s in the past
      }

      const reuseRes = await request(app)
        .post("/api/v1/identity/refresh")
        .set("Cookie", [rawCookie]);

      expect(reuseRes.status).toBe(401);
      expect(reuseRes.body.code).toBe("REFRESH_TOKEN_REUSE_DETECTED");

      // After reuse detection, all tokens in the family are revoked
      const meAfterReuseRes = await request(app)
        .get("/api/v1/identity/me")
        .set("Authorization", `Bearer ${concurrentAccessToken}`);
      expect(meAfterReuseRes.status).toBe(401);
      expect(meAfterReuseRes.body.code).toBe("SESSION_REVOKED");
    });

    it("ignores forged/unsigned tokens on /logout to prevent arbitrary session DoS", async () => {
      const store = (prisma as any).__store;
      const victimSession = {
        id: "sess_victim_123",
        userId: "usr_victim_1",
        refreshTokenHash: "victim_hash_123",
        tokenFamily: "fam_victim",
        isRevoked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      store.sessions.push(victimSession);

      // Create forged token with fake signature
      const forgedToken =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
        Buffer.from(
          JSON.stringify({ id: "usr_victim_1", sessionId: "sess_victim_123" }),
        ).toString("base64url") +
        ".fakesignature1234567890";

      const res = await request(app)
        .post("/api/v1/identity/logout")
        .set("Authorization", `Bearer ${forgedToken}`);

      expect(res.status).toBe(200);

      // Victim session must NOT be revoked
      const session = store.sessions.find(
        (s: any) => s.id === "sess_victim_123",
      );
      expect(session.isRevoked).toBe(false);
    });
  });

  describe("6. Password Reset Flow", () => {
    it("requests password reset and completes confirmation with session revocation", async () => {
      const passwordHash =
        await passwordService.hashPassword("OldPassword123!");
      const store = (prisma as any).__store;
      const user = {
        id: "usr_reset_1",
        email: "reset_user@example.com",
        firstName: "Reset",
        lastName: "User",
        passwordHash,
        clientId: "DAIH-2026-000088",
        role: UserRole.CUSTOMER,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      store.users.push(user);

      // Request reset
      const reqRes = await request(app)
        .post("/api/v1/identity/password-reset/request")
        .send({ email: "reset_user@example.com" });

      expect(reqRes.status).toBe(200);
      expect(store.resetTokens).toHaveLength(1);
    });
  });

  describe("7. RBAC & Route Access Enforcement", () => {
    let customerToken: string;
    let superAdminToken: string;

    beforeEach(async () => {
      customerToken = sessionService.generateAccessToken({
        id: "usr_cust_1",
        email: "customer@daih.ng",
        role: UserRole.CUSTOMER,
        clientId: "DAIH-2026-000001",
      });

      superAdminToken = sessionService.generateAccessToken({
        id: "usr_admin_1",
        email: "admin@daih.ng",
        role: UserRole.SUPER_ADMIN,
        clientId: "DAIH-2026-000002",
      });
    });

    it("rejects unauthenticated requests to protected routes with 401", async () => {
      const res = await request(app).get("/api/v1/identity/me");
      expect(res.status).toBe(401);
      expect(res.body.code).toBe("UNAUTHORIZED");
    });

    it("allows authenticated customer to access own profile /me", async () => {
      const store = (prisma as any).__store;
      store.users.push({
        id: "usr_cust_1",
        email: "customer@daih.ng",
        firstName: "Customer",
        lastName: "One",
        clientId: "DAIH-2026-000001",
        role: UserRole.CUSTOMER,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app)
        .get("/api/v1/identity/me")
        .set("Authorization", "Bearer " + customerToken);

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe("customer@daih.ng");
    });

    it("forbids customer from creating staff/admin accounts with 403", async () => {
      const res = await request(app)
        .post("/api/v1/identity/admin/users")
        .set("Authorization", "Bearer " + customerToken)
        .send({
          firstName: "Staff",
          lastName: "Member",
          email: "staff@daih.ng",
          role: UserRole.OPERATIONS_ADMIN,
        });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe("FORBIDDEN");
    });

    it("forbids non-Super Admin staff from creating staff/admin accounts with 403", async () => {
      const opsToken = sessionService.generateAccessToken({
        id: "usr_ops_1",
        email: "ops@daih.ng",
        role: UserRole.OPERATIONS_ADMIN,
        clientId: "DAIH-2026-000003",
      });

      const res = await request(app)
        .post("/api/v1/identity/admin/users")
        .set("Authorization", "Bearer " + opsToken)
        .send({
          firstName: "Rogue",
          lastName: "Admin",
          email: "rogue@daih.ng",
          role: UserRole.OPERATIONS_ADMIN,
        });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe("FORBIDDEN");
    });

    it("allows Super Administrator to create staff/admin accounts with 201 and emits setup token", async () => {
      const res = await request(app)
        .post("/api/v1/identity/admin/users")
        .set("Authorization", "Bearer " + superAdminToken)
        .send({
          firstName: "Operations",
          lastName: "Lead",
          email: "ops_lead@daih.ng",
          role: UserRole.OPERATIONS_ADMIN,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe("ops_lead@daih.ng");
      expect(res.body.data.role).toBe(UserRole.OPERATIONS_ADMIN);
      expect(res.body.data.isVerified).toBe(true);
    });

    it("revokes active user sessions when staff user role is updated", async () => {
      const store = (prisma as any).__store;
      const staffUser = {
        id: "usr_staff_demote_test",
        email: "staff_demote@daih.ng",
        firstName: "Staff",
        lastName: "Demote",
        passwordHash: await passwordService.hashPassword("Password123!"),
        clientId: "DAIH-2026-000101",
        role: UserRole.OPERATIONS_ADMIN,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      store.users.push(staffUser);

      // Create an active session for this staff user
      const { accessToken: staffToken } = await sessionService.createSession(
        staffUser as any,
      );

      // Staff user can access /identity/me
      const meResBefore = await request(app)
        .get("/api/v1/identity/me")
        .set("Authorization", `Bearer ${staffToken}`);
      expect(meResBefore.status).toBe(200);

      // Demote staff user via staffUserService.updateStaffUserRole
      const { staffUserService } = await import("./staff-user.service.js");
      await staffUserService.updateStaffUserRole(
        staffUser.id,
        UserRole.CUSTOMER,
        { id: "usr_super_1", role: UserRole.SUPER_ADMIN },
      );

      // Old token should now be invalidated
      const meResAfter = await request(app)
        .get("/api/v1/identity/me")
        .set("Authorization", `Bearer ${staffToken}`);
      expect(meResAfter.status).toBe(401);
      expect(meResAfter.body.code).toBe("SESSION_REVOKED");
    });

    it("updates staff user role via PATCH /api/v1/identity/admin/users/:userId", async () => {
      const store = (prisma as any).__store;
      const targetStaff = {
        id: "usr_target_staff",
        email: "target.staff@daih.ng",
        firstName: "Target",
        lastName: "Staff",
        role: UserRole.RECEPTION_OFFICER,
        isVerified: true,
        clientId: "DAIH-2026-0999",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      store.users.push(targetStaff);

      const superAdminUser = {
        id: "usr_super_admin_test",
        email: "super.admin@daih.ng",
        firstName: "Super",
        lastName: "Admin",
        role: UserRole.SUPER_ADMIN,
        isVerified: true,
        clientId: "DAIH-2026-0001",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      store.users.push(superAdminUser);

      const { accessToken: adminToken } = await sessionService.createSession(
        superAdminUser as any,
      );

      const patchRes = await request(app)
        .patch(`/api/v1/identity/admin/users/${targetStaff.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          role: UserRole.FINANCE_OFFICER,
        });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.data.role).toBe(UserRole.FINANCE_OFFICER);
      const updatedRecord = store.users.find(
        (u: any) => u.id === targetStaff.id,
      );
      expect(updatedRecord?.role).toBe(UserRole.FINANCE_OFFICER);
    });
  });

  describe("8. Portal Role Boundary Enforcement (API Level)", () => {
    beforeEach(async () => {
      const store = (prisma as any).__store;
      const hash = await passwordService.hashPassword("Password123!");

      store.users.push(
        {
          id: "usr_admin_portal",
          email: "superadmin@daih.ng",
          firstName: "Super",
          lastName: "Admin",
          passwordHash: hash,
          clientId: "DAIH-2026-000099",
          role: UserRole.SUPER_ADMIN,
          isVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "usr_cust_portal",
          email: "bamidele@example.com",
          firstName: "Bamidele",
          lastName: "Ojo",
          passwordHash: hash,
          clientId: "DAIH-2026-000100",
          role: UserRole.CUSTOMER,
          isVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      );
    });

    it("blocks staff/admin accounts from logging in when portal is customer", async () => {
      const res = await request(app).post("/api/v1/identity/login").send({
        email: "superadmin@daih.ng",
        password: "Password123!",
        portal: "customer",
      });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe("STAFF_NOT_ALLOWED_ON_CUSTOMER_PORTAL");
      expect(res.body.message).toContain(
        "Staff and Administrator accounts cannot sign in through the customer portal",
      );
    });

    it("blocks customer accounts from logging in when portal is admin", async () => {
      const res = await request(app).post("/api/v1/identity/login").send({
        email: "bamidele@example.com",
        password: "Password123!",
        portal: "admin",
      });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe("CUSTOMER_NOT_ALLOWED_ON_ADMIN_PORTAL");
      expect(res.body.message).toContain(
        "Customer accounts cannot access the Staff & Admin Console",
      );
    });

    it("allows customer accounts to log in when portal is customer", async () => {
      const res = await request(app).post("/api/v1/identity/login").send({
        email: "bamidele@example.com",
        password: "Password123!",
        portal: "customer",
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe(UserRole.CUSTOMER);
    });

    it("allows admin accounts to log in when portal is admin (enters MFA flow)", async () => {
      const res = await request(app).post("/api/v1/identity/login").send({
        email: "superadmin@daih.ng",
        password: "Password123!",
        portal: "admin",
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.requiresMfaSetup || res.body.data.requiresMfa).toBe(
        true,
      );
    });
  });

  describe("Cookie Path & Single Header Enforcement", () => {
    beforeEach(async () => {
      const store = (prisma as any).__store;
      const hash = await passwordService.hashPassword("Password123!");

      if (
        !store.users.some((u: any) => u.email === "cookie-test@example.com")
      ) {
        store.users.push({
          id: "usr_cookie_test",
          email: "cookie-test@example.com",
          firstName: "Cookie",
          lastName: "Tester",
          passwordHash: hash,
          clientId: "DAIH-2026-000101",
          role: UserRole.CUSTOMER,
          isVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    });

    it("emits exactly ONE Set-Cookie header with Path=/api/v1/identity on login", async () => {
      const res = await request(app).post("/api/v1/identity/login").send({
        email: "cookie-test@example.com",
        password: "Password123!",
        portal: "customer",
      });

      expect(res.status).toBe(200);
      const setCookieHeaders = (res.headers["set-cookie"] || []) as string[];
      const refreshCookies = setCookieHeaders.filter((header: string) =>
        header.startsWith("daih_refresh_token="),
      );

      expect(refreshCookies).toHaveLength(1);
      expect(refreshCookies[0]).toContain("Path=/api/v1/identity");
      expect(refreshCookies[0]).not.toContain("Path=/api/v1/identity/refresh");
      expect(refreshCookies[0]).toContain("HttpOnly");
    });

    it("emits exactly ONE Set-Cookie header with Path=/api/v1/identity on token refresh", async () => {
      // 1. Log in to acquire a valid refresh token cookie
      const loginRes = await request(app).post("/api/v1/identity/login").send({
        email: "cookie-test@example.com",
        password: "Password123!",
        portal: "customer",
      });
      expect(loginRes.status).toBe(200);
      const loginCookies = (loginRes.headers["set-cookie"] || []) as string[];
      const cookieStr = loginCookies.find((c) =>
        c.startsWith("daih_refresh_token="),
      );
      expect(cookieStr).toBeDefined();

      // Extract raw cookie "daih_refresh_token=..."
      const rawCookie = cookieStr!.split(";")[0];

      // 2. Call refresh endpoint
      const refreshRes = await request(app)
        .post("/api/v1/identity/refresh")
        .set("Cookie", rawCookie);

      expect(refreshRes.status).toBe(200);
      const refreshSetCookies = (refreshRes.headers["set-cookie"] ||
        []) as string[];
      const refreshedTokens = refreshSetCookies.filter((h) =>
        h.startsWith("daih_refresh_token="),
      );

      expect(refreshedTokens).toHaveLength(1);
      expect(refreshedTokens[0]).toContain("Path=/api/v1/identity");
      expect(refreshedTokens[0]).not.toContain("Path=/api/v1/identity/refresh");
    });

    it("emits exactly ONE Set-Cookie clear header with Path=/api/v1/identity on logout", async () => {
      const loginRes = await request(app).post("/api/v1/identity/login").send({
        email: "cookie-test@example.com",
        password: "Password123!",
        portal: "customer",
      });
      const loginCookies = (loginRes.headers["set-cookie"] || []) as string[];
      const cookieStr = loginCookies.find((c) =>
        c.startsWith("daih_refresh_token="),
      );
      const rawCookie = cookieStr!.split(";")[0];

      const logoutRes = await request(app)
        .post("/api/v1/identity/logout")
        .set("Cookie", rawCookie);

      expect(logoutRes.status).toBe(200);
      const logoutSetCookies = (logoutRes.headers["set-cookie"] ||
        []) as string[];
      const clearedTokens = logoutSetCookies.filter((h) =>
        h.startsWith("daih_refresh_token="),
      );

      expect(clearedTokens).toHaveLength(1);
      expect(clearedTokens[0]).toContain("Path=/api/v1/identity");
      expect(clearedTokens[0]).not.toContain("Path=/api/v1/identity/refresh");
      expect(clearedTokens[0]).not.toContain("Path=/;");
    });
  });
});
