import { Router } from "express";
import { supportController } from "./support.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requireRoles } from "../../middleware/rbac.middleware.js";
import { UserRole } from "@daih/types";

const router = Router();

// Public read access for customers and visitors
router.get("/", (req, res, next) =>
  supportController.getSettings(req, res, next),
);

// Strictly restricted to Super Admin and Operations Admin
router.put(
  "/",
  authenticate,
  requireRoles([UserRole.OPERATIONS_ADMIN, UserRole.SUPER_ADMIN]),
  (req, res, next) => supportController.updateSettings(req, res, next),
);

export const supportRouter = router;
