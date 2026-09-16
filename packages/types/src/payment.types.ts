export enum PaymentStatus {
  PENDING = "PENDING",
  SUCCESSFUL = "SUCCESSFUL",
  FAILED = "FAILED",
  REFUNDED = "REFUNDED",
  PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED",
}

export enum PaymentMethod {
  PAYSTACK = "PAYSTACK",
  SUBSCRIPTION_CREDIT = "SUBSCRIPTION_CREDIT",
  BANK_TRANSFER = "BANK_TRANSFER",
  POS_TERMINAL = "POS_TERMINAL",
}

export enum TransactionType {
  PAYMENT = "PAYMENT",
  REFUND = "REFUND",
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface InvoiceDTO {
  id: string;
  invoiceNumber: string;
  transactionId: string;
  bookingId: string;
  userId: string;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  lineItems: InvoiceLineItem[];
  issuedAt: string;
  customerName: string;
  customerEmail: string;
  customerClientId: string;
  resourceName: string;
  bookingReference: string;
  createdAt: string;
}

export interface PaymentTransaction {
  id: string;
  reference: string;
  bookingId: string;
  userId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method: PaymentMethod;
  paystackReference?: string | null;
  paystackChannel?: string | null;
  gatewayResponse?: any;
  webhookEventId?: string | null;
  webhookReceivedAt?: string | null;
  paidAt?: string | null;
  failedAt?: string | null;
  refundedAt?: string | null;
  refundAmount?: number | null;
  refundReason?: string | null;
  refundedBy?: string | null;
  createdAt: string;
  updatedAt: string;
  booking?: {
    id: string;
    reference: string;
    resourceName?: string;
    startTime: string;
    endTime: string;
    state: string;
  };
  invoice?: InvoiceDTO | null;
}

export interface PaystackInitializeResponse {
  authorization_url: string;
  access_code: string;
  reference: string;
  transactionId?: string;
}

export interface PaystackWebhookPayload {
  event: string;
  data: {
    id: number;
    domain?: string;
    status: string;
    reference: string;
    amount: number; // in kobo
    message?: string | null;
    gateway_response?: string | null;
    paid_at?: string | null;
    created_at?: string | null;
    channel?: string | null;
    currency: string;
    ip_address?: string | null;
    metadata?: any;
    log?: any;
    fees?: number | null;
    customer: {
      id?: number;
      first_name?: string | null;
      last_name?: string | null;
      email: string;
      customer_code?: string;
      phone?: string | null;
      metadata?: any;
      risk_action?: string;
    };
    authorization?: {
      authorization_code?: string;
      bin?: string;
      last4?: string;
      exp_month?: string;
      exp_year?: string;
      card_type?: string;
      bank?: string;
      country_code?: string;
      brand?: string;
      account_name?: string;
    } | null;
    plan?: any;
  };
}

export interface RefundRequestDTO {
  amount?: number;
  reason: string;
}

export interface ReconciliationDiscrepancy {
  transactionId: string;
  reference: string;
  type:
    | "AMOUNT_MISMATCH"
    | "STATUS_MISMATCH"
    | "ORPHAN_LOCAL"
    | "ORPHAN_GATEWAY"
    | "CAPACITY_CONFLICT";
  localStatus?: PaymentStatus;
  gatewayStatus?: string;
  localAmount?: number;
  gatewayAmount?: number;
  details?: string;
}

export interface ReconciliationSummary {
  period: {
    startDate: string;
    endDate: string;
  };
  totalLocalTransactions: number;
  matchedCount: number;
  discrepancyCount: number;
  totalCollected: number;
  totalRefunded: number;
  netRevenue: number;
  currency: string;
  discrepancies: ReconciliationDiscrepancy[];
}

export interface DailyPaymentSummary {
  date: string;
  totalTransactions: number;
  successfulCount: number;
  successfulAmount: number;
  failedCount: number;
  failedAmount: number;
  refundedCount: number;
  refundedAmount: number;
  pendingCount: number;
  pendingAmount: number;
  netRevenue: number;
  currency: string;
}
