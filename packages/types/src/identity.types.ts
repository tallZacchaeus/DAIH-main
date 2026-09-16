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
  avatarUrl?: string | null;
  referralCode?: string | null;
}
