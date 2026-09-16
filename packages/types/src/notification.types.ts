export type NotificationType =
  | "booking.confirmed"
  | "booking.rescheduled"
  | "booking.cancelled"
  | "booking.reminder"
  | "access.checked_in"
  | "access.checked_out"
  | "payment.successful"
  | "payment.failed"
  | "payment.capacity_conflict"
  | "system";

export interface NotificationDTO {
  id: string;
  type: NotificationType | string;
  title: string;
  message: string;
  linkHref?: string | null;
  metadata?: Record<string, unknown> | null;
  readAt?: string | null;
  archivedAt?: string | null;
  createdAt: string;
}

export interface NotificationListResponse {
  notifications: NotificationDTO[];
  unreadCount: number;
  nextCursor?: string | null;
}

export interface NotificationUnreadCountResponse {
  unreadCount: number;
}
