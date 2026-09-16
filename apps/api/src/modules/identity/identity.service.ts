import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import sharp from "sharp";
import {
  UserRole,
  BookingState,
  CustomerReferralsResponse,
  ReferralItem,
} from "@daih/types";
import { prisma } from "../../db/client.js";
import { config } from "../../config/env.js";
import { identityRepository } from "./identity.repository.js";
import { passwordService } from "./password.service.js";
import { clientIdService } from "./client-id.service.js";
import { sessionService } from "./session.service.js";
import { emailService } from "../email/email.service.js";
import { mfaService } from "./mfa.service.js";
import {
  RegisterDTO,
  LoginDTO,
  LoginResult,
  MfaChallengeResult,
  MfaSetupRequiredResult,
  LoginSuccessResult,
  UserSummaryDTO,
  SessionContext,
  SetupAccountResult,
} from "./identity.types.js";

/** Roles that must complete MFA before accessing the system */
const MFA_REQUIRED_ROLES = new Set<UserRole>([
  UserRole.RECEPTION_OFFICER,
  UserRole.SECURITY_OFFICER,
  UserRole.OPERATIONS_ADMIN,
  UserRole.FINANCE_OFFICER,
  UserRole.MANAGEMENT_VIEWER,
  UserRole.SUPER_ADMIN,
]);

/** Masks an email for display in MFA OTP hints, e.g. "peter@daih.ng" → "pe***@daih.ng" */
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  const visible = local.slice(0, 2);
  return `${visible}***@${domain}`;
}

