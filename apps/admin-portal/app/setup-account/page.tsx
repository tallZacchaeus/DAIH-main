"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api, useAuth } from "@daih/api-client";
import { useToast } from "@daih/ui";
import { MfaMethod, UserRole } from "@daih/types";
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Clock,
  Mail,
  Smartphone,
  Copy,
  Check,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";

type SetupStep = "PASSWORD" | "MFA_SELECT" | "MFA_VERIFY" | "COMPLETED";

function SetupAccountWizard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const { setSession } = useAuth();

  const token = searchParams.get("token") || "";

  // Wizard state
  const [currentStep, setCurrentStep] = useState<SetupStep>("PASSWORD");

  // Step 1: Password State
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Step 2: MFA State
  const [setupToken, setSetupToken] = useState<string>("");
  const [userInfo, setUserInfo] = useState<{
    id?: string;
    firstName?: string;
    email?: string;
    role?: UserRole;
  } | null>(null);
  const [mfaMethod, setMfaMethod] = useState<MfaMethod>("EMAIL_OTP");
  const [qrCodeDataUri, setQrCodeDataUri] = useState<string | null>(null);
  const [manualEntryKey, setManualEntryKey] = useState<string | null>(null);
  const [ephemeralSecret, setEphemeralSecret] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [isResending, setIsResending] = useState(false);

  // Loading & Error states
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializingMfa, setIsInitializingMfa] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Resend OTP Cooldown Timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Real-time password validation criteria
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const isPasswordValid =
    hasMinLength &&
    hasUppercase &&
    hasLowercase &&
    hasNumber &&
    hasSpecial &&
    passwordsMatch;

  // Step 1 Submit: Setup Password
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setErrorMessage(
        "Setup token is missing. Please click the link in your invitation email.",
      );
      return;
    }

    if (!isPasswordValid) {
      setErrorMessage(
        "Please ensure your password meets all security requirements.",
      );
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await api.auth.setupAccount({
        token,
        password,
      });

      if (res.requiresMfaSetup && res.setupToken) {
        setSetupToken(res.setupToken);
        if (res.user) {
          setUserInfo(res.user);
        }
        toast.success(
          "Password created! Now configure Two-Factor Authentication.",
          {
            title: "Step 1 Completed",
          },
        );
        setCurrentStep("MFA_SELECT");
      } else {
        // Fallback for accounts not requiring MFA
        setCurrentStep("COMPLETED");
      }
    } catch (err: any) {
      const msg =
        err?.message ||
        "Failed to configure your account password. This link may have expired or already been used.";
      setErrorMessage(msg);
      toast.error(msg, { title: "Setup Failed" });
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2A: Proceed to MFA Verification
  const handleProceedToMfaVerify = async () => {
    setErrorMessage(null);
    setIsInitializingMfa(true);

    try {
      const res = await api.auth.setupMfa({
        setupToken,
        method: mfaMethod,
      });

      if (mfaMethod === "TOTP") {
        setQrCodeDataUri(res.qrCodeDataUri || null);
        setManualEntryKey(res.manualEntryKey || null);
        setEphemeralSecret(res.ephemeralSecret || null);
      } else {
        setResendCooldown(60);
      }

      setCurrentStep("MFA_VERIFY");
    } catch (err: any) {
      const msg = err?.message || "Failed to initialize MFA method setup.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsInitializingMfa(false);
    }
  };

  // Step 2B: Resend Email OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    setErrorMessage(null);

    try {
      await api.auth.setupMfa({
        setupToken,
        method: "EMAIL_OTP",
      });
      toast.success("A fresh verification code has been sent to your email.");
      setResendCooldown(60);
    } catch (err: any) {
      const msg = err?.message || "Failed to resend code. Please try again.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsResending(false);
    }
  };

  const handleCopyKey = () => {
    if (!manualEntryKey) return;
    navigator.clipboard.writeText(manualEntryKey.replace(/\s/g, ""));
    setCopiedKey(true);
    toast.success("Setup key copied to clipboard!");
    setTimeout(() => setCopiedKey(false), 2000);
  };

  // Step 2C: Confirm MFA Setup
  const handleConfirmMfaSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanCode = verificationCode.trim().replace(/\s/g, "");
    if (!cleanCode || cleanCode.length < 6) {
      toast.warning("Please enter the 6-digit verification code.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await api.auth.confirmMfaSetup({
        setupToken,
        method: mfaMethod,
        code: cleanCode,
        ephemeralSecret:
          mfaMethod === "TOTP" ? ephemeralSecret || undefined : undefined,
      });

      // Establish authenticated session
      setSession(res.token, res.user as any);
      setUserInfo(res.user as any);

      toast.success("Account secured! Two-Factor Authentication activated.", {
        title: "Security Verified",
      });

      setCurrentStep("COMPLETED");
    } catch (err: any) {
      const msg =
        err?.message ||
        "Invalid or expired verification code. Please try again.";
      setErrorMessage(msg);
      toast.error(msg, { title: "Verification Failed" });
    } finally {
      setIsLoading(false);
    }
  };

  // Missing Invitation Token Screen
  if (!token) {
    return (
      <div className="w-full max-w-md bg-white rounded-2xl border border-[#EBE7F5] shadow-[0px_16px_36px_rgba(57,34,113,0.09)] overflow-hidden p-8 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Missing Invitation Token
        </h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          No setup token was detected in your link. Please use the direct
          onboarding URL provided in your staff welcome email.
        </p>
        <div className="pt-2">
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 text-xs font-bold text-[#23055c] hover:underline"
          >
            Return to Admin Login <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  // Step 3: Success / Completed Screen
  if (currentStep === "COMPLETED") {
    return (
      <div className="w-full max-w-md bg-white rounded-2xl border border-[#EBE7F5] shadow-[0px_16px_36px_rgba(57,34,113,0.09)] overflow-hidden animate-in fade-in duration-300">
        <div className="p-8 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100 shadow-xs">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Identity & 2FA Activated
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Welcome to the Console!
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed mt-1">
              Your password and Two-Factor Authentication have been securely
              established for{" "}
              <strong className="text-slate-800">
                {userInfo?.email || "your account"}
              </strong>
              .
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-left space-y-1">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Account Role
            </p>
            <p className="text-xs font-bold text-[#23055c]">
              {userInfo?.role?.replace(/_/g, " ") || "Administrator"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.replace("/")}
            className="w-full py-3.5 px-6 rounded-xl text-xs font-bold bg-[#23055c] hover:bg-[#392271] text-white transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer group"
          >
            <span>Launch Admin Console</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className="bg-[#f1f4f9] px-8 py-3 border-t border-[#EBE7F5] text-center">
          <p className="text-[11px] text-slate-500 font-medium flex items-center justify-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-[#23055c]" />
            Protected by DAIH Zero-Trust Architecture
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg bg-white rounded-2xl border border-[#EBE7F5] shadow-[0px_16px_36px_rgba(57,34,113,0.09)] overflow-hidden animate-in fade-in duration-200">
      {/* Header Section */}
      <div className="p-8 pb-5 text-center border-b border-slate-100">
        <Link href="/" className="inline-block mb-3">
          <img
            src="/images/logo.png"
            alt="DAIH Workspace Logo"
            className="mx-auto h-10 w-auto object-contain"
          />
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold text-[#181c20] tracking-tight mb-1">
          Staff Account Activation
        </h1>
        <p className="text-xs text-slate-500 font-medium">
          Complete your 2-step onboarding to access the Management Console
        </p>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
              currentStep === "PASSWORD"
                ? "bg-[#23055c] text-white shadow-xs"
                : "bg-emerald-100 text-emerald-800"
            }`}
          >
            {currentStep === "PASSWORD" ? (
              <span className="w-4 h-4 rounded-full bg-white/20 text-white flex items-center justify-center text-[10px]">
                1
              </span>
            ) : (
              <Check className="w-3.5 h-3.5 text-emerald-700" />
            )}
            <span>1. Password</span>
          </div>

          <div className="w-6 h-0.5 bg-slate-200" />

          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
              currentStep === "MFA_SELECT" || currentStep === "MFA_VERIFY"
                ? "bg-[#23055c] text-white shadow-xs"
                : "bg-slate-100 text-slate-400"
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-white/20 text-current flex items-center justify-center text-[10px]">
              2
            </span>
            <span>2. Two-Factor Auth</span>
          </div>
        </div>
      </div>

      {/* Security Expiry Alert Banner (Visible on password step) */}
      {currentStep === "PASSWORD" && (
        <div className="bg-amber-50/80 border-b border-amber-100 px-6 py-2.5 flex items-center gap-2 text-[11px] text-amber-800">
          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>Single-use onboarding link · Complete setup within 1 hour</span>
        </div>
      )}

      {/* Content Area */}
      <div className="p-6 sm:p-8">
        {errorMessage && (
          <div className="p-3.5 mb-5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {/* ── STEP 1: PASSWORD CREATION ──────────────────────────────────── */}
        {currentStep === "PASSWORD" && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {/* New Password */}
            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-bold text-slate-700">
                Create Strong Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Choose a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-4 py-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#23055c] focus:ring-2 focus:ring-[#23055c] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-bold text-slate-700">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-4 py-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#23055c] focus:ring-2 focus:ring-[#23055c] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Password Criteria Checklist */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-[11px] text-left">
              <div className="font-bold text-slate-600 mb-1">
                Password Security Requirements:
              </div>
              <div
                className={`flex items-center gap-2 ${hasMinLength ? "text-emerald-700 font-semibold" : "text-slate-400"}`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${hasMinLength ? "bg-emerald-600" : "bg-slate-300"}`}
                />
                At least 8 characters
              </div>
              <div
                className={`flex items-center gap-2 ${hasUppercase && hasLowercase ? "text-emerald-700 font-semibold" : "text-slate-400"}`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${hasUppercase && hasLowercase ? "bg-emerald-600" : "bg-slate-300"}`}
                />
                Uppercase and lowercase letters
              </div>
              <div
                className={`flex items-center gap-2 ${hasNumber ? "text-emerald-700 font-semibold" : "text-slate-400"}`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${hasNumber ? "bg-emerald-600" : "bg-slate-300"}`}
                />
                At least one number (0–9)
              </div>
              <div
                className={`flex items-center gap-2 ${hasSpecial ? "text-emerald-700 font-semibold" : "text-slate-400"}`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${hasSpecial ? "bg-emerald-600" : "bg-slate-300"}`}
                />
                At least one special character (!@#$%^&*)
              </div>
              <div
                className={`flex items-center gap-2 ${passwordsMatch ? "text-emerald-700 font-semibold" : "text-slate-400"}`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${passwordsMatch ? "bg-emerald-600" : "bg-slate-300"}`}
                />
                Passwords match exactly
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !isPasswordValid}
              className="w-full py-3 px-6 rounded-xl text-xs font-bold bg-[#23055c] hover:bg-[#392271] text-white transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-4 group"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving Password...
                </>
              ) : (
                <>
                  <span>Save & Proceed to 2FA Setup</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        )}

        {/* ── STEP 2A: MFA METHOD SELECTION ──────────────────────────────── */}
        {currentStep === "MFA_SELECT" && (
          <div className="space-y-4">
            <div className="text-left mb-2">
              <p className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Choose Two-Factor Authentication Method
              </p>
              <p className="text-xs text-slate-500">
                All staff roles require MFA to protect internal workspace
                records and customer data.
              </p>
            </div>

            {/* Email OTP Option */}
            <div
              onClick={() => setMfaMethod("EMAIL_OTP")}
              className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-4 text-left ${
                mfaMethod === "EMAIL_OTP"
                  ? "border-[#23055c] bg-[#f8f5ff] shadow-sm"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div
                className={`p-2.5 rounded-lg shrink-0 ${
                  mfaMethod === "EMAIL_OTP"
                    ? "bg-[#23055c] text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                <Mail className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">
                    Email Passcode (OTP)
                  </h3>
                  <input
                    type="radio"
                    name="wizard_mfa_method"
                    checked={mfaMethod === "EMAIL_OTP"}
                    onChange={() => setMfaMethod("EMAIL_OTP")}
                    className="h-4 w-4 text-[#23055c] focus:ring-[#23055c]"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  A 6-digit code is dispatched to your registered email on every
                  sign-in. No extra apps needed.
                </p>
              </div>
            </div>

            {/* Authenticator App Option */}
            <div
              onClick={() => setMfaMethod("TOTP")}
              className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-4 text-left ${
                mfaMethod === "TOTP"
                  ? "border-[#23055c] bg-[#f8f5ff] shadow-sm"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div
                className={`p-2.5 rounded-lg shrink-0 ${
                  mfaMethod === "TOTP"
                    ? "bg-[#23055c] text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                <Smartphone className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">
                    Authenticator App (Recommended)
                  </h3>
                  <input
                    type="radio"
                    name="wizard_mfa_method"
                    checked={mfaMethod === "TOTP"}
                    onChange={() => setMfaMethod("TOTP")}
                    className="h-4 w-4 text-[#23055c] focus:ring-[#23055c]"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Works with Google Authenticator, Authy, or Microsoft
                  Authenticator for instant offline codes.
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={isInitializingMfa}
              onClick={handleProceedToMfaVerify}
              className="w-full bg-[#23055c] hover:bg-[#392271] text-white py-3 rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 mt-4 group"
            >
              {isInitializingMfa ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Preparing Verification...
                </>
              ) : (
                <>
                  <span>Continue to Verification</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>
        )}

        {/* ── STEP 2B: MFA VERIFICATION ──────────────────────────────────── */}
        {currentStep === "MFA_VERIFY" && (
          <form onSubmit={handleConfirmMfaSetup} className="space-y-4">
            {mfaMethod === "TOTP" && (
              <div className="space-y-3 text-left">
                <div>
                  <p className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                    1. Scan QR Code
                  </p>
                  <p className="text-xs text-slate-500 mb-3">
                    Open Google Authenticator or Authy and scan the barcode
                    below:
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4">
                  {qrCodeDataUri ? (
                    <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-xs shrink-0">
                      <img
                        src={qrCodeDataUri}
                        alt="MFA QR Code"
                        className="w-32 h-32"
                      />
                    </div>
                  ) : (
                    <div className="w-32 h-32 bg-slate-200 animate-pulse rounded-lg flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                    </div>
                  )}

                  <div className="flex-1 w-full text-left">
                    <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Manual Key:
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-mono font-bold text-[#23055c] flex-1 select-all break-all">
                        {manualEntryKey || "••••••••••••••••"}
                      </code>
                      <button
                        type="button"
                        onClick={handleCopyKey}
                        className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors shrink-0 cursor-pointer"
                        title="Copy Key"
                      >
                        {copiedKey ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <p className="text-xs font-bold text-slate-800 uppercase tracking-wider pt-2">
                  2. Enter 6-Digit Code
                </p>
              </div>
            )}

            {mfaMethod === "EMAIL_OTP" && (
              <div className="bg-[#f8f5ff] border border-[#23055c]/15 rounded-xl p-4 text-left">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-[#23055c] shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-xs font-bold text-slate-900">
                      Check Your Inbox
                    </h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      We have emailed a 6-digit test passcode to{" "}
                      <strong className="text-slate-800">
                        {userInfo?.email || "your email address"}
                      </strong>
                      . Enter it below to confirm delivery:
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Code Input */}
            <div className="space-y-1.5 text-left">
              <label
                className="block text-xs font-bold text-slate-700"
                htmlFor="wizard-mfa-code"
              >
                6-Digit Security Code
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  id="wizard-mfa-code"
                  type="text"
                  maxLength={8}
                  autoFocus
                  autoComplete="one-time-code"
                  placeholder="••••••"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  disabled={isLoading}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-lg font-mono font-bold tracking-widest text-center focus:bg-white focus:outline-none focus:border-[#23055c] focus:ring-2 focus:ring-[#23055c]"
                />
              </div>
            </div>

            {/* Resend OTP Link for Email */}
            {mfaMethod === "EMAIL_OTP" && (
              <div className="flex justify-between items-center text-xs pt-1">
                <span className="text-slate-500">Didn't receive code?</span>
                <button
                  type="button"
                  disabled={resendCooldown > 0 || isResending}
                  onClick={handleResendOtp}
                  className="font-bold text-[#23055c] hover:text-[#392271] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
                >
                  {isResending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  {resendCooldown > 0
                    ? `Resend in ${resendCooldown}s`
                    : "Resend Code"}
                </button>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setCurrentStep("MFA_SELECT");
                  setVerificationCode("");
                }}
                disabled={isLoading}
                className="px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>

              <button
                type="submit"
                disabled={isLoading || verificationCode.trim().length < 6}
                className="flex-1 bg-[#23055c] hover:bg-[#392271] text-white py-3 rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Activating MFA...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Complete Setup & Sign In
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Footer Area inside card */}
      <div className="bg-[#f1f4f9] px-8 py-3.5 border-t border-[#EBE7F5] text-center">
        <p className="text-[11px] text-slate-500 font-medium">
          Already set up?{" "}
          <Link
            href="/login"
            className="text-[#23055c] font-bold hover:underline"
          >
            Sign In here
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SetupAccountPage() {
  return (
    <div className="bg-[#ebeef3] min-h-screen flex items-center justify-center p-4 md:p-8 font-sans antialiased text-[#181c20] relative overflow-hidden">
      {/* Ambient background decoration */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none -z-10 opacity-30">
        <div className="w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-[#392271]/20 to-transparent absolute blur-[100px] -top-[150px] -right-[150px]" />
        <div className="w-[500px] h-[500px] rounded-full bg-gradient-to-bl from-[#bfa9fe]/30 to-transparent absolute blur-[80px] -bottom-[100px] -left-[100px]" />
      </div>

      <Suspense
        fallback={
          <div className="p-8 text-center text-xs text-slate-500">
            Loading setup interface...
          </div>
        }
      >
        <SetupAccountWizard />
      </Suspense>
    </div>
  );
}
