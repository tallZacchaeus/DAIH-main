import { ResourceCategory } from "./booking.types";
import { UserRole } from "./roles.types";

export interface ResourcePricingPlan {
  id: string;
  resourceId?: string;
  planName: string;
  durationHours?: number | null;
  durationDays?: number | null;
  durationMonths?: number | null;
  price: number;
  currency: string;
  isPopular?: boolean;
  isActive?: boolean;
  isNightPlan?: boolean;
  operatingHours?: string | null;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ResourceSchedule {
  id: string;
  resourceId: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  openTime: string;
  closeTime: string;
  is24Hours: boolean;
  isClosed: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ResourceBlackout {
  id: string;
  resourceId: string;
  startDate: string;
  endDate: string;
  reason: string;
  isActive: boolean;
  createdByUserId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface FacilityResource {
  id: string;
  name: string;
  slug: string;
  category: ResourceCategory;
  description: string;
  capacity: number;
  location: string;
  amenities: string[];
  features?: string[];
  imageUrl?: string | null;
  sortOrder?: number;
  isPopular?: boolean;
  isActive: boolean;
  pricing?: ResourcePricingPlan[];
  schedules?: ResourceSchedule[];
  blackouts?: ResourceBlackout[];
  dailyRate?: number;
  hourlyRate?: number;
  monthlyRate?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateResourceDTO {
  name: string;
  slug: string;
  category: ResourceCategory;
  description: string;
  capacity: number;
  location: string;
  amenities: string[];
  imageUrl?: string;
  sortOrder?: number;
  isPopular?: boolean;
  isActive?: boolean;
}

export interface UpdateResourceDTO {
  name?: string;
  slug?: string;
  category?: ResourceCategory;
  description?: string;
  capacity?: number;
  location?: string;
  amenities?: string[];
  imageUrl?: string;
  sortOrder?: number;
  isPopular?: boolean;
  isActive?: boolean;
}

export interface CreatePricingPlanDTO {
  planName: string;
  durationHours?: number;
  durationDays?: number;
  durationMonths?: number;
  price: number;
  currency?: string;
  isPopular?: boolean;
  isActive?: boolean;
  isNightPlan?: boolean;
  operatingHours?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
}

export interface UpdatePricingPlanDTO {
  planName?: string;
  durationHours?: number;
  durationDays?: number;
  durationMonths?: number;
  price?: number;
  currency?: string;
  isPopular?: boolean;
  isActive?: boolean;
  isNightPlan?: boolean;
  operatingHours?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
}

export interface CreateBlackoutDTO {
  startDate: string;
  endDate: string;
  reason: string;
  isActive?: boolean;
}

export interface UpsertScheduleDTO {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  is24Hours?: boolean;
  isClosed?: boolean;
}

export interface UploadResourceImageDTO {
  data: string; // Base64 data or data URL (e.g. data:image/png;base64,...)
  fileName?: string;
  contentType?: string;
  resourceId?: string;
}

export interface UploadImageResponse {
  url: string;
  fullUrl: string;
  filename: string;
  size?: number;
  format?: string;
  width?: number;
  height?: number;
  resourceId?: string;
}

/**
 * Decodes single- or double-escaped HTML entities (e.g., &amp;amp; -> &amp; -> &, &quot; -> ", &#x27; -> ')
 * to guarantee that resource names, descriptions, and amenities always render cleanly as plain text.
 */
export function decodeHtmlEntities(str: string): string {
  if (!str || typeof str !== "string") return str;
  let current = str;
  let prev = "";
  while (current !== prev && /&(amp|lt|gt|quot|#x27|#39);/i.test(current)) {
    prev = current;
    current = current
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#x27;|&#39;/gi, "'");
  }
  return current;
}
