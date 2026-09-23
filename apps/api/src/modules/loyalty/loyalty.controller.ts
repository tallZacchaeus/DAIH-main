import { Response, NextFunction } from "express";
import { AuthRequest } from "../../middleware/auth.middleware.js";
import { loyaltyService, LoyaltyService } from "./loyalty.service.js";

export class LoyaltyController {
  constructor(private service: LoyaltyService = loyaltyService) {}

  getMyWallet = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const wallet = await this.service.getWallet(req.user!.id);
      res.json({ success: true, data: wallet });
    } catch (err) {
      next(err);
    }
  };

  getMyHistory = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 20;
      const type = req.query.type ? String(req.query.type) : undefined;

      const ledger = await this.service.getLedger(req.user!.id, {
        page,
        limit,
        type,
      });
      res.json({ success: true, data: ledger });
    } catch (err) {
      next(err);
    }
  };

  previewRedemption = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const result = await this.service.previewRedemption(
        req.user!.id,
        req.body,
      );
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  applyRedemption = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { bookingId, coinsToRedeem } = req.body;
      const result = await this.service.applyBookingRedemptionHold(
        bookingId,
        req.user!.id,
        Number(coinsToRedeem),
      );
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  getSettings = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const settings = await this.service.getSettings();
      res.json({ success: true, data: settings });
    } catch (err) {
      next(err);
    }
  };

  updateSettings = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const updated = await this.service.updateSettings(req.body, req.user!.id);
      res.json({
        success: true,
        data: updated,
        message: "Loyalty program settings successfully updated",
      });
    } catch (err) {
      next(err);
    }
  };

  getSettingsHistory = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const history = await this.service.getSettingsAuditHistory();
      res.json({ success: true, data: history });
    } catch (err) {
      next(err);
    }
  };

  getAdminStats = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const stats = await this.service.getAdminStats();
      res.json({ success: true, data: stats });
    } catch (err) {
      next(err);
    }
  };

  getAdminGlobalLedger = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 20;
      const type = req.query.type ? String(req.query.type) : undefined;
      const search = req.query.search ? String(req.query.search) : undefined;

      const ledger = await this.service.getAdminGlobalLedger({
        page,
        limit,
        type,
        search,
      });
      res.json({ success: true, data: ledger });
    } catch (err) {
      next(err);
    }
  };

  getCustomerLoyalty = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const customerId = Array.isArray(req.params.customerId)
        ? req.params.customerId[0]
        : String(req.params.customerId);
      const [wallet, ledger] = await Promise.all([
        this.service.getWallet(customerId),
        this.service.getLedger(customerId, { page: 1, limit: 50 }),
      ]);
      res.json({
        success: true,
        data: {
          wallet,
          ledger: ledger.items,
        },
      });
    } catch (err) {
      next(err);
    }
  };

  adminAdjust = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const clientIp = req.ip || req.socket.remoteAddress || undefined;
      const result = await this.service.adminAdjust(
        req.user!.id,
        req.body,
        clientIp,
      );
      res.json({
        success: true,
        data: result,
        message: "Loyalty coin balance adjustment successfully executed",
      });
    } catch (err) {
      next(err);
    }
  };
}

export const loyaltyController = new LoyaltyController();
