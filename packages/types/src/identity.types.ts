import { UserRole } from "./roles.types";

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string | null;
  birthday?: string | null;
  clientId: string;
  role: UserRole;
  isVerified: boolean;
  onboardingCompleted?: boolean;
  avatarUrl?: string | null;
  referralCode?: string | null;
  hasReferrer?: boolean;
  hasPassword?: boolean;
  acquisitionSource?: string | null;
  googleId?: string | null;
  identities?: AuthIdentityDTO[];
  hasGoogleLinked?: boolean;
  needsConsent?: boolean;
  mfaEnabled?: boolean;
  mfaMethod?: "EMAIL_OTP" | "TOTP" | null;
}

export interface AuthIdentityDTO {
  id: string;
  provider: string;
  providerUserId: string;
  email: string;
  linkedAt: string | Date;
}

export interface GoogleAuthDTO {
  idToken: string;
  referralCode?: string;
  portal?: "customer" | "admin" | string;
}

export interface GoogleAuthResponseDTO {
  accessToken: string;
  token?: string;
  user: UserProfile;
  isNewUser: boolean;
  needsOnboarding: boolean;
  needsConsent?: boolean;
}

export interface GoogleOAuthInitResponseDTO {
  url: string;
}

export interface OnboardingAttributionDTO {
  source?: string;
  referralCode?: string;
}
