import { prisma } from "../../db/client.js";
import { Prisma } from "@prisma/client";
import { InvoiceDTO, InvoiceLineItem } from "@daih/types";

export class InvoiceService {
  /**
   * Generates next sequential invoice number e.g. DAIH-INV-2026-000001
   */
  async generateNextInvoiceNumber(
    tx?: Prisma.TransactionClient,
  ): Promise<string> {
    const client = tx || prisma;
    const year = new Date().getFullYear();

    const seq = await client.invoiceSequence.upsert({
      where: { year },
      create: { year, nextSequence: 2 },
      update: { nextSequence: { increment: 1 } },
    });

    // The sequence returned by update is the new value, so the allocated number is seq.nextSequence - 1
    const allocated = seq.nextSequence - 1;
    const padded = String(allocated).padStart(6, "0");
    return `DAIH-INV-${year}-${padded}`;
  }

  /**
   * Generates and stores an invoice for a successful payment transaction
   */
  async createInvoiceForTransaction(
    tx: Prisma.TransactionClient,
    data: {
      transactionId: string;
      bookingId: string;
      userId: string;
      customerName: string;
      customerEmail: string;
      customerClientId: string;
      resourceName: string;
      bookingReference: string;
      amount: number;
      currency?: string;
      lineItems?: InvoiceLineItem[];
    },
  ): Promise<InvoiceDTO> {
    const existing = await tx.invoice.findFirst({
      where: {
        OR: [
          { transactionId: data.transactionId },
          { bookingId: data.bookingId },
        ],
      },
    });
    if (existing) {
      return this.formatInvoice(existing);
    }

    const invoiceNumber = await this.generateNextInvoiceNumber(tx);
    const currency = data.currency || "NGN";

    const booking = await tx.booking.findUnique({
      where: { id: data.bookingId },
      select: {
        originalAmount: true,
        discountAmount: true,
        discountCode: true,
      },
    });

    const basePrice = booking?.originalAmount
      ? Number(booking.originalAmount)
      : data.amount;
    const discountAmount = booking?.discountAmount
      ? Number(booking.discountAmount)
      : 0;
    const netTaxable = Math.max(0, basePrice - discountAmount);

    const defaultLineItems: InvoiceLineItem[] = [
      {
        description: `Workspace Reservation: ${data.resourceName} (${data.bookingReference})`,
        quantity: 1,
        unitPrice: basePrice,
        amount: basePrice,
      },
    ];

    if (discountAmount > 0) {
      const discountLabel = booking?.discountCode
        ? `Discount (${booking.discountCode})`
        : "Staff Courtesy Override";
      defaultLineItems.push({
        description: `${discountLabel} - Pre-tax deduction`,
        quantity: 1,
        unitPrice: -discountAmount,
        amount: -discountAmount,
      });
    }

    const lineItems =
      data.lineItems && data.lineItems.length > 0
        ? data.lineItems
        : defaultLineItems;

    const created = await tx.invoice.create({
      data: {
        invoiceNumber,
        transactionId: data.transactionId,
        bookingId: data.bookingId,
        userId: data.userId,
        subtotal: netTaxable,
        tax: 0,
        total: data.amount,
        currency,
        lineItems: lineItems as any,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerClientId: data.customerClientId,
        resourceName: data.resourceName,
        bookingReference: data.bookingReference,
      },
    });

    return this.formatInvoice(created);
  }

