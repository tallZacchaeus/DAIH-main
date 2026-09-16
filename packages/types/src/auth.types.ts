import { UserRole } from "./roles.types";

export type MfaMethod = "EMAIL_OTP" | "TOTP";

export interface MfaSetupRequiredResponse {
  requiresMfaSetup: true;
  setupToken: string;
  user: {
    id: string;
    firstName: string;
    email: string;
    role: UserRole;
  };
}

export interface MfaChallengeResponse {
  requiresMfa: true;
  mfaChallengeToken: string;
  method: MfaMethod;
  emailHint?: string;
}

export interface AuthSuccessResponse {
  token: string;
  user: {
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
    createdAt: Date | string;
  };
}

export type LoginApiResponse =
  AuthSuccessResponse | MfaSetupRequiredResponse | MfaChallengeResponse;

export interface MfaSetupInitResponse {
  method: MfaMethod;
  qrCodeDataUri?: string;
  manualEntryKey?: string;
  ephemeralSecret?: string;
}

export interface SetupAccountResponse {
  success: boolean;
  message: string;
  requiresMfaSetup?: boolean;
  setupToken?: string;
  user?: {
    id: string;
    firstName: string;
    email: string;
    role: UserRole;
  };
}
