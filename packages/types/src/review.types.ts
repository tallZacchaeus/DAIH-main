export enum ReviewStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  ARCHIVED = "ARCHIVED",
}

export interface ReviewDTO {
  id: string;
  userId: string;
  bookingId: string;
  resourceId: string;
  rating: number;
  powerRating?: number | null;
  wifiRating?: number | null;
  comfortRating?: number | null;
  staffRating?: number | null;
  title?: string | null;
  comment: string;
  status: ReviewStatus;
  isFeaturedOnHome: boolean;
  adminReply?: string | null;
  adminRepliedAt?: string | null;
  adminRepliedBy?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
  };
  resource?: {
    id: string;
    name: string;
    slug: string;
    category: string;
  };
  booking?: {
    id: string;
    reference: string;
    startTime: string;
    endTime: string;
  };
}

export interface ReviewSettingDTO {
  id: string;
  requireApproval: boolean;
  isHomepageSpotlightEnabled: boolean;
  updatedAt?: string;
  updatedBy?: string | null;
}

export interface CreateReviewDTO {
  bookingId: string;
  rating: number;
  title?: string;
  comment: string;
  powerRating?: number;
  wifiRating?: number;
  comfortRating?: number;
  staffRating?: number;
}

export interface UpdateReviewDTO {
  rating?: number;
  title?: string;
  comment?: string;
  powerRating?: number;
  wifiRating?: number;
  comfortRating?: number;
  staffRating?: number;
}

export interface AdminReviewFilterDTO {
  status?: ReviewStatus | "ALL";
  resourceId?: string;
  rating?: number;
  search?: string;
  page?: number;
  limit?: number;
}

export interface UpdateReviewStatusDTO {
  status: ReviewStatus;
  isFeaturedOnHome?: boolean;
}

export interface UpdateReviewSettingDTO {
  requireApproval: boolean;
  isHomepageSpotlightEnabled?: boolean;
}

export interface AdminReplyDTO {
  reply: string;
}

export interface ReviewEligibilityDTO {
  eligible: boolean;
  reason?: string;
  bookingId: string;
  hasReviewed: boolean;
  existingReview?: ReviewDTO | null;
  canEdit?: boolean;
}

export interface ResourceReviewsSummaryDTO {
  resourceId: string;
  averageRating: number;
  totalReviews: number;
  ratingBreakdown: {
    fiveStar: number;
    fourStar: number;
    threeStar: number;
    twoStar: number;
    oneStar: number;
  };
  reviews: ReviewDTO[];
}
