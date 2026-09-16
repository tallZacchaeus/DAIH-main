import { OutboxEvent } from "@prisma/client";
import { enqueueNotification } from "../../notifications/notifications.queue.js";
import { notificationsService } from "../../notifications/notifications.service.js";
import { outboxService } from "../outbox.service.js";
import { prisma } from "../../../db/client.js";

export async function handleAccessAndBookingEvents(
  event: OutboxEvent,
): Promise<void> {
  const payload = event.payload as any;

  await notificationsService.createFromOutboxEvent(event);

  switch (event.eventType) {
    case "access.checked_in": {
      if (payload?.customerEmail) {
        // Enqueue welcome email with Wi-Fi details via BullMQ notification engine
        await enqueueNotification(
          "access.checked_in",
          payload.customerEmail,
          payload.customerName || "Member",
          payload,
        );
      }
      break;
    }

    case "access.checked_out": {
      if (payload?.customerEmail) {
        await enqueueNotification(
          "access.checked_out",
          payload.customerEmail,
          payload.customerName || "Member",
          payload,
        );
      }
      break;
    }

    case "booking.confirmed": {
      if (payload?.bookingId) {
        const booking = await prisma.booking.findUnique({
          where: { id: payload.bookingId },
          include: { user: true, resource: true },
        });

        if (booking?.user?.email) {
          const customerName =
            `${booking.user.firstName || ""} ${booking.user.lastName || ""}`.trim() ||
            booking.user.email;
          await enqueueNotification(
            "booking.confirmed",
            booking.user.email,
            customerName,
            {
              reference: booking.reference,
              resourceName: booking.resource?.name || "Workspace",
              startTime: booking.startTime.toISOString(),
              endTime: booking.endTime.toISOString(),
              qrToken: booking.qrToken,
            },
          );
        }
      }
      break;
    }

    case "booking.rescheduled": {
      if (payload?.bookingId) {
        const booking = await prisma.booking.findUnique({
          where: { id: payload.bookingId },
          include: { user: true, resource: true },
        });

        if (booking?.user?.email) {
          const customerName =
            `${booking.user.firstName || ""} ${booking.user.lastName || ""}`.trim() ||
            booking.user.email;
          await enqueueNotification(
            "booking.rescheduled",
            booking.user.email,
            customerName,
            {
              reference: booking.reference,
              resourceName: booking.resource?.name || "Workspace",
              startTime: booking.startTime.toISOString(),
              endTime: booking.endTime.toISOString(),
              qrToken: booking.qrToken,
            },
          );
        }
      }
      break;
    }

    case "booking.cancelled": {
      if (payload?.customerEmail) {
        await enqueueNotification(
          "booking.cancelled",
          payload.customerEmail,
          payload.customerName || "Member",
          payload,
        );
      }
      break;
    }

    default:
      break;
  }
}

// Register access and booking event handlers with outbox dispatcher
outboxService.registerHandler(
  "access.checked_in",
  handleAccessAndBookingEvents,
);
outboxService.registerHandler(
  "access.checked_out",
  handleAccessAndBookingEvents,
);
outboxService.registerHandler(
  "booking.confirmed",
  handleAccessAndBookingEvents,
);
outboxService.registerHandler(
  "booking.rescheduled",
  handleAccessAndBookingEvents,
);
outboxService.registerHandler(
  "booking.cancelled",
  handleAccessAndBookingEvents,
);
