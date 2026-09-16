import { Permission, ROLE_PERMISSIONS, UserRole } from "@daih/types";

export interface NavSubItem {
  name: string;
  href: string;
}

export interface NavItemConfig {
  name: string;
  href: string;
  icon: any;
  description: string;
  badge?: string;
  requiredPermissions?: Permission[];
  requiredRoles?: UserRole[];
  subItems?: NavSubItem[];
}

export interface NavSectionConfig {
  title: string;
  items: NavItemConfig[];
}

/**
 * Returns all permissions associated with a user role.
 */
export function getUserPermissions(
  role?: UserRole | string | null,
): Permission[] {
  if (!role) return [];
  const rawRole = role.toString().toUpperCase();
  if (
    rawRole === "SUPER_ADMIN" ||
    rawRole === "ADMIN" ||
    rawRole === UserRole.SUPER_ADMIN
  ) {
    return Object.values(Permission);
  }
  const roleKey =
    Object.values(UserRole).find((r) => r.toUpperCase() === rawRole) ||
    (role as UserRole);
  return roleKey && ROLE_PERMISSIONS[roleKey] ? ROLE_PERMISSIONS[roleKey] : [];
}

/**
 * Checks if a user has at least one of the required permissions.
 */
export function hasPermission(
  role?: UserRole | string | null,
  permission?: Permission | Permission[],
): boolean {
  if (!role) return false;
  const rawRole = role.toString().toUpperCase();
  if (
    rawRole === "SUPER_ADMIN" ||
    rawRole === "ADMIN" ||
    rawRole === UserRole.SUPER_ADMIN
  ) {
    return true;
  }
  if (!permission) return true;
  const userPerms = getUserPermissions(role);
  const required = Array.isArray(permission) ? permission : [permission];
  return required.some((p) => userPerms.includes(p));
}

/**
 * Validates whether a user role has access to view a specific admin console route.
 */
export function hasRouteAccess(
  role?: UserRole | string | null,
  pathname: string = "/",
): boolean {
  if (!role) return false;
  const rawRole = role.toString().toUpperCase();
  const isSuperAdmin =
    rawRole === "SUPER_ADMIN" ||
    rawRole === "ADMIN" ||
    rawRole === UserRole.SUPER_ADMIN;

  if (isSuperAdmin) {
    return true;
  }

  // Dashboard overview is accessible to all staff
  if (pathname === "/" || pathname === "") {
    return true;
  }

  if (pathname.startsWith("/bookings")) {
    return hasPermission(role, [
      Permission.BOOKINGS_READ_ALL,
      Permission.BOOKINGS_MANAGE,
    ]);
  }

  if (pathname.startsWith("/operations")) {
    return (
      rawRole === UserRole.OPERATIONS_ADMIN ||
      hasPermission(role, [
        Permission.RESOURCES_MANAGE,
        Permission.BOOKINGS_OVERRIDE,
      ])
    );
  }

  if (pathname.startsWith("/customers")) {
    return (
      rawRole === UserRole.OPERATIONS_ADMIN ||
      rawRole === UserRole.RECEPTION_OFFICER ||
      hasPermission(role, [Permission.BOOKINGS_READ_ALL])
    );
  }

  if (pathname.startsWith("/finance")) {
    return (
      rawRole === UserRole.FINANCE_OFFICER ||
      rawRole === UserRole.OPERATIONS_ADMIN ||
      hasPermission(role, [
        Permission.PAYMENTS_READ,
        Permission.PAYMENTS_REFUND,
        Permission.BOOKINGS_MANAGE,
      ])
    );
  }

  if (pathname.startsWith("/reports")) {
    return (
      rawRole === UserRole.MANAGEMENT_VIEWER ||
      rawRole === UserRole.FINANCE_OFFICER ||
      rawRole === UserRole.OPERATIONS_ADMIN ||
      hasPermission(role, [Permission.REPORTS_VIEW, Permission.REPORTS_EXPORT])
    );
  }

  if (pathname.startsWith("/visits")) {
    return (
      rawRole === UserRole.RECEPTION_OFFICER ||
      rawRole === UserRole.SECURITY_OFFICER ||
      rawRole === UserRole.OPERATIONS_ADMIN ||
      rawRole === UserRole.MANAGEMENT_VIEWER ||
      hasPermission(role, [
        Permission.BOOKINGS_READ_ALL,
        Permission.REPORTS_VIEW,
      ])
    );
  }

  // Staff membership & management is strictly restricted to SUPER_ADMIN
  if (pathname.startsWith("/staff") || pathname.startsWith("/users")) {
    return isSuperAdmin || hasPermission(role, Permission.USERS_MANAGE);
  }

  if (pathname.startsWith("/settings")) {
    return (
      isSuperAdmin ||
      rawRole === UserRole.OPERATIONS_ADMIN ||
      hasPermission(role, Permission.SYSTEM_CONFIG)
    );
  }

  return false;
}
