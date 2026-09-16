import { UserRole } from "@daih/types";

export interface UserSummaryDTO {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string | null;
  avatarUrl?: string | null;
  birthday?: string | null;
  clientId: string;
  role: UserRole;
  isVerified: boolean;
  createdAt: Date;
  referralCode?: string | null;
}

export interface RegisterDTO {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  password: string;
  policyVersion: string;
  consented: boolean;
  referralCode?: string;
}

export interface LoginDTO {
  email: string;
  password: string;
  portal?: "customer" | "admin" | string;
  audience?: "CUSTOMER" | "ADMIN" | string;
}

export interface CreateStaffUserDTO {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  role: UserRole;
}

export interface AuthResponseDTO {
  accessToken: string;
  user: UserSummaryDTO;
  verificationSent?: boolean;
}

export interface JwtTokenPayload {
  id: string;
  email: string;
  role: UserRole;
  clientId: string;
  sessionId?: string;
}

export interface SessionContext {
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
  portal?: string;
}

// ─── MFA Types ────────────────────────────────────────────────────────────────

export type MfaMethod = "EMAIL_OTP" | "TOTP";

/**
 * Returned when a staff login succeeds on password but MFA has NOT been
 * configured yet. Frontend must redirect to /setup-mfa.
 */
export interface MfaSetupRequiredResult {
  requiresMfaSetup: true;
  /** Short-lived JWT (purpose: "mfa_setup", 15 min) granting access to setup endpoints */
  setupToken: string;
  user: Pick<UserSummaryDTO, "id" | "firstName" | "email" | "role">;
}

/**
 * Returned when password is valid and MFA is configured.
 * Frontend must collect the 6-digit code and call POST /mfa/verify.
 */
export interface MfaChallengeResult {
  requiresMfa: true;
  /** Short-lived JWT (purpose: "mfa_challenge", 5 min) */
  mfaChallengeToken: string;
  method: MfaMethod;
  /** Masked email hint e.g. "pe***@daih.ng" — for Email OTP UX only */
  emailHint?: string;
}

/** Standard successful login — full session issued */
export interface LoginSuccessResult {
  accessToken: string;
  rawRefreshToken: string;
  user: UserSummaryDTO;
}

export type LoginResult =
  LoginSuccessResult | MfaChallengeResult | MfaSetupRequiredResult;

export interface SetupAccountResult {
  success: boolean;
  message: string;
  requiresMfaSetup?: boolean;
  setupToken?: string;
  user?: Pick<UserSummaryDTO, "id" | "firstName" | "email" | "role">;
}
