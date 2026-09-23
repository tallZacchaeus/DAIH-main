import { OutboxEvent } from "@prisma/client";
import { enqueueNotification } from "../../notifications/notifications.queue.js";
import { notificationsService } from "../../notifications/notifications.service.js";
import { outboxService } from "../outbox.service.js";
import { campaignService } from "../../campaigns/campaign.service.js";

export async function handlePaymentEvents(event: OutboxEvent): Promise<void> {
  const payload = event.payload as any;

  await notificationsService.createFromOutboxEvent(event);

  switch (event.eventType) {
    case "payment.successful": {
      if (payload?.customerEmail) {
        await enqueueNotification(
          "payment.receipt",
          payload.customerEmail,
          payload.customerName || "Member",
          {
            bookingReference:
              payload.bookingReference || payload.reference || "N/A",
            resourceName: payload.resourceName || "Workspace",
            amount: Number(payload.amount) || 0,
            currency: payload.currency || "NGN",
            invoiceNumber: payload.invoiceNumber,
          },
        );
      }

      if (payload?.userId && payload?.bookingId && payload?.amount) {
        try {
          await campaignService.recordConversion(
            payload.userId,
            payload.bookingId,
            Number(payload.amount),
          );
        } catch (err: any) {
          console.warn(
            "[Campaign] Failed to attribute campaign conversion:",
            err?.message,
          );
        }
      }
      break;
    }

    case "payment.failed":
    case "payment.capacity_conflict": {
      break;
    }

    default:
      break;
  }
}

// Register payment event handlers with outbox dispatcher
outboxService.registerHandler("payment.successful", handlePaymentEvents);
outboxService.registerHandler("payment.failed", handlePaymentEvents);
outboxService.registerHandler("payment.capacity_conflict", handlePaymentEvents);
