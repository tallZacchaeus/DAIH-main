import "../config/observability.js";
import { Worker } from "bullmq";
import { redis } from "../config/redis.js";
import { outboxService } from "../modules/events/outbox.service.js";
import "../modules/events/handlers/identity-email.handler.js";
import "../modules/events/handlers/payment-events.handler.js";
import "../modules/events/handlers/access-events.handler.js";
import { notificationWorker } from "../modules/notifications/notification-dispatch.job.js";
import { bookingService } from "../modules/booking/booking.service.js";
import { bookingRepository } from "../modules/booking/booking.repository.js";

console.log("👷 DAIH Background Job Worker initializing...");

// Worker for booking hold expiry and notification dispatch
export const holdExpiryWorker = new Worker(
  "booking-holds",
  async (job) => {
    console.log(
      `Processing hold expiry job for booking: ${job.data.bookingId}`,
    );
    try {
      await bookingService.expireHold(job.data.bookingId);
      return { released: true, bookingId: job.data.bookingId };
    } catch (err: any) {
      console.warn(
        `Hold expiry job notice for '${job.data.bookingId}':`,
        err?.message,
      );
      return { released: false, error: err?.message };
    }
  },
  { connection: redis },
);

holdExpiryWorker.on("completed", (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

holdExpiryWorker.on("error", (err) => {
  console.warn("Hold expiry worker connection notice:", err.message);
});

// Outbox event polling with adaptive backoff
// - Starts at 3s, backs off up to 30s when idle, resets immediately when events are found
let isPollingOutbox = false;
let outboxPollIntervalMs = 3000;
const OUTBOX_MIN_INTERVAL = 3000;
const OUTBOX_MAX_INTERVAL = 30000;
const OUTBOX_BACKOFF_FACTOR = 1.5;

export async function runOutboxCycle() {
  if (isPollingOutbox) return;
  isPollingOutbox = true;
  try {
    const result = await outboxService.processPendingEvents(25);
    if (result.processed > 0 || result.failed > 0) {
      console.log(
        `📬 Outbox cycle: ${result.processed} processed, ${result.failed} failed`,
      );
      // Reset to fast polling when there's active work
      outboxPollIntervalMs = OUTBOX_MIN_INTERVAL;
    } else {
      // Back off gradually when idle to reduce unnecessary DB queries
      outboxPollIntervalMs = Math.min(
        outboxPollIntervalMs * OUTBOX_BACKOFF_FACTOR,
        OUTBOX_MAX_INTERVAL,
      );
    }
  } catch (err: any) {
    console.error("Outbox cycle error:", err?.message);
  } finally {
    isPollingOutbox = false;
    // Schedule next cycle with current (adaptive) interval
    setTimeout(runOutboxCycle, outboxPollIntervalMs);
  }
}

// Start first cycle immediately
setTimeout(runOutboxCycle, OUTBOX_MIN_INTERVAL);

// Periodic overdue hold sweeper loop (every 30 seconds)
let isSweepingHolds = false;
export async function runSweepOverdueHoldsCycle() {
  if (isSweepingHolds) return;
  isSweepingHolds = true;
  try {
    const expiredCount = await bookingRepository.sweepOverdueHolds();
    if (expiredCount > 0) {
      console.log(
        `⏰ Worker hold sweep: Expired ${expiredCount} overdue booking hold(s)`,
      );
    }
  } catch (err: any) {
    console.error("Worker hold sweep error:", err?.message);
  } finally {
    isSweepingHolds = false;
  }
}

const sweepInterval = setInterval(runSweepOverdueHoldsCycle, 30000);

// Periodic overdue booking sweeper loop (every 60 seconds)
let isSweepingBookings = false;
export async function runSweepOverdueBookingsCycle() {
  if (isSweepingBookings) return;
  isSweepingBookings = true;
  try {
    const { noShowCount, completedCount } =
      await bookingRepository.sweepOverdueBookings();
    if (noShowCount > 0 || completedCount > 0) {
      console.log(
        `🧹 Worker booking lifecycle sweep: ${noShowCount} marked as NO_SHOW, ${completedCount} marked as COMPLETED`,
      );
    }
  } catch (err: any) {
    console.error("Worker booking sweep error:", err?.message);
  } finally {
    isSweepingBookings = false;
  }
}

const sweepBookingsInterval = setInterval(runSweepOverdueBookingsCycle, 60000);

// ─── Data Retention & NDPA Anonymization Sweepers ────────────────────────────
import { retentionService } from "./retention.worker.js";

// Daily token cleanup (runs every 24 hours; first run 1 minute after start)
let isPurgingTokens = false;
export async function runRetentionPurgeCycle() {
  if (isPurgingTokens) return;
  isPurgingTokens = true;
  try {
    const summary = await retentionService.purgeExpiredTokens();
    const totalPurged =
      summary.expiredPasswordResetTokens +
      summary.expiredVerificationTokens +
      summary.expiredMfaOtpTokens +
      summary.expiredSessions;
    if (totalPurged > 0) {
      console.log(
        `🗑️ Retention worker: Purged ${totalPurged} expired tokens/sessions (Reset: ${summary.expiredPasswordResetTokens}, Verify: ${summary.expiredVerificationTokens}, MFA: ${summary.expiredMfaOtpTokens}, Sessions: ${summary.expiredSessions})`,
      );
    }
  } catch (err: any) {
    console.error("Retention purge error:", err?.message);
  } finally {
    isPurgingTokens = false;
  }
}

// Initial purge run after worker startup
setTimeout(runRetentionPurgeCycle, 60000);
const retentionInterval = setInterval(
  runRetentionPurgeCycle,
  24 * 60 * 60 * 1000,
);

// Weekly inactive customer anonymization (runs every 7 days)
let isAnonymizing = false;
export async function runAnonymizationCycle() {
  if (isAnonymizing) return;
  isAnonymizing = true;
  try {
    const result = await retentionService.anonymizeInactiveCustomers(24);
    if (result.anonymizedUsersCount > 0) {
      console.log(
        `🛡️ NDPA Anonymization worker: Anonymized ${result.anonymizedUsersCount} dormant customer account(s)`,
      );
    }
  } catch (err: any) {
    console.error("Anonymization worker error:", err?.message);
  } finally {
    isAnonymizing = false;
  }
}

// Initial anonymization run 2 minutes after startup
setTimeout(runAnonymizationCycle, 120000);
const anonymizationInterval = setInterval(
  runAnonymizationCycle,
  7 * 24 * 60 * 60 * 1000,
);

process.on("SIGTERM", async () => {
  console.log("Stopping worker gracefully...");
  clearInterval(sweepInterval);
  clearInterval(sweepBookingsInterval);
  clearInterval(retentionInterval);
  clearInterval(anonymizationInterval);
  await holdExpiryWorker.close();
  await notificationWorker.close();
});
