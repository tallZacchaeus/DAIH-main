import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware.js";
import { UserRole, Permission, ROLE_PERMISSIONS } from "@daih/types";

export const requireRoles = (allowedRoles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res
        .status(401)
        .json({ code: "UNAUTHORIZED", message: "Authentication required" });
      return;
    }

    // Super Admin has unrestricted access to all endpoints
    if (
      req.user.role === UserRole.SUPER_ADMIN ||
      allowedRoles.includes(req.user.role)
    ) {
      next();
      return;
    }

    res.status(403).json({
      code: "FORBIDDEN",
      message: `Role ${req.user.role} does not have access to this resource`,
    });
  };
};

export const requirePermission = (permission: Permission) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res
        .status(401)
        .json({ code: "UNAUTHORIZED", message: "Authentication required" });
      return;
    }

    // Super Admin has unrestricted access to all permissions
    if (req.user.role === UserRole.SUPER_ADMIN) {
      next();
      return;
    }

    const userPermissions = ROLE_PERMISSIONS[req.user.role] || [];
    if (!userPermissions.includes(permission)) {
      res.status(403).json({
        code: "FORBIDDEN",
        message: `Missing required permission: ${permission}`,
      });
      return;
    }

    next();
  };
};

export const requireAnyPermission = (permissions: Permission[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res
        .status(401)
        .json({ code: "UNAUTHORIZED", message: "Authentication required" });
      return;
    }

    // Super Admin has unrestricted access to all permissions
    if (req.user.role === UserRole.SUPER_ADMIN) {
      next();
      return;
    }

    const userPermissions = ROLE_PERMISSIONS[req.user.role] || [];
    const hasPermission = permissions.some((p) => userPermissions.includes(p));

    if (!hasPermission) {
      res.status(403).json({
        code: "FORBIDDEN",
        message: `Missing one of required permissions: ${permissions.join(", ")}`,
      });
      return;
    }

    next();
  };
};

export const requireStaff = () => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res
        .status(401)
        .json({ code: "UNAUTHORIZED", message: "Authentication required" });
      return;
    }

    if (req.user.role === UserRole.CUSTOMER) {
      res.status(403).json({
        code: "FORBIDDEN",
        message: "Staff access required",
      });
      return;
    }

    next();
  };
};
