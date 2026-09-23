"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useAuth, api } from "@daih/api-client";
import { Button, Input, Card, Modal, useToast } from "@daih/ui";
import { UserRole, MfaMethod } from "@daih/types";
import { resolveAvatarUrl } from "../../lib/image-utils";
import { AvatarCropperModal, UserPhotoModal } from "../../components/common";
import {
  User,
  Shield,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Mail,
  Phone,
  Lock,
  LogOut,
  Loader2,
  Eye,
  EyeOff,
  Camera,
  Trash2,
  Cake,
  ExternalLink,
  ChevronRight,
  Smartphone,
  QrCode,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";

export default function AdminProfilePage() {
  const { user, updateUser, logout } = useAuth();
  const toast = useToast();

  // Navigation Tabs State (Personal Details, Security & Password, MFA)
  const [activeTab, setActiveTab] = useState<"profile" | "security" | "mfa">(
    "profile",
  );

  // Avatar Management State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarSuccess, setAvatarSuccess] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [isPhotoViewerOpen, setIsPhotoViewerOpen] = useState(false);
  const [showDeleteAvatarModal, setShowDeleteAvatarModal] = useState(false);

  useEffect(() => {
    setAvatarLoadError(false);
  }, [user?.avatarUrl]);

  // Profile Form State
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || "");
  const [birthMonth, setBirthMonth] = useState<string>("");
  const [birthDay, setBirthDay] = useState<string>("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Sync state when user profile changes
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setPhoneNumber(user.phoneNumber || "");
      if (user.birthday && user.birthday.includes("-")) {
        const parts = user.birthday.split("-");
        setBirthMonth(parts[0] || "");
        setBirthDay(parts[1] || "");
      }
    }
  }, [user]);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  // MFA Switch / Setup State
  const [mfaSetupMethod, setMfaSetupMethod] = useState<MfaMethod | null>(null);
  const [mfaQrCode, setMfaQrCode] = useState<string | null>(null);
  const [mfaManualKey, setMfaManualKey] = useState<string | null>(null);
  const [mfaEphemeralSecret, setMfaEphemeralSecret] = useState<string | null>(
    null,
  );
  const [mfaVerificationCode, setMfaVerificationCode] = useState<string>("");
  const [isInitiatingMfa, setIsInitiatingMfa] = useState<boolean>(false);
  const [isConfirmingMfa, setIsConfirmingMfa] = useState<boolean>(false);
  const [mfaSuccessMessage, setMfaSuccessMessage] = useState<string | null>(
    null,
  );
  const [mfaErrorMessage, setMfaErrorMessage] = useState<string | null>(null);
  const [copiedMfaKey, setCopiedMfaKey] = useState<boolean>(false);
  const [mfaResendCooldown, setMfaResendCooldown] = useState<number>(0);

  // Timer for Email OTP resend
  useEffect(() => {
    if (mfaResendCooldown <= 0) return;
    const timer = setInterval(() => {
      setMfaResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [mfaResendCooldown]);

  // Copy feedback state
  const [copiedId, setCopiedId] = useState(false);

  // Logout Confirmation State
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Password Strength Validation Checks
  const passwordCriteria = useMemo(() => {
    return {
      minLength: newPassword.length >= 8,
      hasUpper: /[A-Z]/.test(newPassword),
      hasLower: /[a-z]/.test(newPassword),
      hasNumber: /[0-9]/.test(newPassword),
      hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
    };
  }, [newPassword]);

  const isPasswordValid =
    passwordCriteria.minLength &&
    passwordCriteria.hasUpper &&
    passwordCriteria.hasLower &&
    passwordCriteria.hasNumber &&
    passwordCriteria.hasSpecial;

  // Resolve current avatar URL
  const resolvedAvatar = resolveAvatarUrl(user?.avatarUrl);

  const getInitials = (name?: string) => {
    if (!name) return "AD";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Copy Staff ID to Clipboard
  const handleCopyId = () => {
    const idToCopy = user?.id || user?.clientId || "";
    if (!idToCopy) return;
    navigator.clipboard.writeText(idToCopy);
    setCopiedId(true);
    toast.success("Staff identifier copied to clipboard");
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Trigger file selection for avatar
  const handleSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setAvatarError("Please select a valid image file (JPG, PNG, WebP)");
      toast.error("Please select a valid image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setAvatarError("Image must be smaller than 5MB");
      toast.error("Image must be smaller than 5MB");
      return;
    }

    setAvatarError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setRawImageSrc(reader.result as string);
      setIsCropperOpen(true);
    };
    reader.readAsDataURL(file);
  };

  // Upload cropped image
  const handleCropComplete = async (croppedBase64: string) => {
    setIsCropperOpen(false);
    setRawImageSrc(null);
    setIsUploadingAvatar(true);
    setAvatarSuccess(null);
    setAvatarError(null);

    try {
      const res = await api.auth.uploadAvatar({
        data: croppedBase64,
        contentType: "image/webp",
      });

      const updatedUser = (res as any)?.user || (res as any)?.data?.user;
      const avatarUrl =
        (res as any)?.avatarUrl || (res as any)?.data?.avatarUrl;

      if (updatedUser) {
        updateUser(updatedUser);
        setAvatarLoadError(false);
      } else if (avatarUrl && user) {
        updateUser({ ...user, avatarUrl });
        setAvatarLoadError(false);
      }

      setAvatarSuccess("Admin profile picture updated successfully!");
      toast.success("Your profile picture has been updated.");
      setTimeout(() => setAvatarSuccess(null), 4000);
    } catch (err: any) {
      const msg = err?.message || "Failed to update profile picture.";
      setAvatarError(msg);
      toast.error(msg);
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Delete current avatar
  const handleDeleteAvatar = async () => {
    setIsUploadingAvatar(true);
    setAvatarSuccess(null);
    setAvatarError(null);

    try {
      const res = await api.auth.deleteAvatar();
      if (res && res.user) {
        updateUser(res.user);
        setAvatarSuccess("Profile picture removed.");
        toast.success("Profile picture removed.");
        setTimeout(() => setAvatarSuccess(null), 4000);
      }
    } catch (err: any) {
      const msg = err?.message || "Failed to remove profile picture.";
      setAvatarError(msg);
      toast.error(msg);
    } finally {
      setIsUploadingAvatar(false);
      setShowDeleteAvatarModal(false);
    }
  };

  // Handle Profile Update Submission
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setProfileError("First name and last name are required.");
      return;
    }

    setIsSavingProfile(true);
    setProfileSuccess(null);
    setProfileError(null);

    try {
      let formattedBirthday: string | null = null;
      if (birthMonth && birthDay) {
        const m = birthMonth.padStart(2, "0");
        const d = birthDay.padStart(2, "0");
        formattedBirthday = `${m}-${d}`;
      }

      const updated = await api.auth.updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: phoneNumber.trim() || undefined,
        birthday: formattedBirthday,
      });

      if (updated) {
        updateUser(updated);
      }

      setProfileSuccess("Admin profile details saved successfully.");
      toast.success("Profile changes saved.");
      setTimeout(() => setProfileSuccess(null), 4000);
    } catch (err: any) {
      const msg = err?.message || "Failed to update profile details.";
      setProfileError(msg);
      toast.error(msg);
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handle Password Update Submission
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess(null);
    setPasswordError(null);

    if (!currentPassword) {
      setPasswordError("Current password is required.");
      return;
    }

    if (!isPasswordValid) {
      setPasswordError(
        "New password does not fulfill all security requirements.",
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setIsChangingPassword(true);

    try {
      await api.auth.changePassword({
        currentPassword,
        newPassword,
      });

      setPasswordSuccess("Your admin password has been changed securely.");
      toast.success("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSuccess(null), 5000);
    } catch (err: any) {
      const msg =
        err?.message ||
        "Failed to change password. Please verify current password.";
      setPasswordError(msg);
      toast.error(msg);
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Handle Request Password Reset Email for Logged-in Admin
  const handleRequestResetEmail = async () => {
    if (!user?.email) return;
    setIsSendingResetEmail(true);
    try {
      await api.auth.requestPasswordReset(user.email);
      setResetEmailSent(true);
      toast.success(`Password reset link dispatched to ${user.email}`, {
        title: "Reset Link Sent",
      });
      setTimeout(() => setResetEmailSent(false), 8000);
    } catch (err: any) {
      toast.error(err?.message || "Failed to dispatch password reset email.");
    } finally {
      setIsSendingResetEmail(false);
    }
  };

  // Handle MFA Setup / Switch Initiation
  const handleStartMfaSetup = async (method: MfaMethod) => {
    setMfaSetupMethod(method);
    setMfaVerificationCode("");
    setMfaErrorMessage(null);
    setMfaSuccessMessage(null);
    setIsInitiatingMfa(true);

    try {
      const res = await api.auth.initiateProfileMfa(method);
      if (method === "TOTP") {
        setMfaQrCode(res.qrCodeDataUri || null);
        setMfaManualKey(res.manualEntryKey || null);
        setMfaEphemeralSecret(res.ephemeralSecret || null);
      } else {
        setMfaResendCooldown(60);
      }
    } catch (err: any) {
      const msg = err?.message || "Failed to initiate MFA configuration.";
      setMfaErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsInitiatingMfa(false);
    }
  };

  // Handle MFA Setup / Switch Confirmation
  const handleConfirmMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaSetupMethod) return;

    const cleanCode = mfaVerificationCode.trim().replace(/\s/g, "");
    if (!cleanCode || cleanCode.length < 6) {
      setMfaErrorMessage("Please enter the 6-digit verification code.");
      return;
    }

    setIsConfirmingMfa(true);
    setMfaErrorMessage(null);

    try {
      const res = await api.auth.confirmProfileMfa({
        method: mfaSetupMethod,
        code: cleanCode,
        ephemeralSecret: mfaEphemeralSecret || undefined,
      });

      if (res && res.user) {
        updateUser(res.user);
      } else if (user) {
        updateUser({
          ...user,
          mfaEnabled: true,
          mfaMethod: mfaSetupMethod,
        });
      }

      setMfaSuccessMessage(
        `Multi-Factor Authentication successfully updated to ${
          mfaSetupMethod === "TOTP" ? "Authenticator App" : "Email OTP"
        }.`,
      );
      toast.success(
        `Preferred MFA method updated to ${
          mfaSetupMethod === "TOTP" ? "Authenticator App" : "Email OTP"
        }.`,
      );

      // Reset setup card state
      setMfaSetupMethod(null);
      setMfaQrCode(null);
      setMfaManualKey(null);
      setMfaEphemeralSecret(null);
      setMfaVerificationCode("");
      setTimeout(() => setMfaSuccessMessage(null), 5000);
    } catch (err: any) {
      const msg =
        err?.message ||
        "Verification failed. Please check the code and try again.";
      setMfaErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsConfirmingMfa(false);
    }
  };

  // Handle Copy Manual Key
  const handleCopyMfaKey = () => {
    if (!mfaManualKey) return;
    navigator.clipboard.writeText(mfaManualKey.replace(/\s/g, ""));
    setCopiedMfaKey(true);
    toast.success("Secret key copied to clipboard");
    setTimeout(() => setCopiedMfaKey(false), 2000);
  };

  // Handle Sign Out
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      window.location.href = "/login";
    } catch {
      window.location.href = "/login";
    }
  };

  const roleTitle = useMemo(() => {
    switch (user?.role) {
      case UserRole.SUPER_ADMIN:
        return "Super Administrator";
      case UserRole.OPERATIONS_ADMIN:
        return "Operations Administrator";
      case UserRole.FINANCE_OFFICER:
        return "Finance & Commerce Officer";
      case UserRole.RECEPTION_OFFICER:
        return "Front Desk & Reception Officer";
      case UserRole.SECURITY_OFFICER:
        return "Security & Facility Officer";
      case UserRole.MANAGEMENT_VIEWER:
        return "Executive Management Viewer";
      default:
        return user?.role || "Staff Administrator";
    }
  }, [user?.role]);

  const roleBadgeColor = useMemo(() => {
    switch (user?.role) {
      case UserRole.SUPER_ADMIN:
        return "bg-purple-100 text-[#23055c] border-purple-200";
      case UserRole.OPERATIONS_ADMIN:
        return "bg-indigo-100 text-indigo-800 border-indigo-200";
      case UserRole.FINANCE_OFFICER:
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case UserRole.RECEPTION_OFFICER:
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  }, [user?.role]);

  // Current active MFA method (default to EMAIL_OTP for staff if not explicitly TOTP)
  const currentMfaMethod: MfaMethod =
    user?.mfaMethod === "TOTP" ? "TOTP" : "EMAIL_OTP";

  return (
    <div className="space-y-8 max-w-5xl pb-16">
      {/* Hidden Avatar File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/jpg"
        onChange={handleSelectFile}
        className="hidden"
      />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-[#23055c] px-2.5 py-0.5 rounded-full border border-purple-200">
              Account Console
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Administrator Profile &amp; Preferences
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <User className="w-7 h-7 sm:w-8 sm:h-8 text-[#23055c]" />
            Admin Profile &amp; Settings
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage your personal staff information, update login credentials,
            and select your preferred Multi-Factor Authentication (MFA) method.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            onClick={() => setShowLogoutModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-rose-600" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Top Admin Identity & Overview Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EBE7F5] shadow-xs relative overflow-hidden">
        {/* Subtle Decorative Background Gradient */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-purple-100/50 via-slate-50/20 to-transparent rounded-bl-full pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-6">
            {/* Avatar with Actions */}
            <div className="relative group shrink-0 self-start sm:self-center">
              <div
                onClick={() => {
                  if (resolvedAvatar && !avatarLoadError) {
                    setIsPhotoViewerOpen(true);
                  } else {
                    fileInputRef.current?.click();
                  }
                }}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-[#23055c] to-[#65519f] text-white font-extrabold text-2xl sm:text-3xl flex items-center justify-center shadow-md cursor-pointer overflow-hidden border-2 border-white ring-4 ring-purple-100 hover:ring-purple-300 transition-all relative"
                title="Click to view or change avatar"
              >
                {resolvedAvatar && !avatarLoadError ? (
                  <img
                    src={resolvedAvatar}
                    alt={user ? `${user.firstName} ${user.lastName}` : "Admin"}
                    className="w-full h-full object-cover"
                    onError={() => setAvatarLoadError(true)}
                  />
                ) : (
                  getInitials(
                    user ? `${user.firstName} ${user.lastName}` : "Admin",
                  )
                )}

                {/* Hover overlay hint */}
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-semibold gap-1">
                  <Camera className="w-4 h-4" />
                </div>
              </div>

              {/* Quick photo change button badge */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1.5 -right-1.5 p-2 bg-[#23055c] hover:bg-[#392271] text-white rounded-xl shadow-md border-2 border-white transition-all cursor-pointer"
                title="Upload New Photo"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Profile Core Info */}
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate">
                  {user
                    ? `${user.firstName} ${user.lastName}`
                    : "Staff Administrator"}
                </h2>
                <span
                  className={`text-[11px] font-extrabold px-3 py-1 rounded-full border shadow-2xs ${roleBadgeColor}`}
                >
                  {roleTitle}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-500 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-slate-400" />
                  {user?.email}
                </span>
                {user?.isVerified && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Verified Email
                  </span>
                )}
              </div>

              {/* Staff ID and MFA Pill */}
              <div className="flex items-center gap-2 pt-1 text-xs text-slate-500 flex-wrap">
                <span className="font-semibold text-slate-600">Staff ID:</span>
                <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700 text-[11px]">
                  {user?.id || user?.clientId || "N/A"}
                </span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded transition-colors cursor-pointer"
                  title="Copy Identifier"
                >
                  {copiedId ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>

                <span className="text-slate-300">•</span>

                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#23055c]" />
                  MFA:{" "}
                  {currentMfaMethod === "TOTP"
                    ? "Authenticator App"
                    : "Email OTP"}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Photo Actions & Session Info */}
          <div className="flex flex-row md:flex-col items-start md:items-end justify-between gap-3 pt-4 md:pt-0 border-t md:border-t-0 border-slate-100">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-[#23055c] border border-purple-200 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Camera className="w-3.5 h-3.5" />
                Change Photo
              </button>

              {user?.avatarUrl && (
                <button
                  type="button"
                  onClick={() => setShowDeleteAvatarModal(true)}
                  disabled={isUploadingAvatar}
                  className="px-2.5 py-1.5 bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  title="Remove Profile Photo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Active Console Session</span>
            </div>
          </div>
        </div>

        {/* Status Alerts */}
        {avatarSuccess && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{avatarSuccess}</span>
          </div>
        )}
        {avatarError && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{avatarError}</span>
          </div>
        )}
      </div>

      {/* Navigation Tabs Bar (Personal Details, Security & Password, MFA) */}
      <div className="flex items-center gap-2 border-b border-[#EBE7F5] pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("profile")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "profile"
              ? "bg-[#23055c] text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <User className="w-4 h-4" />
          Personal Details
        </button>

        <button
          onClick={() => setActiveTab("security")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "security"
              ? "bg-[#23055c] text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <Lock className="w-4 h-4" />
          Security &amp; Password
        </button>

        <button
          onClick={() => setActiveTab("mfa")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "mfa"
              ? "bg-[#23055c] text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <Smartphone className="w-4 h-4" />
          Two-Factor Authentication (MFA)
        </button>
      </div>

      {/* TAB 1: Personal Profile Information */}
      {activeTab === "profile" && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EBE7F5] shadow-xs space-y-6 animate-in fade-in duration-200">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <User className="w-5 h-5 text-[#23055c]" />
              Staff Profile Information
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Update your display name, contact phone number, and personal
              preferences.
            </p>
          </div>

          {profileSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{profileSuccess}</span>
            </div>
          )}
          {profileError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{profileError}</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {/* First Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  First Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Adebayo"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#23055c]/20 focus:border-[#23055c] text-xs sm:text-sm text-slate-900 bg-white"
                />
              </div>

              {/* Last Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Last Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Ogunleye"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#23055c]/20 focus:border-[#23055c] text-xs sm:text-sm text-slate-900 bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {/* Email Address (Read-only) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    Email Address
                  </label>
                  <span className="text-[10px] text-slate-400 font-semibold">
                    Managed by Super Admin
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="email"
                    disabled
                    value={user?.email || ""}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-500 cursor-not-allowed"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
                <p className="text-[11px] text-slate-400">
                  Email address changes require super administrator security
                  verification.
                </p>
              </div>

              {/* Phone Number */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Phone Number
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="e.g. +234 803 123 4567"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#23055c]/20 focus:border-[#23055c] text-xs sm:text-sm text-slate-900 bg-white"
                  />
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>
            </div>

            {/* Birthday (Optional) */}
            <div className="pt-2">
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Birthday (Month &amp; Day)
              </label>
              <div className="grid grid-cols-2 gap-4 max-w-sm">
                <div>
                  <select
                    value={birthMonth}
                    onChange={(e) => setBirthMonth(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#23055c]/20"
                  >
                    <option value="">Month</option>
                    {[
                      "01 - January",
                      "02 - February",
                      "03 - March",
                      "04 - April",
                      "05 - May",
                      "06 - June",
                      "07 - July",
                      "08 - August",
                      "09 - September",
                      "10 - October",
                      "11 - November",
                      "12 - December",
                    ].map((m, idx) => (
                      <option
                        key={idx}
                        value={String(idx + 1).padStart(2, "0")}
                      >
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <select
                    value={birthDay}
                    onChange={(e) => setBirthDay(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#23055c]/20"
                  >
                    <option value="">Day</option>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={String(d).padStart(2, "0")}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Used for hub team anniversary celebrations. Year is kept
                private.
              </p>
            </div>

            {/* Submit Button */}
            <div className="pt-4 flex items-center justify-end">
              <button
                type="submit"
                disabled={isSavingProfile}
                className="px-6 py-2.5 rounded-xl bg-[#23055c] hover:bg-[#392271] text-white font-bold text-xs shadow-sm hover:shadow transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSavingProfile ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Save Profile Details</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: Security & Password */}
      {activeTab === "security" && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EBE7F5] shadow-xs space-y-6 animate-in fade-in duration-200">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <Lock className="w-5 h-5 text-[#23055c]" />
              Console Password &amp; Credentials
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Change your admin portal login password. Ensure your password
              satisfies the security complexity rules.
            </p>
          </div>

          {passwordSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{passwordSuccess}</span>
            </div>
          )}
          {passwordError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-5 max-w-xl">
            {/* Current Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Current Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  name="currentPassword"
                  autoComplete="current-password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#23055c]/20 focus:border-[#23055c] text-xs sm:text-sm text-slate-900 bg-white pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showCurrentPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                New Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  name="newPassword"
                  autoComplete="new-password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter your new secure password"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#23055c]/20 focus:border-[#23055c] text-xs sm:text-sm text-slate-900 bg-white pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showNewPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Password Complexity Checklist */}
              {newPassword && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 mt-2 text-xs">
                  <div className="font-semibold text-slate-600 text-[11px]">
                    Password Requirements:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px]">
                    <span
                      className={`flex items-center gap-1.5 ${
                        passwordCriteria.minLength
                          ? "text-emerald-700 font-bold"
                          : "text-slate-400"
                      }`}
                    >
                      {passwordCriteria.minLength ? "✓" : "○"} At least 8
                      characters
                    </span>
                    <span
                      className={`flex items-center gap-1.5 ${
                        passwordCriteria.hasUpper
                          ? "text-emerald-700 font-bold"
                          : "text-slate-400"
                      }`}
                    >
                      {passwordCriteria.hasUpper ? "✓" : "○"} One uppercase
                      letter (A-Z)
                    </span>
                    <span
                      className={`flex items-center gap-1.5 ${
                        passwordCriteria.hasLower
                          ? "text-emerald-700 font-bold"
                          : "text-slate-400"
                      }`}
                    >
                      {passwordCriteria.hasLower ? "✓" : "○"} One lowercase
                      letter (a-z)
                    </span>
                    <span
                      className={`flex items-center gap-1.5 ${
                        passwordCriteria.hasNumber
                          ? "text-emerald-700 font-bold"
                          : "text-slate-400"
                      }`}
                    >
                      {passwordCriteria.hasNumber ? "✓" : "○"} One numeric digit
                      (0-9)
                    </span>
                    <span
                      className={`flex items-center gap-1.5 ${
                        passwordCriteria.hasSpecial
                          ? "text-emerald-700 font-bold"
                          : "text-slate-400"
                      }`}
                    >
                      {passwordCriteria.hasSpecial ? "✓" : "○"} One special
                      character (!@#$)
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm New Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Confirm New Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new password"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#23055c]/20 focus:border-[#23055c] text-xs sm:text-sm text-slate-900 bg-white pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-[11px] text-rose-500 font-medium">
                  Passwords do not match.
                </p>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={
                  isChangingPassword ||
                  !isPasswordValid ||
                  newPassword !== confirmPassword ||
                  !currentPassword
                }
                className="px-6 py-2.5 rounded-xl bg-[#23055c] hover:bg-[#392271] text-white font-bold text-xs shadow-sm hover:shadow transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isChangingPassword ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Update Password</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Forgot Current Password Option */}
          <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-[#23055c]" />
                Forgot your current password?
              </h4>
              <p className="text-[11px] text-slate-500">
                Dispatch a secure password reset link to your verified email (
                {user?.email || "registered email"}).
              </p>
              {resetEmailSent && (
                <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 pt-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Reset instructions have been sent. Please check your inbox.
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleRequestResetEmail}
              disabled={isSendingResetEmail || !user?.email}
              className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl shadow-2xs transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSendingResetEmail ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Sending Link...</span>
                </>
              ) : (
                <>
                  <Mail className="w-3.5 h-3.5 text-[#23055c]" />
                  <span>Send Reset Email</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: Multi-Factor Authentication (MFA) */}
      {activeTab === "mfa" && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EBE7F5] shadow-xs space-y-6 animate-in fade-in duration-200">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-[#23055c]" />
              Multi-Factor Authentication (MFA) Preferences
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select and manage your preferred second-factor authentication
              method used when logging into the console.
            </p>
          </div>

          {/* Current Active MFA Method Banner */}
          <div className="p-4 sm:p-5 rounded-2xl bg-purple-50/70 border border-purple-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#23055c] text-white flex items-center justify-center shrink-0 shadow-xs">
                {currentMfaMethod === "TOTP" ? (
                  <Smartphone className="w-5 h-5" />
                ) : (
                  <Mail className="w-5 h-5" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Current Active Method:
                  </span>
                  <span className="text-xs font-black text-[#23055c] bg-white px-2.5 py-0.5 rounded-full border border-purple-200 shadow-2xs">
                    {currentMfaMethod === "TOTP"
                      ? "Authenticator App (TOTP)"
                      : "Email One-Time Passcode (OTP)"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {currentMfaMethod === "TOTP"
                    ? "Passcodes are generated offline using your mobile authenticator app."
                    : `Passcodes are automatically emailed to ${user?.email || "your address"} during login.`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Enforced &amp; Active
              </span>
            </div>
          </div>

          {/* Feedback Alerts */}
          {mfaSuccessMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs sm:text-sm text-emerald-800 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="font-semibold">{mfaSuccessMessage}</span>
            </div>
          )}
          {mfaErrorMessage && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs sm:text-sm text-rose-800 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span className="font-semibold">{mfaErrorMessage}</span>
            </div>
          )}

          {/* MFA Method Selection Cards */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              Choose or Switch Your Preferred Method
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card 1: Authenticator App */}
              <div
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${
                  currentMfaMethod === "TOTP"
                    ? "bg-white border-[#23055c] ring-2 ring-[#23055c]/10 shadow-sm"
                    : "bg-[#F8F9FA] border-[#EBE7F5] hover:border-purple-200"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-purple-100 text-[#23055c] flex items-center justify-center font-bold">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    {currentMfaMethod === "TOTP" ? (
                      <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                        Current Method
                      </span>
                    ) : (
                      <span className="text-[10px] font-extrabold uppercase tracking-wider bg-purple-50 text-[#23055c] px-2 py-0.5 rounded-full border border-purple-200">
                        Recommended
                      </span>
                    )}
                  </div>

                  <div>
                    <h5 className="font-bold text-sm text-slate-900">
                      Mobile Authenticator App (TOTP)
                    </h5>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Use Google Authenticator, Microsoft Authenticator,
                      1Password, or Authy. Highly recommended for maximum
                      security.
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleStartMfaSetup("TOTP")}
                    disabled={isInitiatingMfa}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      currentMfaMethod === "TOTP"
                        ? "bg-purple-50 hover:bg-purple-100 text-[#23055c] border border-purple-200"
                        : "bg-[#23055c] hover:bg-[#392271] text-white shadow-xs"
                    }`}
                  >
                    {isInitiatingMfa && mfaSetupMethod === "TOTP" ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Configuring...</span>
                      </>
                    ) : currentMfaMethod === "TOTP" ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Reconfigure Authenticator</span>
                      </>
                    ) : (
                      <>
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>Switch to Authenticator App</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Card 2: Email OTP */}
              <div
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${
                  currentMfaMethod === "EMAIL_OTP"
                    ? "bg-white border-[#23055c] ring-2 ring-[#23055c]/10 shadow-sm"
                    : "bg-[#F8F9FA] border-[#EBE7F5] hover:border-purple-200"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-purple-100 text-[#23055c] flex items-center justify-center font-bold">
                      <Mail className="w-5 h-5" />
                    </div>
                    {currentMfaMethod === "EMAIL_OTP" && (
                      <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                        Current Method
                      </span>
                    )}
                  </div>

                  <div>
                    <h5 className="font-bold text-sm text-slate-900">
                      Email One-Time Passcode (Email OTP)
                    </h5>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      A 6-digit passcode will be dispatched to your registered
                      email address ({user?.email}) every time you sign in.
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleStartMfaSetup("EMAIL_OTP")}
                    disabled={
                      isInitiatingMfa || currentMfaMethod === "EMAIL_OTP"
                    }
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      currentMfaMethod === "EMAIL_OTP"
                        ? "bg-slate-100 text-slate-400 cursor-default"
                        : "bg-[#23055c] hover:bg-[#392271] text-white shadow-xs cursor-pointer"
                    }`}
                  >
                    {isInitiatingMfa && mfaSetupMethod === "EMAIL_OTP" ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Dispatching Code...</span>
                      </>
                    ) : currentMfaMethod === "EMAIL_OTP" ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Active Method</span>
                      </>
                    ) : (
                      <>
                        <Mail className="w-3.5 h-3.5" />
                        <span>Switch to Email OTP</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Active Setup / Confirmation Panel */}
          {mfaSetupMethod && (
            <div className="p-6 rounded-3xl bg-[#F8F9FA] border-2 border-[#23055c]/20 space-y-5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#23055c] animate-ping" />
                  <h4 className="text-sm font-extrabold text-slate-900">
                    Confirming New MFA Method:{" "}
                    {mfaSetupMethod === "TOTP"
                      ? "Authenticator App (TOTP)"
                      : "Email OTP"}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMfaSetupMethod(null);
                    setMfaQrCode(null);
                    setMfaManualKey(null);
                    setMfaEphemeralSecret(null);
                    setMfaVerificationCode("");
                    setMfaErrorMessage(null);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
                >
                  Cancel Setup
                </button>
              </div>

              {mfaSetupMethod === "TOTP" ? (
                /* ── TOTP Setup Flow ──────────────────────────── */
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    {/* QR Code Container */}
                    <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                      {mfaQrCode ? (
                        <img
                          src={mfaQrCode}
                          alt="Authenticator QR Code"
                          className="w-48 h-48 rounded-xl object-contain"
                        />
                      ) : (
                        <div className="w-48 h-48 flex items-center justify-center">
                          <Loader2 className="w-8 h-8 animate-spin text-[#23055c]" />
                        </div>
                      )}
                      <p className="text-[11px] text-slate-500 text-center mt-2 font-medium">
                        Scan with Google Authenticator or Microsoft
                        Authenticator
                      </p>
                    </div>

                    {/* Manual Key & Instructions */}
                    <div className="space-y-4">
                      <div>
                        <div className="text-xs font-bold text-slate-700">
                          Step 1: Scan QR or Enter Key
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          If you cannot scan the QR code, manually add this
                          secret key into your authenticator app:
                        </p>
                      </div>

                      {mfaManualKey && (
                        <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-bold text-[#23055c] tracking-widest break-all">
                            {mfaManualKey}
                          </span>
                          <button
                            type="button"
                            onClick={handleCopyMfaKey}
                            className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-[#23055c] rounded-lg transition-colors cursor-pointer shrink-0"
                            title="Copy Key"
                          >
                            {copiedMfaKey ? (
                              <Check className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      )}

                      <div className="text-xs font-bold text-slate-700">
                        Step 2: Enter 6-Digit Passcode
                      </div>
                      <p className="text-xs text-slate-500">
                        Enter the code generated by your app to verify
                        synchronization:
                      </p>

                      <form onSubmit={handleConfirmMfa} className="space-y-3">
                        <div className="relative">
                          <input
                            type="text"
                            maxLength={8}
                            required
                            value={mfaVerificationCode}
                            onChange={(e) =>
                              setMfaVerificationCode(e.target.value)
                            }
                            placeholder="000 000"
                            className="w-full text-center font-mono text-lg font-black tracking-widest px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#23055c]/20 focus:border-[#23055c] bg-white text-slate-900"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={
                            isConfirmingMfa ||
                            mfaVerificationCode.trim().length < 6
                          }
                          className="w-full bg-[#23055c] hover:bg-[#392271] text-white py-2.5 rounded-xl font-bold text-xs shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          {isConfirmingMfa ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Verifying Code...</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Verify &amp; Activate Authenticator</span>
                            </>
                          )}
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              ) : (
                /* ── Email OTP Setup Flow ─────────────────────── */
                <div className="max-w-md space-y-4">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    A test verification code has been dispatched to{" "}
                    <strong>{user?.email}</strong>. Enter the 6-digit code below
                    to confirm Email OTP as your active MFA method:
                  </p>

                  <form onSubmit={handleConfirmMfa} className="space-y-3">
                    <input
                      type="text"
                      maxLength={8}
                      required
                      value={mfaVerificationCode}
                      onChange={(e) => setMfaVerificationCode(e.target.value)}
                      placeholder="000 000"
                      className="w-full text-center font-mono text-lg font-black tracking-widest px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#23055c]/20 focus:border-[#23055c] bg-white text-slate-900"
                    />

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">
                        Didn&apos;t get the code?
                      </span>
                      <button
                        type="button"
                        onClick={() => handleStartMfaSetup("EMAIL_OTP")}
                        disabled={mfaResendCooldown > 0 || isInitiatingMfa}
                        className="font-bold text-[#23055c] hover:text-[#392271] disabled:text-slate-400 cursor-pointer"
                      >
                        {mfaResendCooldown > 0
                          ? `Resend in ${mfaResendCooldown}s`
                          : "Resend Code"}
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={
                        isConfirmingMfa || mfaVerificationCode.trim().length < 6
                      }
                      className="w-full bg-[#23055c] hover:bg-[#392271] text-white py-2.5 rounded-xl font-bold text-xs shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isConfirmingMfa ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Verifying Code...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Verify &amp; Activate Email OTP</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Avatar Cropper Modal */}
      <AvatarCropperModal
        isOpen={isCropperOpen}
        imageSrc={rawImageSrc}
        isUploading={isUploadingAvatar}
        onClose={() => {
          setIsCropperOpen(false);
          setRawImageSrc(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }}
        onCropComplete={handleCropComplete}
      />

      {/* User Photo Full View Modal */}
      {resolvedAvatar && (
        <UserPhotoModal
          isOpen={isPhotoViewerOpen}
          onClose={() => setIsPhotoViewerOpen(false)}
          photoUrl={resolvedAvatar}
          userName={user ? `${user.firstName} ${user.lastName}` : "Admin"}
          userEmail={user?.email}
          userRole={user?.role}
        />
      )}

      {/* Delete Avatar Confirmation Modal */}
      <Modal
        isOpen={showDeleteAvatarModal}
        onClose={() => setShowDeleteAvatarModal(false)}
        title="Remove Profile Photo"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to remove your admin profile photo? Your
            display will revert to your name initials.
          </p>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowDeleteAvatarModal(false)}
              disabled={isUploadingAvatar}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteAvatar}
              disabled={isUploadingAvatar}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              {isUploadingAvatar ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Removing...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Photo</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Sign Out Confirmation Modal */}
      <Modal
        isOpen={showLogoutModal}
        onClose={() => !isLoggingOut && setShowLogoutModal(false)}
        title="Sign Out of Admin Console"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to terminate your current administrative
            session? You will need to log back in with your credentials and MFA
            token.
          </p>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowLogoutModal(false)}
              disabled={isLoggingOut}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
            >
              Stay Logged In
            </button>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="px-4 py-2 rounded-xl bg-[#23055c] hover:bg-[#392271] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              {isLoggingOut ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Signing Out...</span>
                </>
              ) : (
                <>
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Confirm Sign Out</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
