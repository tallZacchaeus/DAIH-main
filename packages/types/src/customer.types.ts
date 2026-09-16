export interface CustomerRecord {
  id: string; // Client ID, e.g. DAIH-2026-000042
  userId: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  tier: string;
  status: "Active" | "Pending" | "Inactive";
  lastVisit: string;
  joinedDate: string;
  totalBookings: number;
  totalSpent: number;
  isVerified: boolean;
  createdAt: string;
  referralCode?: string;
  referralCount?: number;
  activeReferralCount?: number;
  birthday?: string | null;
  dateOfBirth?: string | null;
}

export interface CustomerMetrics {
  totalMembers: number;
  activeNow: number;
  newThisMonth: number;
  mrrGrowth: string;
}

export interface CustomerListResponse {
  customers: CustomerRecord[];
  total: number;
  page: number;
  limit: number;
  metrics: CustomerMetrics;
}

export interface CustomerFilterDTO {
  search?: string;
  status?: string;
  tier?: string;
  page?: number;
  limit?: number;
}

export interface CreateCustomerDTO {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  tier?: string;
  dateOfBirth?: string;
  birthday?: string;
  sendInvite?: boolean;
}

export interface ReferralItem {
  id: string;
  clientId?: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phoneNumber?: string | null;
  joinedAt: string;
  isActive: boolean;
  status: "Active" | "Inactive";
  paidBookingsCount: number;
}

export interface CustomerReferralsResponse {
  referralCode: string;
  referralLink: string;
  totalReferred: number;
  activeReferred: number;
  inactiveReferred: number;
  referredUsers: ReferralItem[];
}

export interface AdminCustomerReferralsResponse {
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerClientId: string;
  referralCode: string;
  totalReferred: number;
  activeReferred: number;
  referredUsers: ReferralItem[];
}
