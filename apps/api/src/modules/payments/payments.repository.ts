import { prisma } from "../../db/client.js";
import { PaymentStatus, PaymentMethod, Prisma } from "@prisma/client";

export class PaymentsRepository {
  /**
   * Create a new transaction record
   */
  async createTransaction(
    tx: Prisma.TransactionClient | typeof prisma,
    data: {
      reference: string;
      bookingId: string;
      userId: string;
      amount: number | Prisma.Decimal;
      currency?: string;
      method?: PaymentMethod;
      status?: PaymentStatus;
      paystackReference?: string;
    },
  ) {
    return tx.transaction.create({
      data: {
        reference: data.reference,
        bookingId: data.bookingId,
        userId: data.userId,
        amount: data.amount,
        currency: data.currency || "NGN",
        method: data.method || PaymentMethod.PAYSTACK,
        status: data.status || PaymentStatus.PENDING,
        paystackReference: data.paystackReference || data.reference,
      },
      include: {
        booking: {
          include: {
            resource: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            clientId: true,
            phoneNumber: true,
          },
        },
      },
    });
  }

  /**
   * Find transaction by internal reference
   */
  async findByReference(
    reference: string,
    tx: Prisma.TransactionClient | typeof prisma = prisma,
  ) {
    return tx.transaction.findUnique({
      where: { reference },
      include: {
        booking: {
          include: {
            resource: true,
          },
        },
        user: true,
        invoice: true,
      },
    });
  }

  /**
   * Find transaction by Paystack reference
   */
  async findByPaystackReference(
    paystackReference: string,
    tx: Prisma.TransactionClient | typeof prisma = prisma,
  ) {
    return tx.transaction.findFirst({
      where: {
        OR: [{ paystackReference }, { reference: paystackReference }],
      },
      include: {
        booking: {
          include: {
            resource: true,
            user: true,
          },
        },
        user: true,
        invoice: true,
      },
    });
  }

  /**
   * Find transaction by Paystack Webhook Event ID (for idempotency checking)
   */
  async findByWebhookEventId(
    webhookEventId: string,
    tx: Prisma.TransactionClient | typeof prisma = prisma,
  ) {
    return tx.transaction.findUnique({
      where: { webhookEventId },
      include: {
        booking: true,
        invoice: true,
      },
    });
  }

  /**
   * Find transaction by ID
   */
  async findById(
    id: string,
    tx: Prisma.TransactionClient | typeof prisma = prisma,
  ) {
    return tx.transaction.findUnique({
      where: { id },
      include: {
        booking: {
          include: {
            resource: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            clientId: true,
            phoneNumber: true,
          },
        },
        invoice: true,
      },
    });
  }

  /**
   * Find pending transaction for a booking
   */
  async findPendingByBookingId(
    bookingId: string,
    tx: Prisma.TransactionClient | typeof prisma = prisma,
  ) {
    return tx.transaction.findFirst({
      where: {
        bookingId,
        status: PaymentStatus.PENDING,
      },
      orderBy: { createdAt: "desc" },
      include: {
        booking: true,
      },
    });
  }

  /**
   * Find all transactions for a user
   */
  async findByUserId(
    userId: string,
    options?: { page?: number; limit?: number },
  ) {
    const page = Math.max(1, options?.page || 1);
    const limit = Math.max(1, Math.min(100, options?.limit || 20));
    const skip = (page - 1) * limit;

    const [total, transactions] = await prisma.$transaction([
      prisma.transaction.count({ where: { userId } }),
      prisma.transaction.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          booking: {
            include: {
              resource: true,
            },
          },
          invoice: true,
        },
      }),
    ]);

    return { total, transactions, page, limit };
  }

  /**
   * Find all transactions for Admin / Finance view with filters
   */
  async findAllAdminTransactions(filters: {
    status?: PaymentStatus;
    method?: PaymentMethod;
    search?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.max(1, Math.min(1000, filters.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.TransactionWhereInput = {
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.method ? { method: filters.method } : {}),
      ...(filters.startDate || filters.endDate
        ? {
            createdAt: {
              ...(filters.startDate ? { gte: filters.startDate } : {}),
              ...(filters.endDate ? { lte: filters.endDate } : {}),
            },
          }
        : {}),
      ...(filters.search
        ? {
            OR: [
              { reference: { contains: filters.search, mode: "insensitive" } },
              {
                paystackReference: {
                  contains: filters.search,
                  mode: "insensitive",
                },
              },
              {
                user: {
                  email: { contains: filters.search, mode: "insensitive" },
                },
              },
              {
                user: {
                  firstName: { contains: filters.search, mode: "insensitive" },
                },
              },
              {
                user: {
                  lastName: { contains: filters.search, mode: "insensitive" },
                },
              },
            ],
          }
        : {}),
    };

    const [total, transactions] = await prisma.$transaction([
      prisma.transaction.count({ where }),
      prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          booking: {
            include: {
              resource: true,
            },
          },
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              clientId: true,
              phoneNumber: true,
            },
          },
          invoice: true,
        },
      }),
    ]);

    return { total, transactions, page, limit };
  }

  /**
   * Update transaction status and metadata
   */
  async updateTransaction(
    tx: Prisma.TransactionClient | typeof prisma,
    id: string,
    data: {
      status?: PaymentStatus;
      paystackChannel?: string | null;
      gatewayResponse?: any;
      webhookEventId?: string | null;
      webhookReceivedAt?: Date | null;
      paidAt?: Date | null;
      failedAt?: Date | null;
      refundedAt?: Date | null;
      refundAmount?: number | Prisma.Decimal | null;
      refundReason?: string | null;
      refundedBy?: string | null;
    },
  ) {
    return tx.transaction.update({
      where: { id },
      data,
      include: {
        booking: {
          include: {
            resource: true,
          },
        },
        user: true,
        invoice: true,
      },
    });
  }
}

export const paymentsRepository = new PaymentsRepository();
