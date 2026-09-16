import { Router } from "express";
import { Permission } from "@daih/types";
import { reportsController } from "./reports.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/rbac.middleware.js";

export const reportsRouter = Router();

// Protected Reports Export Endpoint (Accessible to Super Admin & Finance Officer)
reportsRouter.get(
  "/export",
  authenticate,
  requirePermission(Permission.REPORTS_EXPORT),
  reportsController.exportReport,
);
