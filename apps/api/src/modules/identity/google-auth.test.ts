import { describe, it, expect, beforeEach, vi } from "vitest";
import crypto from "crypto";
import { UserRole } from "@daih/types";
import { identityService } from "./identity.service.js";
import { identityRepository } from "./identity.repository.js";
import { prisma } from "../../db/client.js";

const { mockVerifyIdToken, mockGetToken, store } = vi.hoisted(() => ({
  mockVerifyIdToken: vi.fn(),
  mockGetToken: vi.fn(),
  store: {
    users: [] as any[],
    identities: [] as any[],
    sessions: [] as any[],
    consents: [] as any[],
    outboxEvents: [] as any[],
  },
}));

vi.mock("google-auth-library", () => {
  return {
    OAuth2Client: vi.fn().mockImplementation(() => ({
      verifyIdToken: mockVerifyIdToken,
      getToken: mockGetToken,
    })),
  };
});

// Mock notification queue
vi.mock("../notifications/notifications.queue.js", () => ({
  enqueueNotification: vi.fn().mockResolvedValue(true),
}));

vi.mock("../../db/client.js", () => {
  const mockTx = {
    user: {
      create: vi.fn(async ({ data }: any) => {
        const record = {
          id: `usr_${Date.now()}_${Math.random()}`,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        store.users.push(record);
        return record;
      }),
      findUnique: vi.fn(async ({ where }: any) => {
        if (where.email)
          return store.users.find((u) => u.email === where.email) || null;
        if (where.id) return store.users.find((u) => u.id === where.id) || null;
        if (where.referralCode)
          return (
            store.users.find((u) => u.referralCode === where.referralCode) ||
            null
          );
        return null;
      }),
      findUniqueOrThrow: vi.fn(async ({ where }: any) => {
        const found = store.users.find((u) => u.id === where.id);
        if (!found) throw new Error("User not found");
        return found;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const idx = store.users.findIndex((u) => u.id === where.id);
        if (idx === -1) throw new Error("User not found");
        store.users[idx] = {
          ...store.users[idx],
          ...data,
          updatedAt: new Date(),
        };
        return store.users[idx];
      }),
    },
    authIdentity: {
      findUnique: vi.fn(async ({ where }: any) => {
        const key = where.provider_providerUserId;
        if (!key) return null;
        const identity = store.identities.find(
          (i) =>
            i.provider === key.provider &&
            i.providerUserId === key.providerUserId,
        );
        if (!identity) return null;
        const user = store.users.find((u) => u.id === identity.userId);
        return { ...identity, user };
      }),
      create: vi.fn(async ({ data }: any) => {
        const record = {
          id: `ident_${Date.now()}`,
          ...data,
          linkedAt: new Date(),
        };
        store.identities.push(record);
        return record;
      }),
      upsert: vi.fn(async ({ where, create, update }: any) => {
        const key = where.provider_providerUserId;
        const idx = store.identities.findIndex(
          (i) =>
            i.provider === key.provider &&
            i.providerUserId === key.providerUserId,
        );
        if (idx !== -1) {
          store.identities[idx] = { ...store.identities[idx], ...update };
          return store.identities[idx];
        }
        const record = {
          id: `ident_${Date.now()}`,
          ...create,
          linkedAt: new Date(),
        };
        store.identities.push(record);
        return record;
      }),
    },
    authSession: {
      updateMany: vi.fn(async ({ where, data }: any) => {
        let count = 0;
        store.sessions.forEach((s) => {
          if (
            s.userId === where.userId &&
            (where.isRevoked === undefined || s.isRevoked === where.isRevoked)
          ) {
            Object.assign(s, data);
            count++;
          }
        });
        return { count };
      }),
      create: vi.fn(async ({ data }: any) => {
        const session = { id: `sess_${Date.now()}`, ...data };
        store.sessions.push(session);
        return session;
      }),
    },
    policyConsent: {
      findFirst: vi.fn(async ({ where }: any) => {
        return (
          store.consents.find(
            (c) =>
              c.userId === where.userId &&
              (!where.policyVersion || c.policyVersion === where.policyVersion),
          ) || null
        );
      }),
      create: vi.fn(async ({ data }: any) => {
        const record = {
          id: `pc_${Date.now()}`,
          ...data,
          consentedAt: new Date(),
        };
        store.consents.push(record);
        return record;
      }),
    },
    outboxEvent: {
      create: vi.fn(async ({ data }: any) => {
        const record = { id: `ev_${Date.now()}`, ...data };
        store.outboxEvents.push(record);
        return record;
      }),
    },
    clientIdSequence: {
      upsert: vi.fn(async () => ({ year: 2026, nextSequence: 42 })),
    },
  };

  return {
    prisma: {
      ...mockTx,
      $transaction: vi.fn(async (cbOrArray: any) => {
        if (typeof cbOrArray === "function") {
          return cbOrArray(mockTx);
        }
        return Promise.all(cbOrArray);
      }),
    },
  };
});

describe("Google OAuth & PKCE Implementation (Release 1)", () => {
  beforeEach(() => {
    store.users.length = 0;
    store.identities.length = 0;
    store.sessions.length = 0;
    store.consents.length = 0;
    store.outboxEvents.length = 0;
    vi.clearAllMocks();
  });

  describe("1. PKCE URL Generation & State Packaging", () => {
    it("generates authorization URL with PKCE S256 challenge, scopes, and referral code preserved in state", () => {
      const result = identityService.generateGoogleOAuthUrl({
        referralCode: "REF-PRESERVE",
        destination: "/checkout/desk-42",
        portal: "customer",
      });

      expect(result.url).toContain(
        "https://accounts.google.com/o/oauth2/v2/auth",
      );
      expect(result.url).toContain("code_challenge=");
      expect(result.url).toContain("code_challenge_method=S256");
      expect(result.url).toContain("scope=openid+email+profile");

      // Verify cookie
      expect(result.stateCookie.name).toBe("daih_oauth_state");
      expect(result.stateCookie.maxAge).toBe(600000); // 10 minutes

      // Parse cookie content
      const [cookiePayloadB64] = result.stateCookie.value.split(".");
      const cookieData = JSON.parse(
        Buffer.from(cookiePayloadB64, "base64url").toString("utf-8"),
      );

      expect(cookieData.ref).toBe("REF-PRESERVE");
      expect(cookieData.destination).toBe("/checkout/desk-42");
      expect(cookieData.codeVerifier).toBeDefined();
      expect(cookieData.codeVerifier.length).toBeGreaterThan(40);
    });
  });

  describe("2. Anti-Pre-Hijacking Protection", () => {
    it("clears password hash and revokes active sessions when victim logs in via Google with unverified password account", async () => {
      // 1. Attacker registered victim's email with a password, but email was unverified
      const victimEmail = "victim@example.com";
      const victimUser = {
        id: "usr_victim_123",
        email: victimEmail,
        passwordHash: "argon2id_attacker_password_hash",
        firstName: "Victim",
        lastName: "User",
        role: UserRole.CUSTOMER,
        isVerified: false, // unverified!
        clientId: "DAIH-2026-0001",
        onboardingCompleted: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      store.users.push(victimUser);

      // Add attacker session
      store.sessions.push({
        id: "sess_attacker",
        userId: victimUser.id,
        isRevoked: false,
      });

      // 2. Victim logs in with Google (verified email)
      mockVerifyIdToken.mockResolvedValueOnce({
        getPayload: () => ({
          sub: "google_sub_victim_999",
          email: victimEmail,
          email_verified: true,
          given_name: "Victim",
          family_name: "User",
        }),
      });

      const authResult = await identityService.authenticateGoogle({
        idToken: "valid_victim_google_id_token",
      });

      // Verify attacker's password was erased
      const updatedVictim = store.users.find((u) => u.id === victimUser.id);
      expect(updatedVictim.passwordHash).toBeNull();
      expect(updatedVictim.isVerified).toBe(true);

      // Verify attacker session was revoked
      const attackerSession = store.sessions.find(
        (s) => s.id === "sess_attacker",
      );
      expect(attackerSession.isRevoked).toBe(true);

      // Verify AuthIdentity was created
      const identity = store.identities.find(
        (i) =>
          i.provider === "GOOGLE" &&
          i.providerUserId === "google_sub_victim_999",
      );
      expect(identity).toBeDefined();
      expect(identity.userId).toBe(victimUser.id);
    });
  });

  describe("3. Strict Email Verification Enforcement", () => {
    it("rejects Google authentication if email_verified is false", async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        getPayload: () => ({
          sub: "google_unverified_123",
          email: "unverified@gmail.com",
          email_verified: false,
        }),
      });

      await expect(
        identityService.authenticateGoogle({
          idToken: "token_unverified_email",
        }),
      ).rejects.toMatchObject({
        code: "GOOGLE_EMAIL_NOT_VERIFIED",
        statusCode: 401,
      });
    });
  });

  describe("4. NDPR Policy Consent Enforcement", () => {
    it("flags needsConsent: true for new Google user, and persists consent on submission", async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        getPayload: () => ({
          sub: "google_new_user_111",
          email: "newcustomer@gmail.com",
          email_verified: true,
          given_name: "New",
          family_name: "Customer",
        }),
      });

      const result = await identityService.authenticateGoogle({
        idToken: "token_new_user",
      });

      expect(result.isNewUser).toBe(true);
      expect(result.needsConsent).toBe(true);

      // Submit consent
      const consentResult = await identityService.capturePolicyConsent(
        result.user.id,
        {
          policyVersion: "1.0",
          consented: true,
        },
      );

      expect(consentResult.id).toBe(result.user.id);
      expect(store.consents).toHaveLength(1);
      expect(store.consents[0].userId).toBe(result.user.id);
      expect(store.consents[0].policyVersion).toBe("1.0");

      // Outbox event captured
      expect(
        store.outboxEvents.some(
          (e) => e.eventType === "identity.policy_consent_captured",
        ),
      ).toBe(true);
    });
  });

  describe("5. Referral Link Sign-up Flow", () => {
    it("accurately attributes referrer when signing up via Google with referral code", async () => {
      // 1. Existing referrer
      const referrer = {
        id: "usr_referrer_888",
        email: "referrer@example.com",
        firstName: "Alice",
        lastName: "Referrer",
        referralCode: "REF-ALICE8",
        role: UserRole.CUSTOMER,
        isVerified: true,
        clientId: "DAIH-2026-0088",
      };
      store.users.push(referrer);

      // 2. New referee signs up with Google and REF-ALICE8
      mockVerifyIdToken.mockResolvedValueOnce({
        getPayload: () => ({
          sub: "google_referee_777",
          email: "referee@gmail.com",
          email_verified: true,
          given_name: "Bob",
          family_name: "Referee",
        }),
      });

      const result = await identityService.authenticateGoogle({
        idToken: "token_referee",
        referralCode: "REF-ALICE8",
      });

      expect(result.isNewUser).toBe(true);
      const createdReferee = store.users.find(
        (u) => u.email === "referee@gmail.com",
      );
      expect(createdReferee).toBeDefined();
      expect(createdReferee.referredById).toBe(referrer.id);
    });
  });

  describe("6. Complete Google OAuth Callback Flow with PKCE", () => {
    it("exchanges code for tokens, verifies state cookie, and returns authenticated session with destination", async () => {
      // 1. Generate auth URL to get valid state and cookie
      const initResult = identityService.generateGoogleOAuthUrl({
        referralCode: "REF-TEST12",
        destination: "/bookings/confirm",
      });

      const [payloadB64] = initResult.stateCookie.value.split(".");
      const cookieData = JSON.parse(
        Buffer.from(payloadB64, "base64url").toString("utf-8"),
      );

      // 2. Mock Google token exchange
      mockGetToken.mockResolvedValueOnce({
        tokens: {
          id_token: "google_exchanged_id_token_123",
        },
      });

      mockVerifyIdToken.mockResolvedValueOnce({
        getPayload: () => ({
          sub: "google_oauth_sub_555",
          email: "oauthuser@gmail.com",
          email_verified: true,
          given_name: "OAuth",
          family_name: "User",
        }),
      });

      // 3. Callback execution
      const callbackResult = await identityService.handleGoogleOAuthCallback({
        code: "mock_authorization_code_xyz",
        state: cookieData.state,
        stateCookie: initResult.stateCookie.value,
      });

      expect(callbackResult.destination).toBe("/bookings/confirm");
      expect(callbackResult.accessToken).toBeDefined();
      expect(callbackResult.rawRefreshToken).toBeDefined();
      expect(callbackResult.user.email).toBe("oauthuser@gmail.com");
      expect(callbackResult.needsConsent).toBe(true);
    });

    it("rejects callback if state cookie has been tampered with", async () => {
      const initResult = identityService.generateGoogleOAuthUrl({
        destination: "/dashboard",
      });

      const tamperedCookie = initResult.stateCookie.value + "tampered";

      await expect(
        identityService.handleGoogleOAuthCallback({
          code: "some_code",
          state: "some_state",
          stateCookie: tamperedCookie,
        }),
      ).rejects.toMatchObject({
        code: "INVALID_OAUTH_COOKIE",
        statusCode: 400,
      });
    });
  });
});
