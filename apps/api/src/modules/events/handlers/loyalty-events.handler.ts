import { OutboxEvent } from "@prisma/client";
import { coinService } from "../../loyalty/coin.service.js";
import { outboxService } from "../outbox.service.js";

export async function handleLoyaltyEvents(event: OutboxEvent): Promise<void> {
  const payload = event.payload as any;

  switch (event.eventType) {
    case "access.checked_in": {
      if (payload?.bookingId && !payload?.isReEntry) {
        try {
          await coinService.awardBookingCheckInEarn(payload.bookingId);
        } catch (err: any) {
          console.warn(
            "[Loyalty] Failed to award booking check-in coins:",
            err?.message,
          );
        }
        try {
          await coinService.awardReferralBonus(payload.bookingId);
        } catch (err: any) {
          console.warn(
            "[Loyalty] Failed to award referral bonus on check-in:",
            err?.message,
          );
        }
        if (payload?.userId) {
          try {
            await coinService.awardRefereeWelcomeReward(payload.userId);
          } catch (err: any) {
            console.warn(
              "[Loyalty] Failed to award referee welcome coins on check-in:",
              err?.message,
            );
          }
          try {
            await coinService.evaluateAndAwardStreakBonus(payload.userId);
          } catch (err: any) {
            console.warn(
              "[Loyalty] Failed to award streak bonus on check-in:",
              err?.message,
            );
          }
        }
      }
      break;
    }

    case "identity.oauth_registered":
    case "identity.customer_registered":
    case "identity.user_registered":
    case "identity.email_verified": {
      const userId = payload?.userId || event.aggregateId;
      if (userId) {
        try {
          await coinService.awardSignupBonus(userId);
        } catch (err: any) {
          console.warn("[Loyalty] Failed to award signup bonus:", err?.message);
        }
      }
      break;
    }

    case "booking.confirmed": {
      if (payload?.bookingId) {
        try {
          await coinService.burnHold(payload.bookingId);
        } catch (err: any) {
          console.warn(
            "[Loyalty] Failed to burn coin hold on booking confirmation:",
            err?.message,
          );
        }
      }
      break;
    }

    case "booking.cancelled":
    case "booking.expired": {
      if (payload?.bookingId) {
        try {
          await coinService.releaseHold(payload.bookingId);
        } catch (err: any) {
          console.warn("[Loyalty] Failed to release coin hold:", err?.message);
        }
      }
      break;
    }

    default:
      break;
  }
}

// Register with outbox dispatcher
outboxService.registerHandler("access.checked_in", handleLoyaltyEvents);
outboxService.registerHandler("identity.oauth_registered", handleLoyaltyEvents);
outboxService.registerHandler(
  "identity.customer_registered",
  handleLoyaltyEvents,
);
outboxService.registerHandler("identity.user_registered", handleLoyaltyEvents);
outboxService.registerHandler("identity.email_verified", handleLoyaltyEvents);
outboxService.registerHandler("booking.confirmed", handleLoyaltyEvents);
outboxService.registerHandler("booking.cancelled", handleLoyaltyEvents);
outboxService.registerHandler("booking.expired", handleLoyaltyEvents);
