import { Request, Response, NextFunction } from "express";
import { supportService } from "./support.service.js";

export class SupportController {
  async getSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await supportService.getSettings();
      res.status(200).json({
        success: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const data = await supportService.updateSettings(req.body, userId);
      res.status(200).json({
        success: true,
        data,
        message: "Support settings and FAQs updated successfully",
      });
    } catch (err) {
      next(err);
    }
  }
}

export const supportController = new SupportController();
