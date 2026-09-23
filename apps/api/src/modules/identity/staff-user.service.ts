import { UserRole } from "@daih/types";
import { prisma } from "../../db/client.js";
import { identityRepository } from "./identity.repository.js";
import { passwordService } from "./password.service.js";
import { clientIdService } from "./client-id.service.js";
import { sessionService } from "./session.service.js";
import { CreateStaffUserDTO, UserSummaryDTO } from "./identity.types.js";

import { config } from "../../config/env.js";

export class StaffUserService {
  /**
   * Creates a new staff/admin user. Enforces role hierarchy (Only Super Admins can create Super Admins).
   * Generates a 1-hour single-use setup link for initial password creation.
   */
  async createStaffUser(
    dto: CreateStaffUserDTO,
    creator?: { id: string; role: UserRole },
  ): Promise<UserSummaryDTO> {
    // Role Hierarchy Guard: Only Super Admins can create Super Admin accounts
    if (
      dto.role === UserRole.SUPER_ADMIN &&
      creator?.role !== UserRole.SUPER_ADMIN
    ) {
      const error: any = new Error(
        "Access Denied: Only Super Administrators can create Super Administrator accounts.",
      );
      error.code = "FORBIDDEN";
      error.statusCode = 403;
      throw error;
    }

    const existing = await identityRepository.findByEmail(dto.email);
    if (existing) {
      const error: any = new Error("An account with this email already exists");
      error.code = "EMAIL_ALREADY_EXISTS";
      error.statusCode = 409;
      throw error;
    }

    // Generate secure 32-character setup token with 1-hour validity
    const rawToken = passwordService.generateSecureToken(32);
    const tokenHash = passwordService.hashToken(rawToken);
    const tokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    const setupUrl = `${config.frontendUrls.admin}/setup-account?token=${encodeURIComponent(rawToken)}`;
    const clientId = await clientIdService.generateNextClientId();

    const user = await identityRepository.createStaffUser({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phoneNumber: dto.phoneNumber,
      role: dto.role as any,
      clientId,
      isVerified: true,
      tokenHash,
      setupUrl,
      tokenExpiresAt,
    });

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      avatarUrl: (user as any).avatarUrl || null,
      birthday: (user as any).birthday || null,
      clientId: user.clientId,
      role: user.role as UserRole,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      referralCode: user.referralCode || null,
    };
  }

  /**
   * Generates and dispatches a fresh 1-hour setup link for a staff member
   */
  async resendStaffSetupLink(
    userId: string,
    requester?: { id: string; role: UserRole },
  ): Promise<{ success: boolean; message: string }> {
    const user = await identityRepository.findById(userId);
    if (!user) {
      const error: any = new Error("Staff user not found");
      error.code = "USER_NOT_FOUND";
      error.statusCode = 404;
      throw error;
    }

    if (user.role === UserRole.CUSTOMER) {
      const error: any = new Error(
        "Cannot send staff setup link to a customer account",
      );
      error.code = "INVALID_OPERATION";
      error.statusCode = 400;
      throw error;
    }

    if (
      user.role === UserRole.SUPER_ADMIN &&
      requester?.role !== UserRole.SUPER_ADMIN
    ) {
      const error: any = new Error(
        "Access Denied: Only Super Administrators can resend invites for Super Administrator accounts.",
      );
      error.code = "FORBIDDEN";
      error.statusCode = 403;
      throw error;
    }

    const rawToken = passwordService.generateSecureToken(32);
    const tokenHash = passwordService.hashToken(rawToken);
    const tokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    const setupUrl = `${config.frontendUrls.admin}/setup-account?token=${encodeURIComponent(rawToken)}`;

    await identityRepository.createStaffSetupToken(
      userId,
      tokenHash,
      setupUrl,
      tokenExpiresAt,
    );

    return {
      success: true,
      message: `Setup invitation link successfully resent to ${user.email}`,
    };
  }

  /**
   * Updates staff user details (role, name, phone, verification/active status)
   */
  async updateStaffUser(
    userId: string,
    dto: {
      role?: UserRole;
      firstName?: string;
      lastName?: string;
      phoneNumber?: string;
      isVerified?: boolean;
    },
    updater?: { id: string; role: UserRole },
  ): Promise<UserSummaryDTO> {
    if (
      dto.role === UserRole.SUPER_ADMIN &&
      updater?.role !== UserRole.SUPER_ADMIN
    ) {
      const error: any = new Error(
        "Access Denied: Only Super Administrators can assign the Super Administrator role.",
      );
      error.code = "FORBIDDEN";
      error.statusCode = 403;
      throw error;
    }

    const user =
      (await identityRepository.findById(userId)) ||
      (await identityRepository.findByClientId(userId));

    if (!user) {
      const error: any = new Error("User not found");
      error.code = "USER_NOT_FOUND";
      error.statusCode = 404;
      throw error;
    }

    const updateData: any = {};
    if (dto.role) updateData.role = dto.role as any;
    if (dto.firstName) updateData.firstName = dto.firstName;
    if (dto.lastName) updateData.lastName = dto.lastName;
    if (dto.phoneNumber !== undefined) updateData.phoneNumber = dto.phoneNumber;
    if (dto.isVerified !== undefined) updateData.isVerified = dto.isVerified;

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    // Invalidate sessions on role change or deactivation
    if (dto.role || dto.isVerified === false) {
      await sessionService.revokeAllUserSessions(user.id);
    }

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      phoneNumber: updatedUser.phoneNumber ?? undefined,
      avatarUrl: (updatedUser as any).avatarUrl || null,
      birthday: (updatedUser as any).birthday || null,
      clientId: updatedUser.clientId,
      role: updatedUser.role as UserRole,
      isVerified: updatedUser.isVerified,
      createdAt: updatedUser.createdAt,
      referralCode: updatedUser.referralCode || null,
    };
  }

  /**
   * Updates a staff user role and revokes all active sessions to prevent privilege staleness
   */
  async updateStaffUserRole(
    userId: string,
    newRole: UserRole,
    updater?: { id: string; role: UserRole },
  ): Promise<UserSummaryDTO> {
    if (
      newRole === UserRole.SUPER_ADMIN &&
      updater?.role !== UserRole.SUPER_ADMIN
    ) {
      const error: any = new Error(
        "Access Denied: Only Super Administrators can assign the Super Administrator role.",
      );
      error.code = "FORBIDDEN";
      error.statusCode = 403;
      throw error;
    }

    const user = await identityRepository.findById(userId);
    if (!user) {
      const error: any = new Error("User not found");
      error.code = "USER_NOT_FOUND";
      error.statusCode = 404;
      throw error;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: newRole as any },
    });

    // Invalidate all active sessions immediately in Redis and PostgreSQL
    await sessionService.revokeAllUserSessions(userId);

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      phoneNumber: updatedUser.phoneNumber ?? undefined,
      avatarUrl: (updatedUser as any).avatarUrl || null,
      birthday: (updatedUser as any).birthday || null,
      clientId: updatedUser.clientId,
      role: updatedUser.role as UserRole,
      isVerified: updatedUser.isVerified,
      createdAt: updatedUser.createdAt,
      referralCode: updatedUser.referralCode || null,
    };
  }

  /**
   * Retrieves all registered staff users.
   */
  async getStaffUsers(): Promise<UserSummaryDTO[]> {
    const users = await identityRepository.listStaffUsers();
    return users.map((user) => ({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber ?? undefined,
      avatarUrl: (user as any).avatarUrl || null,
      birthday: (user as any).birthday || null,
      clientId: user.clientId,
      role: user.role as UserRole,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      referralCode: user.referralCode || null,
    }));
  }
}

export const staffUserService = new StaffUserService();
