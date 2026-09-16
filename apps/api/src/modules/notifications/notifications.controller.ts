import { Response, NextFunction } from "express";
import { AuthRequest } from "../../middleware/auth.middleware.js";
import { notificationsService } from "./notifications.service.js";

export class NotificationsController {
  list = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const cursor = req.query.cursor ? String(req.query.cursor) : undefined;
      const data = await notificationsService.listForUser(userId, {
        limit,
        cursor,
      });

      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  unreadCount = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const unreadCount = await notificationsService.getUnreadCount(
        req.user!.id,
      );
      res.status(200).json({ success: true, data: { unreadCount } });
    } catch (err) {
      next(err);
    }
  };

  markRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await notificationsService.markRead(
        req.user!.id,
        String(req.params.id),
      );
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  markAllRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await notificationsService.markAllRead(req.user!.id);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  archive = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await notificationsService.archive(
        req.user!.id,
        String(req.params.id),
      );
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };
}

export const notificationsController = new NotificationsController();
