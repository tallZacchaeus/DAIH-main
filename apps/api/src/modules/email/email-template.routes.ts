import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requireRoles } from "../../middleware/rbac.middleware.js";
import { UserRole } from "@daih/types";
import { emailTemplateController } from "./email-template.controller.js";

const router = Router();

// Protect all template management routes: Authenticated + SUPER_ADMIN only
router.use(authenticate, requireRoles([UserRole.SUPER_ADMIN]));

router.get("/", emailTemplateController.listTemplates);
router.get("/:type", emailTemplateController.getTemplate);
router.put("/:type", emailTemplateController.updateTemplate);

export const emailTemplateRoutes = router;
