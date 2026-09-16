import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "../../middleware/auth.middleware.js";
import { paymentsService, PaymentsService } from "./payments.service.js";
import { invoiceService, InvoiceService } from "./invoice.service.js";

export class PaymentsController {
  constructor(
    private service: PaymentsService = paymentsService,
    private invoices: InvoiceService = invoiceService,
  ) {}

  /**
   * POST /api/v1/payments/initialize/:bookingId
   * Initialize a Paystack hosted checkout session
   */
  initialize = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const bookingId = req.params.bookingId as string;
      const { callbackUrl } = req.body || {};
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      const result = await this.service.initializePayment(
        bookingId,
        userId,
        callbackUrl,
      );
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/v1/payments/webhook
   * Paystack webhook endpoint (HMAC signature verified)
   */
  webhook = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const event = (req as any).paystackEvent || req.body;
      const result = await this.service.handleWebhookEvent(event);
      // Webhooks must always return 200 OK
      res.status(200).json({ ...result, received: true });
    } catch (err: any) {
      console.error("❌ Unhandled webhook error:", err.message);
      // Return 200 to acknowledge receipt and avoid unbounded gateway retry spam
      res.status(200).json({ received: true, error: err.message });
    }
  };

  /**
   * GET /api/v1/payments/history
   * Customer's personal payment history
   */
  getHistory = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 20;

      const result = await this.service.getPaymentHistory(userId, {
        page,
        limit,
      });
      res.status(200).json({
        success: true,
        data: result.transactions,
        total: result.total,
        page: result.page,
        limit: result.limit,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/v1/payments/:transactionId
   * Retrieve single transaction details
   */
  getTransaction = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const transactionId = req.params.transactionId as string;
      const userId = req.user?.id;
      const role = req.user?.role;

      const isStaff =
        role &&
        ["FINANCE_OFFICER", "SUPER_ADMIN", "OPERATIONS_ADMIN"].includes(role);
      const result = await this.service.verifyPayment(
        transactionId,
        isStaff ? undefined : userId,
      );

      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/v1/payments/:transactionId/verify
   * Poll or trigger payment verification
   */
  verifyPayment = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const transactionId = req.params.transactionId as string;
      const userId = req.user?.id;
      const role = req.user?.role;

      const isStaff =
        role &&
        ["FINANCE_OFFICER", "SUPER_ADMIN", "OPERATIONS_ADMIN"].includes(role);
      const result = await this.service.verifyPayment(
        transactionId,
        isStaff ? undefined : userId,
      );

      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/v1/payments/:transactionId/invoice
   * Download or fetch structured invoice / receipt
   */
  getInvoice = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const transactionId = req.params.transactionId as string;
      const userId = req.user?.id;
      const role = req.user?.role;

      const isStaff =
        role &&
        ["FINANCE_OFFICER", "SUPER_ADMIN", "OPERATIONS_ADMIN"].includes(role);
      const invoice = await this.invoices.getInvoice(
        transactionId,
        isStaff ? undefined : userId,
      );

      if (!invoice) {
        return res.status(404).json({
          success: false,
          code: "INVOICE_NOT_FOUND",
          message: "Invoice not found for this transaction",
        });
      }

      res.status(200).json({ success: true, data: invoice });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/v1/payments/admin/transactions
   * Finance Officer / Admin list all transactions with filters
   */
  getAdminTransactions = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const filters = req.query as any;
      const result = await this.service.getAdminTransactions(filters);
      res.status(200).json({
        success: true,
        data: result.transactions,
        total: result.total,
        page: result.page,
        limit: result.limit,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/v1/payments/admin/reconciliation
   * Finance Officer reconciliation overview
   */
  getReconciliation = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { startDate, endDate } = req.query as {
        startDate?: string;
        endDate?: string;
      };
      const result = await this.service.getReconciliationView(
        startDate,
        endDate,
      );
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/v1/payments/admin/daily-summary
   * Daily payment breakdown for Finance
   */
  getDailySummary = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { date } = req.query as { date?: string };
      const result = await this.service.getDailySummary(date);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };
}

export const paymentsController = new PaymentsController();
