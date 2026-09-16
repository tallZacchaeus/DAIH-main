import { NotificationDTO } from "@daih/types";

export interface ListNotificationsOptions {
  limit?: number;
  cursor?: string;
}

export interface CreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  message: string;
  linkHref?: string | null;
  metadata?: Record<string, unknown> | null;
  sourceEventId?: string | null;
}

export interface NotificationListResult {
  notifications: NotificationDTO[];
  unreadCount: number;
  nextCursor?: string | null;
}