  /**
   * Flexible invoice resolver by transaction ID, booking ID, booking reference, or invoice number.
   * If an invoice does not exist yet for a valid booking/transaction, it is generated on the fly.
   */
  async getInvoice(
    identifier: string,
    userId?: string,
  ): Promise<InvoiceDTO | null> {
    // 1. Search existing invoice by ID, transactionId, bookingId, bookingReference, or invoiceNumber
    const invoice = await prisma.invoice.findFirst({
      where: {
        OR: [
          { id: identifier },
          { transactionId: identifier },
          { bookingId: identifier },
          { bookingReference: identifier },
          { invoiceNumber: identifier },
        ],
        ...(userId ? { userId } : {}),
      },
    });

    if (invoice) {
      return this.formatInvoice(invoice);
    }

    // 2. If no invoice record is saved yet, look for a matching Transaction
    const transaction = await prisma.transaction.findFirst({
      where: {
        OR: [
          { id: identifier },
          { reference: identifier },
          { paystackReference: identifier },
          { bookingId: identifier },
        ],
        ...(userId ? { userId } : {}),
      },
      include: {
        booking: {
          include: {
            resource: true,
          },
        },
        user: true,
      },
    });

    if (transaction && transaction.booking && transaction.user) {
      const customerName =
        `${transaction.user.firstName} ${transaction.user.lastName}`.trim();
      const newInvoice = await this.createInvoiceForTransaction(prisma, {
        transactionId: transaction.id,
        bookingId: transaction.booking.id,
        userId: transaction.userId,
        customerName: customerName || "DAIH Member",
        customerEmail: transaction.user.email,
        customerClientId: transaction.user.clientId || "DAIH-MEMBER",
        resourceName:
          transaction.booking.resource?.name || "Workspace Resource",
        bookingReference: transaction.booking.reference,
        amount: Number(transaction.amount),
        currency: transaction.currency || "NGN",
      });
      return newInvoice;
    }

    // 3. If no transaction matches directly, look for a matching Booking
    const booking = await prisma.booking.findFirst({
      where: {
        OR: [{ id: identifier }, { reference: identifier }],
        ...(userId ? { userId } : {}),
      },
      include: {
        resource: true,
        user: true,
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (booking && booking.user && booking.resource) {
      // Find or create transaction record for this booking
      let transactionId = booking.transactions?.[0]?.id;
      if (!transactionId) {
        const dummyTx = await prisma.transaction.create({
          data: {
            bookingId: booking.id,
            userId: booking.userId,
            reference: `TRX-${booking.reference}`,
            amount: booking.totalAmount,
            currency: booking.currency || "NGN",
            status: "SUCCESSFUL" as any,
            paidAt: booking.createdAt,
          },
        });
        transactionId = dummyTx.id;
      }

      const customerName =
        `${booking.user.firstName} ${booking.user.lastName}`.trim();
      const newInvoice = await this.createInvoiceForTransaction(prisma, {
        transactionId,
        bookingId: booking.id,
        userId: booking.userId,
        customerName: customerName || "DAIH Member",
        customerEmail: booking.user.email,
        customerClientId: booking.user.clientId || "DAIH-MEMBER",
        resourceName: booking.resource.name,
        bookingReference: booking.reference,
        amount: Number(booking.totalAmount),
        currency: booking.currency || "NGN",
      });
      return newInvoice;
    }

    return null;
  }

  /**
   * Find invoice by unique ID
   */
  async getInvoiceById(
    invoiceId: string,
    userId?: string,
  ): Promise<InvoiceDTO | null> {
    return this.getInvoice(invoiceId, userId);
  }

  /**
   * Find invoice by transaction ID
   */
  async getInvoiceByTransactionId(
    transactionId: string,
    userId?: string,
  ): Promise<InvoiceDTO | null> {
    return this.getInvoice(transactionId, userId);
  }

  /**
   * Find all invoices for a user
   */
  async getInvoicesByUserId(userId: string): Promise<InvoiceDTO[]> {
    const list = await prisma.invoice.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return list.map((inv) => this.formatInvoice(inv));
  }

  private formatInvoice(inv: any): InvoiceDTO {
    return {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      transactionId: inv.transactionId,
      bookingId: inv.bookingId,
      userId: inv.userId,
      subtotal: Number(inv.subtotal),
      tax: Number(inv.tax),
      total: Number(inv.total),
      currency: inv.currency,
      lineItems: Array.isArray(inv.lineItems) ? inv.lineItems : [],
      issuedAt:
        inv.issuedAt instanceof Date
          ? inv.issuedAt.toISOString()
          : inv.issuedAt,
      customerName: inv.customerName,
      customerEmail: inv.customerEmail,
      customerClientId: inv.customerClientId,
      resourceName: inv.resourceName,
      bookingReference: inv.bookingReference,
      createdAt:
        inv.createdAt instanceof Date
          ? inv.createdAt.toISOString()
          : inv.createdAt,
    };
  }
}

export const invoiceService = new InvoiceService();
