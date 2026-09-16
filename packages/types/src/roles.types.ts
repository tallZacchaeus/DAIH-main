export enum UserRole {
  CUSTOMER = "CUSTOMER",
  RECEPTION_OFFICER = "RECEPTION_OFFICER",
  SECURITY_OFFICER = "SECURITY_OFFICER",
  OPERATIONS_ADMIN = "OPERATIONS_ADMIN",
  FINANCE_OFFICER = "FINANCE_OFFICER",
  SUPER_ADMIN = "SUPER_ADMIN",
  MANAGEMENT_VIEWER = "MANAGEMENT_VIEWER",
}

export enum Permission {
  BOOKINGS_CREATE = "bookings:create",
  BOOKINGS_READ_OWN = "bookings:read_own",
  BOOKINGS_READ_ALL = "bookings:read_all",
  BOOKINGS_MANAGE = "bookings:manage",
  BOOKINGS_OVERRIDE = "bookings:override",
  RESOURCES_MANAGE = "resources:manage",
  QR_SCAN = "qr:scan",
  CHECK_IN_OUT = "checkin_out:manage",
  PAYMENTS_READ = "payments:read",
  PAYMENTS_REFUND = "payments:refund",
  REPORTS_VIEW = "reports:view",
  REPORTS_EXPORT = "reports:export",
  USERS_MANAGE = "users:manage",
  AUDIT_VIEW = "audit:view",
  SYSTEM_CONFIG = "system:config",
}

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.CUSTOMER]: [
    Permission.BOOKINGS_CREATE,
    Permission.BOOKINGS_READ_OWN,
  ],
  [UserRole.RECEPTION_OFFICER]: [
    Permission.BOOKINGS_READ_ALL,
    Permission.QR_SCAN,
    Permission.CHECK_IN_OUT,
  ],
  [UserRole.SECURITY_OFFICER]: [Permission.QR_SCAN, Permission.CHECK_IN_OUT],
  [UserRole.OPERATIONS_ADMIN]: [
    Permission.BOOKINGS_READ_ALL,
    Permission.BOOKINGS_MANAGE,
    Permission.BOOKINGS_OVERRIDE,
    Permission.RESOURCES_MANAGE,
    Permission.REPORTS_VIEW,
    Permission.REPORTS_EXPORT,
  ],
  [UserRole.FINANCE_OFFICER]: [
    Permission.BOOKINGS_READ_ALL,
    Permission.PAYMENTS_READ,
    Permission.PAYMENTS_REFUND,
    Permission.REPORTS_VIEW,
    Permission.REPORTS_EXPORT,
  ],
  [UserRole.MANAGEMENT_VIEWER]: [
    Permission.REPORTS_VIEW,
    Permission.REPORTS_EXPORT,
  ],
  [UserRole.SUPER_ADMIN]: Object.values(Permission),
};
