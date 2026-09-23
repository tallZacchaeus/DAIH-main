import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requireRoles } from "../../middleware/rbac.middleware.js";
import { UserRole } from "@daih/types";
import {
  validateBody,
  validateQuery,
  validateParams,
} from "../../middleware/validate.middleware.js";
import { loyaltyController } from "./loyalty.controller.js";
import {
  UpdateLoyaltySettingsSchema,
  AdminManualAdjustmentSchema,
  RedemptionPreviewSchema,
  LoyaltyLedgerQuerySchema,
  CustomerIdParamSchema,
} from "./loyalty.schema.js";

export const loyaltyRouter = Router();

// Customer: Personal Wallet Balance & Valuation
loyaltyRouter.get("/me", authenticate, loyaltyController.getMyWallet);

// Customer: Personal Transaction & Earning History
loyaltyRouter.get(
  "/me/history",
  authenticate,
  validateQuery(LoyaltyLedgerQuerySchema),
  loyaltyController.getMyHistory,
);

// Customer: Preview Checkout Coin Redemption Discount
loyaltyRouter.post(
  "/preview-redemption",
  authenticate,
  validateBody(RedemptionPreviewSchema),
  loyaltyController.previewRedemption,
);

// Customer: Apply / Reserve Coin Redemption on Booking Hold
loyaltyRouter.post(
  "/apply-redemption",
  authenticate,
  validateBody(RedemptionPreviewSchema),
  loyaltyController.applyRedemption,
);

// Customer / Authenticated Member: Get Loyalty Program Settings & Rules
loyaltyRouter.get("/settings", authenticate, loyaltyController.getSettings);

// Admin: Get Loyalty Program Settings & Formulas (Read: Super Admin, Operations Admin, Finance Officer)
loyaltyRouter.get(
  "/admin/settings",
  authenticate,
  requireRoles([
    UserRole.SUPER_ADMIN,
    UserRole.OPERATIONS_ADMIN,
    UserRole.FINANCE_OFFICER,
  ]),
  loyaltyController.getSettings,
);

// Admin: Update Loyalty Program Settings & Formulas (Write: Super Admin & Operations Admin ONLY)
loyaltyRouter.put(
  "/admin/settings",
  authenticate,
  requireRoles([UserRole.SUPER_ADMIN, UserRole.OPERATIONS_ADMIN]),
  validateBody(UpdateLoyaltySettingsSchema),
  loyaltyController.updateSettings,
);

// Admin: Settings Change History / Audit Log (Read: Super Admin, Operations Admin, Finance Officer)
loyaltyRouter.get(
  "/admin/settings/history",
  authenticate,
  requireRoles([
    UserRole.SUPER_ADMIN,
    UserRole.OPERATIONS_ADMIN,
    UserRole.FINANCE_OFFICER,
  ]),
  loyaltyController.getSettingsHistory,
);

// Admin: Overall Program Stats & Fiat Liability (Read)
loyaltyRouter.get(
  "/admin/stats",
  authenticate,
  requireRoles([
    UserRole.SUPER_ADMIN,
    UserRole.OPERATIONS_ADMIN,
    UserRole.FINANCE_OFFICER,
    UserRole.MANAGEMENT_VIEWER,
  ]),
  loyaltyController.getAdminStats,
);

// Admin: Global Ledger of All Coin Issuances & Redemptions (Read)
loyaltyRouter.get(
  "/admin/ledger",
  authenticate,
  requireRoles([
    UserRole.SUPER_ADMIN,
    UserRole.OPERATIONS_ADMIN,
    UserRole.FINANCE_OFFICER,
  ]),
  loyaltyController.getAdminGlobalLedger,
);

// Admin: Inspect Member Loyalty Details & History (Read: All staff except Security)
loyaltyRouter.get(
  "/admin/customers/:customerId",
  authenticate,
  requireRoles([
    UserRole.SUPER_ADMIN,
    UserRole.OPERATIONS_ADMIN,
    UserRole.FINANCE_OFFICER,
    UserRole.RECEPTION_OFFICER,
    UserRole.MANAGEMENT_VIEWER,
  ]),
  validateParams(CustomerIdParamSchema),
  loyaltyController.getCustomerLoyalty,
);

// Admin: Discretionary Balance Adjustment (+/-) (Write: Strictly Super Admin & Finance Officer)
loyaltyRouter.post(
  "/admin/adjust",
  authenticate,
  requireRoles([UserRole.SUPER_ADMIN, UserRole.FINANCE_OFFICER]),
  validateBody(AdminManualAdjustmentSchema),
  loyaltyController.adminAdjust,
);
