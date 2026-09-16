import crypto from "crypto";
import { prisma } from "../db/client.js";
import { outboxService } from "../modules/events/outbox.service.js";
import { UserRole } from "@daih/types";

export interface RetentionCleanupSummary {
  expiredPasswordResetTokens: number;
  expiredVerificationTokens: number;
  expiredMfaOtpTokens: number;
  expiredSessions: number;
}

export interface AnonymizationSummary {
  anonymizedUsersCount: number;
  anonymizedUserIds: string[];
}

export class RetentionService {
  /**
   * Cleans up expired tokens and stale auth sessions.
   * Runs daily in background.
   */
  async purgeExpiredTokens(): Promise<RetentionCleanupSummary> {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // 1. Password reset tokens older than 7 days
    const resetRes = await prisma.passwordResetToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: sevenDaysAgo } },
          { usedAt: { lt: sevenDaysAgo } },
        ],
      },
    });

    // 2. Verification tokens older than 30 days
    const verifyRes = await prisma.verificationToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: thirtyDaysAgo } },
          { usedAt: { lt: thirtyDaysAgo } },
        ],
      },
    });

    // 3. MFA OTP tokens older than 24 hours
    const mfaRes = await prisma.mfaOtpToken.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: oneDayAgo } }, { usedAt: { lt: oneDayAgo } }],
      },
    });

    // 4. Stale/revoked sessions older than 30 days
    const sessionRes = await prisma.authSession.deleteMany({
      where: {
        OR: [
          { isRevoked: true, updatedAt: { lt: thirtyDaysAgo } },
          { expiresAt: { lt: thirtyDaysAgo } },
        ],
      },
    });

    const summary: RetentionCleanupSummary = {
      expiredPasswordResetTokens: resetRes.count,
      expiredVerificationTokens: verifyRes.count,
      expiredMfaOtpTokens: mfaRes.count,
      expiredSessions: sessionRes.count,
    };

    return summary;
  }

  /**
   * Anonymizes inactive customer accounts older than thresholdMonths (default 24 months).
   * Aligned with the Nigeria Data Protection Act (NDPA) 2023.
   *
   * Replaces personally identifiable info with unresolvable placeholders while
   * preserving financial records (Client ID, Bookings, Payments, Invoices) for statutory accounting.
   */
  async anonymizeInactiveCustomers(
    thresholdMonths = 24,
  ): Promise<AnonymizationSummary> {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - thresholdMonths);

    // Find CUSTOMER accounts with no activity since cutoffDate
    const inactiveCustomers = await prisma.user.findMany({
      where: {
        role: UserRole.CUSTOMER,
        skipAnonymization: false,
        createdAt: { lt: cutoffDate },
        // Not already anonymized
        email: { not: { endsWith: "@daih.anonymized" } },
        // No sessions used since cutoffDate
        sessions: {
          none: {
            lastUsedAt: { gte: cutoffDate },
          },
        },
        // No bookings created since cutoffDate
        bookings: {
          none: {
            createdAt: { gte: cutoffDate },
          },
        },
      },
      select: {
        id: true,
        email: true,
        clientId: true,
      },
      take: 100, // Batch limit to prevent blocking
    });

    const anonymizedUserIds: string[] = [];

    for (const customer of inactiveCustomers) {
      const anonHash = crypto
        .createHash("sha256")
        .update(customer.id)
        .digest("hex")
        .slice(0, 10);
      const anonymizedEmail = `anon_${anonHash}@daih.anonymized`;

      await prisma.$transaction(async (tx) => {
        // 1. Anonymize user record
        await tx.user.update({
          where: { id: customer.id },
          data: {
            firstName: "Anonymized",
            lastName: "Customer",
            email: anonymizedEmail,
            phoneNumber: null,
            passwordHash: null,
            avatarUrl: null,
            mfaSecret: null,
            mfaEnabled: false,
          },
        });

        // 2. Revoke and remove any old active session tokens
        await tx.authSession.deleteMany({
          where: { userId: customer.id },
        });

        // 3. Record in audit trail
        await tx.auditLog.create({
          data: {
            userId: customer.id,
            action: "USER_ANONYMIZED",
            entityType: "User",
            entityId: customer.id,
            metadata: {
              clientId: customer.clientId,
              retentionPolicyMonths: thresholdMonths,
              anonymizedAt: new Date().toISOString(),
            },
          },
        });

        // 4. Publish outbox event
        await outboxService.recordEvent(
          {
            eventType: "identity.user_anonymized",
            aggregateType: "User",
            aggregateId: customer.id,
            payload: {
              userId: customer.id,
              clientId: customer.clientId,
              anonymizedEmail,
            },
          },
          tx,
        );
      });

      anonymizedUserIds.push(customer.id);
    }

    return {
      anonymizedUsersCount: anonymizedUserIds.length,
      anonymizedUserIds,
    };
  }
}

export const retentionService = new RetentionService();
