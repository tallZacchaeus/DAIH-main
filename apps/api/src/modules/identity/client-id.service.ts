import { PrismaClient, Prisma } from "@prisma/client";
import { prisma as defaultPrisma } from "../../db/client.js";

export class ClientIdService {
  /**
   * Generates the next sequential Client ID for the given year (defaults to current UTC year).
   * Format: DAIH-YYYY-000001
   */
  async generateNextClientId(
    tx: Prisma.TransactionClient | PrismaClient = defaultPrisma,
    year: number = new Date().getUTCFullYear(),
  ): Promise<string> {
    const sequenceRecord = await tx.clientIdSequence.upsert({
      where: { year },
      create: { year, nextSequence: 2 },
      update: { nextSequence: { increment: 1 } },
    });

    // The current allocated number was (nextSequence - 1)
    const currentNumber = sequenceRecord.nextSequence - 1;
    const padded = String(currentNumber).padStart(6, "0");
    return `DAIH-${year}-${padded}`;
  }
}

export const clientIdService = new ClientIdService();
