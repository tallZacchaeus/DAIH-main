import { Router } from "express";
import { legalController } from "./legal.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requireRoles } from "../../middleware/rbac.middleware.js";
import { UserRole } from "@daih/types";

const router = Router();

// Public policy access
router.get("/", (req, res, next) =>
  legalController.getAllPolicies(req, res, next),
);
router.get("/:type", (req, res, next) =>
  legalController.getPolicy(req, res, next),
);

// Guarded edit access: Operations Admin and Super Admin
router.put(
  "/:type",
  authenticate,
  requireRoles([UserRole.OPERATIONS_ADMIN, UserRole.SUPER_ADMIN]),
  (req, res, next) => legalController.updatePolicy(req, res, next),
);

export const legalRouter = router;
