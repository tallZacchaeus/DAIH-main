import { Queue } from "bullmq";
import { redis } from "../../config/redis.js";
import { config } from "../../config/env.js";

export type NotificationJobType =
  | "booking.confirmed"
  | "booking.rescheduled"
  | "booking.cancelled"
  | "booking.reminder"
  | "access.checked_in"
  | "access.checked_out"
  | "payment.receipt"
  | "payment.refund";

export interface NotificationJobData {
  jobType: NotificationJobType;
  recipientEmail: string;
  recipientName: string;
  payload: Record<string, any>;
  createdAt?: string;
}

export const notificationQueue = new Queue<NotificationJobData>(
  "notifications",
  {
    connection: redis,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
      removeOnComplete: 100,
      removeOnFail: 500,
    },
  },
);

/**
 * Helper to enqueue a transactional notification job
 */
export async function enqueueNotification(
  jobType: NotificationJobType,
  recipientEmail: string,
  recipientName: string,
  payload: Record<string, any>,
  delayMs?: number,
) {
  if (!recipientEmail) return;

  try {
    const job = await notificationQueue.add(
      jobType,
      {
        jobType,
        recipientEmail,
        recipientName,
        payload,
        createdAt: new Date().toISOString(),
      },
      {
        delay: delayMs,
      },
    );
    return job;
  } catch (err: any) {
    if (config.env !== "test") {
      console.warn(
        `⚠️ Failed to enqueue notification job '${jobType}':`,
        err?.message,
      );
    }
  }
}
