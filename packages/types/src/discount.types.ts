export enum DiscountType {
  PERCENTAGE = "PERCENTAGE",
  FIXED_AMOUNT = "FIXED_AMOUNT",
  FIXED_PRICE = "FIXED_PRICE",
}

export enum CustomerEligibility {
  ALL = "ALL",
  SPECIFIC_CUSTOMERS = "SPECIFIC_CUSTOMERS",
  FIRST_TIME_ONLY = "FIRST_TIME_ONLY",
  DOMAIN_MATCH = "DOMAIN_MATCH",
}

export enum RedemptionStatus {
  HELD = "HELD",
  APPLIED = "APPLIED",
  RELEASED = "RELEASED",
  REFUNDED = "REFUNDED",
}

export enum DiscountSource {
  CUSTOMER_COUPON = "CUSTOMER_COUPON",
  AUTOMATIC = "AUTOMATIC",
  STAFF_OVERRIDE = "STAFF_OVERRIDE",
}

export interface DiscountTargetResourceDTO {
  id: string;
  discountId: string;
  resourceId: string;
  resourceName?: string;
  resourceSlug?: string;
}

export interface DiscountTargetCustomerDTO {
  id: string;
  discountId: string;
  userId: string;
  customerName?: string;
  customerEmail?: string;
  customerClientId?: string;
}

export interface DiscountDTO {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  type: DiscountType;
  value: number;
  maxDiscountAmount: number | null;
  minOrderAmount: number;
  currency: string;
  isAutomatic: boolean;
  isActive: boolean;
  validFrom: string;
  validUntil: string | null;
  maxUsageTotal: number | null;
  maxUsagePerUser: number;
  currentUsageCount: number;
  appliesToAll: boolean;
  targetCategories: string[];
  customerEligibility: CustomerEligibility;
  targetEmailDomains: string[];
  createdAt: string;
  updatedAt: string;
  targetResources?: DiscountTargetResourceDTO[];
  targetCustomers?: DiscountTargetCustomerDTO[];
  redemptionsCount?: number;
}

export interface CreateDiscountDTO {
  code?: string;
  name: string;
  description?: string;
  type: DiscountType;
  value: number;
  maxDiscountAmount?: number;
  minOrderAmount?: number;
  currency?: string;
  isAutomatic?: boolean;
  isActive?: boolean;
  validFrom?: string;
  validUntil?: string;
  maxUsageTotal?: number;
  maxUsagePerUser?: number;
  appliesToAll?: boolean;
  targetCategories?: string[];
  customerEligibility?: CustomerEligibility;
  targetEmailDomains?: string[];
  targetResourceIds?: string[];
  targetCustomerIds?: string[];
}

export interface UpdateDiscountDTO {
  code?: string;
  name?: string;
  description?: string;
  type?: DiscountType;
  value?: number;
  maxDiscountAmount?: number | null;
  minOrderAmount?: number;
  currency?: string;
  isAutomatic?: boolean;
  isActive?: boolean;
  validFrom?: string;
  validUntil?: string | null;
  maxUsageTotal?: number | null;
  maxUsagePerUser?: number;
  appliesToAll?: boolean;
  targetCategories?: string[];
  customerEligibility?: CustomerEligibility;
  targetEmailDomains?: string[];
  targetResourceIds?: string[];
  targetCustomerIds?: string[];
}

export interface DiscountPreviewRequestDTO {
  code?: string;
  resourceId: string;
  planId?: string;
  startTime: string;
  endTime: string;
}

export interface DiscountPreviewResponseDTO {
  eligible: boolean;
  code?: string;
  name?: string;
  discountId?: string;
  discountType?: DiscountType;
  discountValue?: number;
  basePrice: number;
  discountAmount: number;
  netTaxableSubtotal: number;
  taxAmount: number;
  grandTotal: number;
  currency: string;
  reason?: string;
  isAutomatic?: boolean;
}

export interface ApplyCourtesyDiscountDTO {
  type: DiscountType;
  value: number;
  justificationNote: string;
  waiveFee?: boolean;
}

export interface DiscountRedemptionDTO {
  id: string;
  discountId: string | null;
  discountCode?: string | null;
  discountName?: string | null;
  userId: string;
  customerName?: string;
  customerEmail?: string;
  customerClientId?: string;
  bookingId: string;
  bookingReference?: string;
  transactionId?: string | null;
  source: DiscountSource;
  appliedByStaffId?: string | null;
  appliedByStaffName?: string | null;
  justificationNote?: string | null;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  status: RedemptionStatus;
  heldAt: string;
  appliedAt?: string | null;
  releasedAt?: string | null;
  createdAt: string;
}

export interface DiscountFilterDTO {
  search?: string;
  isActive?: boolean;
  type?: DiscountType;
  page?: number;
  limit?: number;
}

export interface DiscountListResponse {
  discounts: DiscountDTO[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
