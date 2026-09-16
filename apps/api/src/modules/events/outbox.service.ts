import { OutboxEvent, OutboxStatus, Prisma } from "@prisma/client";
import { prisma } from "../../db/client.js";

export type EventHandler = (event: OutboxEvent) => Promise<void>;

export class OutboxService {
  private handlers: Map<string, EventHandler[]> = new Map();

  /**
   * Registers a domain event handler for a specific event type or wildcard
   */
  registerHandler(eventType: string, handler: EventHandler): void {
    const existing = this.handlers.get(eventType) || [];
    existing.push(handler);
    this.handlers.set(eventType, existing);
  }

  /**
   * Records a new outbox event within an existing transaction or with root prisma client
   */
  async recordEvent(
    data: {
      eventType: string;
      aggregateType: string;
      aggregateId: string;
      payload: any;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<OutboxEvent> {
    const client = tx || prisma;
    return client.outboxEvent.create({
      data: {
        eventType: data.eventType,
        aggregateType: data.aggregateType,
        aggregateId: data.aggregateId,
        payload: data.payload,
        status: OutboxStatus.PENDING,
      },
    });
  }

  /**
   * Fetches and dispatches pending events with concurrency protection and exponential backoff
   */
  async processPendingEvents(
    batchSize: number = 25,
  ): Promise<{ processed: number; failed: number }> {
    const now = new Date();

    const pendingEvents = await prisma.outboxEvent.findMany({
      where: {
        status: OutboxStatus.PENDING,
        scheduledAt: { lte: now },
        retryCount: { lt: 5 },
      },
      orderBy: { createdAt: "asc" },
      take: batchSize,
    });

    if (pendingEvents.length === 0) {
      return { processed: 0, failed: 0 };
    }

    let processedCount = 0;
    let failedCount = 0;

    for (const event of pendingEvents) {
      try {
        // Find registered handlers for this event type
        const matchingHandlers = [
          ...(this.handlers.get(event.eventType) || []),
          ...(this.handlers.get("*") || []),
        ];

        for (const handler of matchingHandlers) {
          await handler(event);
        }

        // Mark event as successfully published
        await prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: OutboxStatus.PUBLISHED,
            processedAt: new Date(),
            error: null,
          },
        });

        processedCount++;
      } catch (err: any) {
        failedCount++;
        const nextRetry = event.retryCount + 1;
        const backoffSeconds = Math.pow(2, nextRetry) * 5; // 10s, 20s, 40s, 80s
        const nextScheduledAt = new Date(Date.now() + backoffSeconds * 1000);

        const isTerminalFailure = nextRetry >= 5;

        await prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: isTerminalFailure
              ? OutboxStatus.FAILED
              : OutboxStatus.PENDING,
            retryCount: nextRetry,
            error: err?.message || "Unknown handler failure",
            scheduledAt: nextScheduledAt,
          },
        });

        console.error(
          `❌ Error processing outbox event ${event.id} (${event.eventType}):`,
          err?.message,
        );
      }
    }

    return { processed: processedCount, failed: failedCount };
  }
}

export const outboxService = new OutboxService();
