import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { notificationsController } from "./notifications.controller.js";

export const notificationsRouter = Router();

notificationsRouter.get("/", authenticate, notificationsController.list);
notificationsRouter.get(
  "/unread-count",
  authenticate,
  notificationsController.unreadCount,
);
notificationsRouter.patch(
  "/read-all",
  authenticate,
  notificationsController.markAllRead,
);
notificationsRouter.patch(
  "/:id/read",
  authenticate,
  notificationsController.markRead,
);
notificationsRouter.patch(
  "/:id/archive",
  authenticate,
  notificationsController.archive,
);
