import { Worker, Job } from "bullmq";
import { redis } from "../../config/redis.js";
import { emailService } from "../email/email.service.js";
import { NotificationJobData } from "./notifications.queue.js";
import * as Sentry from "@sentry/node";

/**
 * Worker processor for the notifications queue
 */
export async function processNotificationJob(job: Job<NotificationJobData>) {
  const { jobType, recipientEmail, recipientName, payload } = job.data;

  try {
    switch (jobType) {
      case "booking.confirmed": {
        await emailService.sendBookingConfirmationEmail(
          recipientEmail,
          recipientName,
          payload.reference,
          payload.resourceName || "Workspace Resource",
          payload.startTime,
          payload.endTime,
          payload.qrToken,
        );
        break;
      }

      case "booking.rescheduled": {
        await emailService.sendBookingRescheduledEmail(
          recipientEmail,
          recipientName,
          payload.reference,
          payload.resourceName || "Workspace Resource",
          payload.startTime,
          payload.endTime,
          payload.qrToken,
        );
        break;
      }

      case "access.checked_in": {
        await emailService.sendCheckInWelcomeEmail(
          recipientEmail,
          recipientName,
          payload.reference,
          payload.resourceName || "Workspace Resource",
          payload.wifiCredentials,
          payload.endTime,
        );
        break;
      }

      case "access.checked_out": {
        await emailService.sendCheckOutSummaryEmail(
          recipientEmail,
          recipientName,
          payload.reference,
          payload.resourceName || "Workspace Resource",
          payload.departureTime,
          payload.bookingId,
        );
        break;
      }

      case "booking.completed": {
        await emailService.sendBookingCompletedReviewEmail(
          recipientEmail,
          recipientName,
          payload.reference,
          payload.resourceName || "Workspace Resource",
          payload.bookingId,
        );
        break;
      }

      case "booking.reminder": {
        await emailService.sendBookingReminderEmail(
          recipientEmail,
          recipientName,
          payload.reference,
          payload.resourceName || "Workspace Resource",
          payload.startTime,
        );
        break;
      }

      case "booking.cancelled": {
        await emailService.sendBookingCancelledEmail(
          recipientEmail,
          recipientName,
          payload.reference,
          payload.resourceName || "Workspace Resource",
          payload.reason,
        );
        break;
      }

      case "payment.receipt": {
        await emailService.sendPaymentReceiptEmail(
          recipientEmail,
          recipientName,
          payload.bookingReference || payload.reference,
          payload.resourceName || "Workspace",
          payload.amount || 0,
          payload.currency || "NGN",
          payload.invoiceNumber,
        );
        break;
      }

      case "security.account_linked": {
        await emailService.sendAccountLinkedEmail(
          recipientEmail,
          recipientName,
          payload.provider || "Google",
        );
        break;
      }

      case "auth.mfa_otp": {
        await emailService.sendMfaOtpEmail(
          recipientEmail,
          recipientName,
          payload.rawCode,
        );
        break;
      }

      case "campaign.broadcast": {
        await emailService.sendCampaignBroadcastEmail(
          recipientEmail,
          recipientName,
          payload.subject || "DAIH Workspaces Notification",
          payload.content || "",
          payload.coinReward,
          payload.discountPercentage,
        );
        break;
      }

      case "finance.refund_requested":
      case "finance.refund_info_provided":
      case "operations.refund_info_requested":
      case "operations.refund_rejected":
      case "customer.refund_processed": {
        console.log(
          `[NotificationWorker] Dispatching ${jobType} to ${recipientEmail}`,
        );
        break;
      }

      default:
        console.warn(`[NotificationWorker] Unknown job type '${jobType}'`);
        break;
    }

    return { success: true, deliveredTo: recipientEmail, jobType };
  } catch (err: any) {
    console.error(
      `❌ [NotificationWorker] Failed to process job ${job.id} (${jobType}):`,
      err?.message,
    );
    Sentry.captureException(err, {
      extra: {
        jobId: job.id,
        jobType,
        recipientEmail,
      },
    });
    throw err;
  }
}

export const notificationWorker = new Worker(
  "notifications",
  processNotificationJob,
  {
    connection: redis,
    concurrency: 5,
  },
);

notificationWorker.on("completed", (job) => {
  console.log(
    `📬 [NotificationWorker] Delivered '${job.data.jobType}' to ${job.data.recipientEmail}`,
  );
});

notificationWorker.on("failed", (job, err) => {
  console.warn(
    `⚠️ [NotificationWorker] Job ${job?.id} failed on attempt ${job?.attemptsMade}:`,
    err?.message,
  );
});
