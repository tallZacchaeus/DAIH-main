import { OutboxEvent } from "@prisma/client";
import { emailService } from "../../email/email.service.js";
import { notificationsService } from "../../notifications/notifications.service.js";
import { outboxService } from "../outbox.service.js";

export async function handlePaymentEvents(event: OutboxEvent): Promise<void> {
  const payload = event.payload as any;

  await notificationsService.createFromOutboxEvent(event);

  switch (event.eventType) {
    case "payment.successful": {
      if (payload?.customerEmail) {
        await emailService.sendPaymentReceiptEmail(
          payload.customerEmail,
          payload.customerName || "Member",
          payload.bookingReference || "N/A",
          payload.resourceName || "Workspace",
          Number(payload.amount) || 0,
          payload.currency || "NGN",
          payload.invoiceNumber,
        );
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