/** Generates a random uppercase 6-character alphanumeric referral code, e.g. REF-8K9M2X */
export function generateReferralCode(): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code = "REF-";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export class IdentityService {
  /**
   * Registers a new customer account
   */
  async register(
    dto: RegisterDTO,
  ): Promise<{ user: UserSummaryDTO; verificationSent: boolean }> {
    const existing = await identityRepository.findByEmail(dto.email);
    if (existing) {
      const error: any = new Error("An account with this email already exists");
      error.code = "EMAIL_ALREADY_EXISTS";
      error.statusCode = 409;
      throw error;
    }

    const passwordHash = await passwordService.hashPassword(dto.password);
    const clientId = await clientIdService.generateNextClientId();

    const rawVerificationToken = passwordService.generateSecureToken(32);
    const verificationTokenHash =
      passwordService.hashToken(rawVerificationToken);

    // Resolve optional referrer
    let referredById: string | undefined = undefined;
    if (dto.referralCode && dto.referralCode.trim()) {
      const referrer = await identityRepository.findByReferralCode(
        dto.referralCode.trim(),
      );
      if (referrer) {
        referredById = referrer.id;
      }
    }

    // Generate unique referral code for the new user
    let referralCode = generateReferralCode();
    let collision = await identityRepository.findByReferralCode(referralCode);
    while (collision) {
      referralCode = generateReferralCode();
      collision = await identityRepository.findByReferralCode(referralCode);
    }

    const user = await identityRepository.createCustomer({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phoneNumber: dto.phoneNumber,
      passwordHash,
      clientId,
      policyVersion: dto.policyVersion || "1.0",
      rawVerificationToken,
      verificationTokenHash,
      referralCode,
      referredById,
    });

    // Send verification email directly as well for prompt UX
    try {
      await emailService.sendVerificationEmail(
        user.email,
        user.firstName,
        rawVerificationToken,
      );
    } catch (err: any) {
      console.warn(
        "Direct verification email send deferred to background outbox:",
        err?.message,
      );
    }

    const userSummary: UserSummaryDTO = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      avatarUrl: (user as any).avatarUrl || null,
      birthday: (user as any).birthday || null,
      clientId: user.clientId,
      role: user.role as UserRole,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      referralCode: user.referralCode || null,
    };

    return {
      user: userSummary,
      verificationSent: true,
    };
  }

  /**
   * Verifies customer email using verification token
   */
  async verifyEmail(rawToken: string): Promise<UserSummaryDTO> {
    const tokenHash = passwordService.hashToken(rawToken);

    try {
      const user = await identityRepository.verifyUserByTokenHash(tokenHash);
      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        avatarUrl: (user as any).avatarUrl || null,
        birthday: (user as any).birthday || null,
        clientId: user.clientId,
        role: user.role as UserRole,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
        referralCode: user.referralCode || null,
      };
    } catch (err: any) {
      const error: any = new Error(
        err.message === "TOKEN_ALREADY_USED"
          ? "This verification token has already been used"
          : err.message === "TOKEN_EXPIRED"
            ? "This verification token has expired"
            : "Invalid or expired verification token",
      );
      error.code = err.message || "INVALID_VERIFICATION_TOKEN";
      error.statusCode = 400;
      throw error;
    }
  }

  /**
   * Resends verification email for unverified user
   */
  async resendVerification(
    email: string,
  ): Promise<{ success: boolean; message: string }> {
    const user = await identityRepository.findByEmail(email);
    if (user && !user.isVerified) {
      const rawToken = passwordService.generateSecureToken(32);
      const tokenHash = passwordService.hashToken(rawToken);
      await identityRepository.createVerificationToken(
        user.id,
        tokenHash,
        rawToken,
        user.email,
        user.firstName,
      );

      try {
        await emailService.sendVerificationEmail(
          user.email,
          user.firstName,
          rawToken,
        );
      } catch (err: any) {
        console.warn(
          "Direct resend verification email deferred to background outbox:",
          err?.message,
        );
      }
    }

    return {
      success: true,
      message:
        "If an unverified account exists with that email, a verification link has been sent.",
    };
  }

  /**
   * Logs in a user.
   *
   * For CUSTOMER accounts: returns full session immediately.
   * For all staff/admin roles: enforces MFA.
   *   - If MFA not yet configured → returns { requiresMfaSetup, setupToken }
   *   - If MFA configured → returns { requiresMfa, mfaChallengeToken, method }
   *     (for EMAIL_OTP, also fires the OTP email)
   */
  async login(
    dto: LoginDTO,
    context: SessionContext = {},
  ): Promise<LoginResult> {
    const user = await identityRepository.findByEmail(dto.email);

    // Timing attack mitigation: always execute Argon2 password verification
    const hashToVerify = user?.passwordHash || passwordService.getDummyHash();
    const isValidPassword = await passwordService.verifyPassword(
      hashToVerify,
      dto.password,
    );

    if (!user || !user.passwordHash || !isValidPassword) {
      const error: any = new Error("Invalid email or password");
      error.code = "INVALID_CREDENTIALS";
      error.statusCode = 401;
      throw error;
    }

    if (!user.isVerified) {
      const error: any = new Error(
        "Please verify your email address before logging in",
      );
      error.code = "EMAIL_NOT_VERIFIED";
      error.statusCode = 403;
      throw error;
    }

    // Portal / Audience Role Boundary Enforcement
    const requestedPortal = (
      dto.portal ||
      dto.audience ||
      context.portal ||
      ""
    ).toLowerCase();

    if (requestedPortal === "customer" && user.role !== UserRole.CUSTOMER) {
      const error: any = new Error(
        "Access Denied: Staff and Administrator accounts cannot sign in through the customer portal.",
      );
      error.code = "STAFF_NOT_ALLOWED_ON_CUSTOMER_PORTAL";
      error.statusCode = 403;
      throw error;
    }

    if (requestedPortal === "admin" && user.role === UserRole.CUSTOMER) {
      const error: any = new Error(
        "Access Denied: Customer accounts cannot access the Staff & Admin Console.",
      );
      error.code = "CUSTOMER_NOT_ALLOWED_ON_ADMIN_PORTAL";
      error.statusCode = 403;
      throw error;
    }

    const userSummary: UserSummaryDTO = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      avatarUrl: (user as any).avatarUrl || null,
      birthday: (user as any).birthday || null,
      clientId: user.clientId,
      role: user.role as UserRole,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      referralCode: user.referralCode || null,
    };

    // ── MFA gate for all staff / admin roles ─────────────────────────────────
    if (MFA_REQUIRED_ROLES.has(user.role as UserRole)) {
      if (!user.mfaEnabled) {
        // First-time login after account setup — must configure MFA before proceeding
        const setupToken = jwt.sign(
          { id: user.id, purpose: "mfa_setup" },
          config.jwt.secret,
          { expiresIn: "15m" },
        );

        const result: MfaSetupRequiredResult = {
          requiresMfaSetup: true,
          setupToken,
          user: {
            id: userSummary.id,
            firstName: userSummary.firstName,
            email: userSummary.email,
            role: userSummary.role,
          },
        };
        return result;
      }

      // MFA already configured — issue challenge token, do NOT create session yet
      const mfaChallengeToken = jwt.sign(
        { id: user.id, purpose: "mfa_challenge" },
        config.jwt.secret,
        { expiresIn: "5m" },
      );

      if (user.mfaMethod === "EMAIL_OTP") {
        // Generate and email the OTP code
        const rawCode = await mfaService.generateEmailOtp(user.id);
        try {
          await emailService.sendMfaOtpEmail(
            user.email,
            user.firstName,
            rawCode,
          );
        } catch (err: any) {
          console.warn("[MFA] OTP email send failed:", err?.message);
        }

        const result: MfaChallengeResult = {
          requiresMfa: true,
          mfaChallengeToken,
          method: "EMAIL_OTP",
          emailHint: maskEmail(user.email),
        };
        return result;
      }

      // TOTP — no email needed, user opens their app
      const result: MfaChallengeResult = {
        requiresMfa: true,
        mfaChallengeToken,
        method: "TOTP",
      };
      return result;
    }
    // ─────────────────────────────────────────────────────────────────────────

    // CUSTOMER role — direct session, no MFA
    const { accessToken, rawRefreshToken } = await sessionService.createSession(
      userSummary,
      context,
    );

    const successResult: LoginSuccessResult = {
      accessToken,
      rawRefreshToken,
      user: userSummary,
    };
    return successResult;
  }

  /**
   * Verifies a 6-digit MFA code (OTP or TOTP) after login challenge.
   * On success: creates a full session and returns tokens.
   */
  async verifyMfaChallenge(
    mfaChallengeToken: string,
    code: string,
    context: SessionContext = {},
  ): Promise<LoginSuccessResult> {
    let payload: { id: string; purpose: string };
    try {
      payload = jwt.verify(mfaChallengeToken, config.jwt.secret) as any;
    } catch {
      const error: any = new Error("MFA challenge token is invalid or expired");
      error.code = "MFA_CHALLENGE_INVALID";
      error.statusCode = 401;
      throw error;
    }

    if (payload.purpose !== "mfa_challenge") {
      const error: any = new Error("Invalid token purpose");
      error.code = "MFA_CHALLENGE_INVALID";
      error.statusCode = 401;
      throw error;
    }

    const user = await identityRepository.findById(payload.id);
    if (!user || !user.mfaEnabled) {
      const error: any = new Error("MFA not configured for this account");
      error.code = "MFA_NOT_CONFIGURED";
      error.statusCode = 400;
      throw error;
    }

    let isValid = false;
    if (user.mfaMethod === "EMAIL_OTP") {
      isValid = await mfaService.verifyEmailOtp(user.id, code);
    } else if (user.mfaMethod === "TOTP" && user.mfaSecret) {
      isValid = mfaService.verifyTotpCodeFromStorage(user.mfaSecret, code);
    }

    if (!isValid) {
      const error: any = new Error("Invalid or expired verification code");
      error.code = "MFA_CODE_INVALID";
      error.statusCode = 401;
      throw error;
    }

    const userSummary: UserSummaryDTO = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      avatarUrl: (user as any).avatarUrl || null,
      birthday: (user as any).birthday || null,
      clientId: user.clientId,
      role: user.role as UserRole,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      referralCode: user.referralCode || null,
    };

    const { accessToken, rawRefreshToken } = await sessionService.createSession(
      userSummary,
      context,
    );

    return { accessToken, rawRefreshToken, user: userSummary };
  }

  /**
   * Initiates MFA setup for a staff user (after first login).
   * Requires a valid setupToken from the login response.
   *
   * - EMAIL_OTP: saves method immediately, returns nothing extra
   * - TOTP: generates and returns QR code URI + manual key (NOT saved yet)
   */
  async setupMfa(
    setupToken: string,
    method: "EMAIL_OTP" | "TOTP",
  ): Promise<{
    method: "EMAIL_OTP" | "TOTP";
    qrCodeDataUri?: string;
    manualEntryKey?: string;
    /** Ephemeral secret — must be passed back to confirmMfaSetup; never persisted here */
    ephemeralSecret?: string;
  }> {
    let payload: { id: string; purpose: string };
    try {
      payload = jwt.verify(setupToken, config.jwt.secret) as any;
    } catch {
      const error: any = new Error(
        "Setup token is invalid or expired. Please log in again.",
      );
      error.code = "MFA_SETUP_TOKEN_INVALID";
      error.statusCode = 401;
      throw error;
    }

    if (payload.purpose !== "mfa_setup") {
      const error: any = new Error("Invalid token purpose");
      error.code = "MFA_SETUP_TOKEN_INVALID";
      error.statusCode = 401;
      throw error;
    }

    const user = await identityRepository.findById(payload.id);
    if (!user) {
      const error: any = new Error("User not found");
      error.code = "USER_NOT_FOUND";
      error.statusCode = 404;
      throw error;
    }

    if (method === "EMAIL_OTP") {
      const rawCode = await mfaService.generateEmailOtp(user.id);
      try {
        await emailService.sendMfaOtpEmail(user.email, user.firstName, rawCode);
      } catch (err: any) {
        console.warn("[MFA] Setup OTP email send failed:", err?.message);
      }
      return { method: "EMAIL_OTP" };
    }

    // TOTP — generate secret + QR code but do NOT save yet
    const { secret, qrCodeDataUri, manualEntryKey } =
      await mfaService.generateTotpSetup(user.email);

    return {
      method: "TOTP",
      qrCodeDataUri,
      manualEntryKey,
      ephemeralSecret: secret, // returned to frontend; sent back in verify-setup
    };
  }

  /**
   * Confirms MFA setup by verifying the first valid code,
   * then persists the method and issues a full session.
   */
  async confirmMfaSetup(
    setupToken: string,
    method: "EMAIL_OTP" | "TOTP",
    code: string,
    ephemeralSecret: string | undefined, // required for TOTP, undefined for EMAIL_OTP
    context: SessionContext = {},
  ): Promise<LoginSuccessResult> {
    let payload: { id: string; purpose: string };
    try {
      payload = jwt.verify(setupToken, config.jwt.secret) as any;
    } catch {
      const error: any = new Error(
        "Setup token is invalid or expired. Please log in again.",
      );
      error.code = "MFA_SETUP_TOKEN_INVALID";
      error.statusCode = 401;
      throw error;
    }

    if (payload.purpose !== "mfa_setup") {
      const error: any = new Error("Invalid token purpose");
      error.code = "MFA_SETUP_TOKEN_INVALID";
      error.statusCode = 401;
      throw error;
    }

    const user = await identityRepository.findById(payload.id);
    if (!user) {
      const error: any = new Error("User not found");
      error.code = "USER_NOT_FOUND";
      error.statusCode = 404;
      throw error;
    }

    if (method === "TOTP") {
      if (!ephemeralSecret) {
        const error: any = new Error(
          "TOTP secret is required for TOTP setup confirmation",
        );
        error.code = "MFA_SETUP_MISSING_SECRET";
        error.statusCode = 400;
        throw error;
      }
      const isValid = mfaService.verifyTotpCode(ephemeralSecret, code);
      if (!isValid) {
        const error: any = new Error(
          "The code from your authenticator app is incorrect. Please try again.",
        );
        error.code = "MFA_CODE_INVALID";
        error.statusCode = 400;
        throw error;
      }
      await mfaService.enableTotpMfa(user.id, ephemeralSecret);
    } else {
      // EMAIL_OTP — generate and send a test OTP, user confirms it
      const isValid = await mfaService.verifyEmailOtp(user.id, code);
      if (!isValid) {
        const error: any = new Error(
          "The code sent to your email is incorrect or has expired.",
        );
        error.code = "MFA_CODE_INVALID";
        error.statusCode = 400;
        throw error;
      }
      await mfaService.enableEmailOtpMfa(user.id);
    }

    // MFA now active — create full session
    const userSummary: UserSummaryDTO = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      avatarUrl: (user as any).avatarUrl || null,
      birthday: (user as any).birthday || null,
      clientId: user.clientId,
      role: user.role as UserRole,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      referralCode: user.referralCode || null,
    };

    await prisma.auditLog
      .create({
        data: {
          userId: user.id,
          action: "MFA_ENABLED",
          entityType: "User",
          entityId: user.id,
          metadata: { method },
        },
      })
      .catch(() => {});

    const { accessToken, rawRefreshToken } = await sessionService.createSession(
      userSummary,
      context,
    );

    return { accessToken, rawRefreshToken, user: userSummary };
  }

  /**
   * Re-sends an Email OTP during the MFA challenge phase.
   * Rate-limited at the route level (max 1 resend per 60s).
   */
  async resendMfaOtp(mfaChallengeToken: string): Promise<void> {
    let payload: { id: string; purpose: string };
    try {
      payload = jwt.verify(mfaChallengeToken, config.jwt.secret) as any;
    } catch {
      const error: any = new Error("MFA challenge token is invalid or expired");
      error.code = "MFA_CHALLENGE_INVALID";
      error.statusCode = 401;
      throw error;
    }

    if (payload.purpose !== "mfa_challenge") {
      const error: any = new Error("Invalid token purpose");
      error.code = "MFA_CHALLENGE_INVALID";
      error.statusCode = 401;
      throw error;
    }

    const user = await identityRepository.findById(payload.id);
    if (!user || user.mfaMethod !== "EMAIL_OTP") {
      const error: any = new Error("This account does not use Email OTP");
      error.code = "MFA_METHOD_MISMATCH";
      error.statusCode = 400;
      throw error;
    }

    const rawCode = await mfaService.generateEmailOtp(user.id);
    await emailService.sendMfaOtpEmail(user.email, user.firstName, rawCode);
  }

  /**
   * Disables MFA for a staff user — Super Admin emergency action.
   */
  async disableUserMfa(
    targetUserId: string,
    adminUserId: string,
    ipAddress?: string,
  ): Promise<void> {
    const target = await identityRepository.findById(targetUserId);
    if (!target) {
      const error: any = new Error("User not found");
      error.code = "USER_NOT_FOUND";
      error.statusCode = 404;
      throw error;
    }

    await mfaService.disableMfa(targetUserId);

    await prisma.auditLog
      .create({
        data: {
          userId: adminUserId,
          action: "MFA_DISABLED_BY_ADMIN",
          entityType: "User",
          entityId: targetUserId,
          metadata: { targetEmail: target.email },
          ipAddress,
        },
      })
      .catch(() => {});
  }

  /**
   * Rotates refresh token session
   */
  async refresh(
    rawRefreshToken: string,
    context: SessionContext = {},
  ): Promise<{
    accessToken: string;
    rawRefreshToken: string;
    user: UserSummaryDTO;
  }> {
    try {
      return await sessionService.rotateRefreshToken(rawRefreshToken, context);
    } catch (err: any) {
      // Auth domain errors: explicitly map to 401 Unauthorized
      const authErrors = [
        "INVALID_REFRESH_TOKEN",
        "REFRESH_TOKEN_REUSE_DETECTED",
        "SESSION_EXPIRED",
      ];
      if (authErrors.includes(err.message)) {
        const error: any = new Error(
          err.message === "REFRESH_TOKEN_REUSE_DETECTED"
            ? "Suspicious session activity detected. Please log in again."
            : "Invalid or expired session token",
        );
        error.code = err.message;
        error.statusCode = 401;
        throw error;
      }

      // Infrastructure / Database errors (connection timeout, network drop, etc.):
      // Rethrow so they are treated as 500/503 and do NOT invalidate client credentials
      throw err;
    }
  }

  /**
   * Logs out user and revokes active session
   */
  async logout(rawRefreshToken?: string, sessionId?: string): Promise<void> {
    if (rawRefreshToken) {
      await sessionService.revokeSessionByRefreshToken(rawRefreshToken);
    }
    if (sessionId) {
      await sessionService.revokeSessionById(sessionId);
    }
  }

  /**
   * Requests a password reset token
   */
  async requestPasswordReset(
    email: string,
  ): Promise<{ success: boolean; message: string }> {
    const user = await identityRepository.findByEmail(email);
    if (user) {
      const rawToken = passwordService.generateSecureToken(32);
      const tokenHash = passwordService.hashToken(rawToken);
      await identityRepository.createPasswordResetToken(
        user.id,
        tokenHash,
        rawToken,
        user.email,
        user.firstName,
      );

      try {
        await emailService.sendPasswordResetEmail(
          user.email,
          user.firstName,
          rawToken,
        );
      } catch (err: any) {
        console.warn(
          "Direct password reset email deferred to outbox:",
          err?.message,
        );
      }
    }

    return {
      success: true,
      message:
        "If an account exists with that email, password reset instructions have been sent.",
    };
  }

  /**
   * Confirms password reset with new password
   */
  async confirmPasswordReset(
    token: string,
    newPassword: string,
  ): Promise<{ success: boolean; message: string }> {
    const tokenHash = passwordService.hashToken(token);
    const newPasswordHash = await passwordService.hashPassword(newPassword);

    try {
      const { user, revokedSessionIds } =
        await identityRepository.resetPasswordByTokenHash(
          tokenHash,
          newPasswordHash,
        );

      // Purge and revoke all active sessions in Redis cache immediately
      await sessionService.revokeAllUserSessions(user.id, revokedSessionIds);

      return {
        success: true,
        message:
          "Your password has been successfully reset. You can now log in with your new password.",
      };
    } catch (err: any) {
      const error: any = new Error(
        err.message === "TOKEN_ALREADY_USED"
          ? "This reset link has already been used"
          : err.message === "TOKEN_EXPIRED"
            ? "This reset link has expired"
            : "Invalid or expired password reset link",
      );
      error.code = err.message || "INVALID_RESET_TOKEN";
      error.statusCode = 400;
      throw error;
    }
  }

  /**
   * Sets up new staff/admin account password from 1-hour one-time link
   */
  async setupAccount(
    token: string,
    newPassword: string,
  ): Promise<SetupAccountResult> {
    const tokenHash = passwordService.hashToken(token);
    const newPasswordHash = await passwordService.hashPassword(newPassword);

    try {
      const { user, revokedSessionIds } =
        await identityRepository.resetPasswordByTokenHash(
          tokenHash,
          newPasswordHash,
        );

      // Purge sessions if any
      await sessionService.revokeAllUserSessions(user.id, revokedSessionIds);

      // Check if user requires MFA setup (Staff/Admin roles)
      if (MFA_REQUIRED_ROLES.has(user.role as UserRole) && !user.mfaEnabled) {
        const setupToken = jwt.sign(
          { id: user.id, purpose: "mfa_setup" },
          config.jwt.secret,
          { expiresIn: "15m" },
        );

        return {
          success: true,
          requiresMfaSetup: true,
          setupToken,
          user: {
            id: user.id,
            firstName: user.firstName,
            email: user.email,
            role: user.role as UserRole,
          },
          message:
            "Your password has been successfully configured. Please proceed with Two-Factor Authentication setup.",
        };
      }

      return {
        success: true,
        message:
          "Your account has been successfully set up. You can now sign in to the Admin Console.",
      };
    } catch (err: any) {
      if (err.message === "TOKEN_ALREADY_USED") {
        const error: any = new Error(
          "This setup link has already been used. Please sign in or contact your Super Administrator.",
        );
        error.code = "TOKEN_ALREADY_USED";
        error.statusCode = 410;
        throw error;
      }
      if (err.message === "TOKEN_EXPIRED") {
        const error: any = new Error(
          "This setup link has expired (1-hour validity limit). Please request a new invite.",
        );
        error.code = "TOKEN_EXPIRED";
        error.statusCode = 410;
        throw error;
      }
      const error: any = new Error(
        "Invalid or expired setup link. Please contact your Super Administrator.",
      );
      error.code = "INVALID_SETUP_TOKEN";
      error.statusCode = 400;
      throw error;
    }
  }

  /**
   * Fetches user profile by ID
   */
  async getProfile(userId: string): Promise<UserSummaryDTO> {
    const user = await identityRepository.findById(userId);
    if (!user) {
      const error: any = new Error("User not found");
      error.code = "USER_NOT_FOUND";
      error.statusCode = 404;
      throw error;
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      avatarUrl: (user as any).avatarUrl || null,
      birthday: (user as any).birthday || null,
      clientId: user.clientId,
      role: user.role as UserRole,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      referralCode: user.referralCode || null,
    };
  }

  /**
   * Updates authenticated user profile details
   */
  async updateProfile(
    userId: string,
    data: {
      firstName?: string;
      lastName?: string;
      phoneNumber?: string;
      birthday?: string | null;
    },
    ipAddress?: string,
  ): Promise<UserSummaryDTO> {
    const existing = await identityRepository.findById(userId);
    if (!existing) {
      const error: any = new Error("User not found");
      error.code = "USER_NOT_FOUND";
      error.statusCode = 404;
      throw error;
    }

    const updated = await identityRepository.updateUser(userId, {
      ...(data.firstName !== undefined && { firstName: data.firstName }),
      ...(data.lastName !== undefined && { lastName: data.lastName }),
      ...(data.phoneNumber !== undefined && { phoneNumber: data.phoneNumber }),
      ...(data.birthday !== undefined && { birthday: data.birthday }),
    });

    await prisma.auditLog
      .create({
        data: {
          userId,
          action: "USER_PROFILE_UPDATED",
          entityType: "User",
          entityId: userId,
          metadata: {
            previous: {
              firstName: existing.firstName,
              lastName: existing.lastName,
              phoneNumber: existing.phoneNumber,
              birthday: (existing as any).birthday,
            },
            updated: {
              firstName: updated.firstName,
              lastName: updated.lastName,
              phoneNumber: updated.phoneNumber,
              birthday: (updated as any).birthday,
            },
          },
          ipAddress,
        },
      })
      .catch(() => {});

    return {
      id: updated.id,
      email: updated.email,
      firstName: updated.firstName,
      lastName: updated.lastName,
      phoneNumber: updated.phoneNumber,
      avatarUrl: (updated as any).avatarUrl || null,
      birthday: (updated as any).birthday || null,
      clientId: updated.clientId,
      role: updated.role as UserRole,
      isVerified: updated.isVerified,
      createdAt: updated.createdAt,
      referralCode: updated.referralCode || null,
    };
  }

  /**
   * Uploads, square-crops, and WebP compresses user avatar,
   * automatically deleting any previously uploaded avatar.
   */
  async uploadAvatar(
    userId: string,
    input: {
      imageBuffer: Buffer;
      fileName?: string;
      mimeType?: string;
    },
    reqProtocol?: string,
    reqHost?: string,
    ipAddress?: string,
  ): Promise<{ avatarUrl: string; user: UserSummaryDTO }> {
    const existing = await identityRepository.findById(userId);
    if (!existing) {
      const error: any = new Error("User not found");
      error.code = "USER_NOT_FOUND";
      error.statusCode = 404;
      throw error;
    }

    const uploadLocations = [
      path.join(process.cwd(), "uploads", "avatars"),
      path.join(process.cwd(), "apps", "api", "uploads", "avatars"),
      path.resolve(__dirname, "../../../uploads/avatars"),
      path.resolve(__dirname, "../../uploads/avatars"),
    ];

    for (const dir of uploadLocations) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch {}
    }

    // 1. Delete previous avatar file if exists
    const previousAvatarUrl = (existing as any).avatarUrl;
    if (previousAvatarUrl && typeof previousAvatarUrl === "string") {
      const prevFilename = path.basename(previousAvatarUrl);
      if (prevFilename && prevFilename.includes(".")) {
        for (const dir of uploadLocations) {
          const filePath = path.join(dir, prevFilename);
          try {
            await fs.unlink(filePath);
          } catch {}
        }
      }
    }

    // 2. Compress and crop to square WebP (512x512)
    let finalBuffer: Buffer;
    const ext = "webp";

    if (input.mimeType?.toLowerCase() === "image/svg+xml") {
      finalBuffer = input.imageBuffer;
    } else {
      finalBuffer = await sharp(input.imageBuffer)
        .rotate()
        .resize({
          width: 512,
          height: 512,
          fit: "cover",
          position: "centre",
        })
        .webp({
          quality: 85,
          effort: 4,
        })
        .toBuffer();
    }

    // 3. Save new file
    const uniqueId = crypto.randomUUID().slice(0, 8);
    const timestamp = Date.now();
    const filename = `avatar-${userId}-${timestamp}-${uniqueId}.${ext}`;

    for (const dir of uploadLocations) {
      try {
        await fs.writeFile(path.join(dir, filename), finalBuffer);
      } catch {}
    }

    const relativeUrl = `/uploads/avatars/${filename}`;

    // 4. Update user in database
    const updated = await identityRepository.updateUser(userId, {
      avatarUrl: relativeUrl,
    } as any);

    await prisma.auditLog
      .create({
        data: {
          userId,
          action: "USER_AVATAR_UPDATED",
          entityType: "User",
          entityId: userId,
          metadata: {
            previousAvatarUrl,
            newAvatarUrl: relativeUrl,
          },
          ipAddress,
        },
      })
      .catch(() => {});

    const userSummary: UserSummaryDTO = {
      id: updated.id,
      email: updated.email,
      firstName: updated.firstName,
      lastName: updated.lastName,
      phoneNumber: updated.phoneNumber,
      avatarUrl: (updated as any).avatarUrl || relativeUrl,
      birthday: (updated as any).birthday || null,
      clientId: updated.clientId,
      role: updated.role as UserRole,
      isVerified: updated.isVerified,
      createdAt: updated.createdAt,
      referralCode: updated.referralCode || null,
    };

    return {
      avatarUrl: relativeUrl,
      user: userSummary,
    };
  }

  /**
   * Deletes existing user avatar file and clears avatarUrl
   */
  async deleteAvatar(
    userId: string,
    ipAddress?: string,
  ): Promise<{ success: boolean; user: UserSummaryDTO }> {
    const existing = await identityRepository.findById(userId);
    if (!existing) {
      const error: any = new Error("User not found");
      error.code = "USER_NOT_FOUND";
      error.statusCode = 404;
      throw error;
    }

    const previousAvatarUrl = (existing as any).avatarUrl;
    if (previousAvatarUrl && typeof previousAvatarUrl === "string") {
      const prevFilename = path.basename(previousAvatarUrl);
      const uploadLocations = [
        path.join(process.cwd(), "uploads", "avatars"),
        path.join(process.cwd(), "apps", "api", "uploads", "avatars"),
        path.resolve(__dirname, "../../../uploads/avatars"),
        path.resolve(__dirname, "../../uploads/avatars"),
      ];

      for (const dir of uploadLocations) {
        const filePath = path.join(dir, prevFilename);
        try {
          await fs.unlink(filePath);
        } catch {}
      }
    }

    const updated = await identityRepository.updateUser(userId, {
      avatarUrl: null,
    } as any);

    await prisma.auditLog
      .create({
        data: {
          userId,
          action: "USER_AVATAR_DELETED",
          entityType: "User",
          entityId: userId,
          metadata: { previousAvatarUrl },
          ipAddress,
        },
      })
      .catch(() => {});

    const userSummary: UserSummaryDTO = {
      id: updated.id,
      email: updated.email,
      firstName: updated.firstName,
      lastName: updated.lastName,
      phoneNumber: updated.phoneNumber,
      avatarUrl: null,
      birthday: (updated as any).birthday || null,
      clientId: updated.clientId,
      role: updated.role as UserRole,
      isVerified: updated.isVerified,
      createdAt: updated.createdAt,
      referralCode: updated.referralCode || null,
    };

    return {
      success: true,
      user: userSummary,
    };
  }

  /**
   * Changes user password with current password verification
   */
  async changePassword(
    userId: string,
    data: { currentPassword: string; newPassword: string },
    ipAddress?: string,
  ): Promise<{ success: boolean; message: string }> {
    const user = await identityRepository.findById(userId);
    if (!user || !user.passwordHash) {
      const error: any = new Error("User not found or password not set");
      error.code = "USER_NOT_FOUND";
      error.statusCode = 404;
      throw error;
    }

    const isCurrentValid = await passwordService.verifyPassword(
      user.passwordHash,
      data.currentPassword,
    );

    if (!isCurrentValid) {
      const error: any = new Error("Current password is incorrect");
      error.code = "INVALID_CURRENT_PASSWORD";
      error.statusCode = 400;
      throw error;
    }

    const newPasswordHash = await passwordService.hashPassword(
      data.newPassword,
    );
    await identityRepository.updateUser(userId, {
      passwordHash: newPasswordHash,
    });

    await prisma.auditLog
      .create({
        data: {
          userId,
          action: "PASSWORD_CHANGED",
          entityType: "User",
          entityId: userId,
          metadata: { timestamp: new Date().toISOString() },
          ipAddress,
        },
      })
      .catch(() => {});

    return {
      success: true,
      message: "Password changed successfully",
    };
  }
  /**
   * Fetches the customer's own referral summary and list of referred members.
   * Utilizes single-round-trip database aggregation to compute paid booking status.
   */
  async getMyReferrals(userId: string): Promise<CustomerReferralsResponse> {
    const user = await identityRepository.findById(userId);
    if (!user) {
      const error: any = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    // If user doesn't have a referral code yet, assign one lazily
    let referralCode = user.referralCode;
    if (!referralCode) {
      referralCode = generateReferralCode();
      await prisma.user.update({
        where: { id: user.id },
        data: { referralCode },
      });
    }

    const PAID_BOOKING_STATES: BookingState[] = [
      BookingState.CONFIRMED,
      BookingState.ACTIVE,
      BookingState.CHECKED_IN,
      BookingState.CHECKED_OUT,
      BookingState.COMPLETED,
    ];

    // Single aggregated query to fetch all referred users with count of their paid bookings
    const referredUsers = await prisma.user.findMany({
      where: { referredById: userId },
      select: {
        id: true,
        clientId: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        createdAt: true,
        _count: {
          select: {
            bookings: {
              where: {
                state: { in: PAID_BOOKING_STATES },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const items: ReferralItem[] = referredUsers.map((u) => {
      const paidBookingsCount = u._count.bookings;
      const isActive = paidBookingsCount > 0;
      return {
        id: u.id,
        clientId: u.clientId,
        name: `${u.firstName} ${u.lastName}`.trim(),
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        phoneNumber: u.phoneNumber,
        joinedAt: u.createdAt.toISOString(),
        isActive,
        status: isActive ? "Active" : "Inactive",
        paidBookingsCount,
      };
    });

    const totalReferred = items.length;
    const activeReferred = items.filter((i) => i.isActive).length;
    const inactiveReferred = totalReferred - activeReferred;

    const frontendBase = config.frontendUrls?.customer || "https://app.daih.ng";
    const referralLink = `${frontendBase}/register?ref=${referralCode}`;

    return {
      referralCode,
      referralLink,
      totalReferred,
      activeReferred,
      inactiveReferred,
      referredUsers: items,
    };
  }
}

export const identityService = new IdentityService();
