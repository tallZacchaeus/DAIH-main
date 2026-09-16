"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, useAuth } from "@daih/api-client";
import { UserRole, MfaMethod } from "@daih/types";
import {
  ShieldCheck,
  Lock,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Smartphone,
  RefreshCw,
} from "lucide-react";

export default function ReceptionLoginPage() {
  const router = useRouter();
  const {
    login,
    user,
    isAuthenticated,
    isLoading: authLoading,
    setSession,
  } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // MFA Challenge State
  const [isMfaChallenge, setIsMfaChallenge] = useState(false);
  const [mfaChallengeToken, setMfaChallengeToken] = useState<string>("");
  const [mfaMethod, setMfaMethod] = useState<MfaMethod>("EMAIL_OTP");
  const [emailHint, setEmailHint] = useState<string>("");
  const [mfaCode, setMfaCode] = useState<string>("");
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [isResending, setIsResending] = useState(false);

  const allowedRoles = [
    UserRole.RECEPTION_OFFICER,
    UserRole.SECURITY_OFFICER,
    UserRole.OPERATIONS_ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.MANAGEMENT_VIEWER,
  ];

  // If already authenticated with authorized role, redirect to scanner
  useEffect(() => {
    if (
      !authLoading &&
      isAuthenticated &&
      user &&
      allowedRoles.includes(user.role as UserRole)
    ) {
      router.replace("/");
    }
  }, [authLoading, isAuthenticated, user, router]);

  // Resend OTP Cooldown Timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await login({
        email: email.trim(),
        password,
        portal: "admin",
        audience: "ADMIN",
      });

      // 1. Check if MFA setup is required
      if ("requiresMfaSetup" in response && response.requiresMfaSetup) {
        setError(
          "MFA Setup Required: Please log in via the Admin Console to configure your Two-Factor Authentication first.",
        );
        return;
      }

      // 2. Check if MFA challenge is required
      if ("requiresMfa" in response && response.requiresMfa) {
        setMfaChallengeToken(response.mfaChallengeToken);
        setMfaMethod(response.method);
        setEmailHint(response.emailHint || "");
        setIsMfaChallenge(true);
        if (response.method === "EMAIL_OTP") {
          setResendCooldown(60);
        }
        return;
      }

      // 3. Direct login verification
      const userProfile = (response as any).user;
      if (!allowedRoles.includes(userProfile.role)) {
        setError(
          "Access Denied: Your account role does not have permission to operate the Reception Scanner Terminal.",
        );
        return;
      }

      router.push("/");
    } catch (err: any) {
      setError(
        err?.message || "Invalid credentials or unauthorized staff account.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanCode = mfaCode.trim().replace(/\s/g, "");
    if (!cleanCode || cleanCode.length < 6) {
      setError("Please enter the 6-digit verification code.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await api.auth.verifyMfaChallenge({
        mfaChallengeToken,
        code: cleanCode,
      });

      if (!allowedRoles.includes(res.user.role as UserRole)) {
        setError(
          "Access Denied: Your account role does not have permission to operate the Reception Scanner Terminal.",
        );
        return;
      }

      setSession(res.token, res.user as any);
      router.push("/");
    } catch (err: any) {
      setError(
        err?.message ||
          "Invalid or expired verification code. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    setError(null);

    try {
      await api.auth.sendMfaOtp({ mfaChallengeToken });
      setResendCooldown(60);
    } catch (err: any) {
      setError(err?.message || "Failed to resend code. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="bg-[#ebeef3] min-h-screen flex items-center justify-center p-4 md:p-8 font-sans antialiased text-[#181c20] relative overflow-hidden">
      {/* Ambient background decoration */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none -z-10 opacity-30">
        <div className="w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-[#392271]/20 to-transparent absolute blur-[100px] -top-[150px] -right-[150px]" />
        <div className="w-[500px] h-[500px] rounded-full bg-gradient-to-bl from-[#bfa9fe]/30 to-transparent absolute blur-[80px] -bottom-[100px] -left-[100px]" />
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl border border-[#EBE7F5] shadow-[0px_12px_32px_rgba(57,34,113,0.08)] overflow-hidden">
        {/* Card Header */}
        <div className="p-8 pb-6 text-center border-b border-slate-100">
          <Link href="/" className="inline-block mb-4">
            <img
              src="/images/logo.png"
              alt="DAIH Workspace Logo"
              className="mx-auto h-11 w-auto object-contain"
            />
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-[#181c20] tracking-tight mb-1">
            Reception & Gate Terminal
          </h1>
          <p className="text-xs text-slate-500 font-medium flex items-center justify-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-[#23055c]" />
            Authorized Terminal Hardware Gateway
          </p>
        </div>

        {/* Form Body */}
        <div className="p-8 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-medium flex-1">{error}</span>
            </div>
          )}

          {!isMfaChallenge ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <div className="space-y-1.5 text-left">
                <label
                  className="block text-xs font-bold text-slate-700"
                  htmlFor="staff-email"
                >
                  Staff Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="staff-email"
                    type="email"
                    placeholder="officer@daih.ng"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:bg-white focus:outline-none focus:border-[#23055c] focus:ring-2 focus:ring-[#23055c] transition-colors"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1.5 text-left">
                <label
                  className="block text-xs font-bold text-slate-700"
                  htmlFor="staff-password"
                >
                  Staff Security Key
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    id="staff-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    required
                    className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:bg-white focus:outline-none focus:border-[#23055c] focus:ring-2 focus:ring-[#23055c] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-[#23055c] transition-colors cursor-pointer"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#392271] hover:bg-[#23055c] text-white py-3 rounded-xl font-bold text-xs transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2 group"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Authenticating Officer...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Unlock Terminal & Open Scanner</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* ── Two-Factor Authentication Challenge Screen ──────────────────── */
            <form onSubmit={handleVerifyMfa} className="space-y-4">
              <div className="bg-[#f8f5ff] border border-[#23055c]/15 rounded-xl p-4 text-left">
                <div className="flex items-start gap-3">
                  {mfaMethod === "EMAIL_OTP" ? (
                    <Mail className="w-5 h-5 text-[#23055c] shrink-0 mt-0.5" />
                  ) : (
                    <Smartphone className="w-5 h-5 text-[#23055c] shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <h4 className="text-xs font-bold text-slate-900">
                      {mfaMethod === "EMAIL_OTP"
                        ? "Enter Email Verification Code"
                        : "Enter Authenticator App Code"}
                    </h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {mfaMethod === "EMAIL_OTP"
                        ? `A 6-digit code has been sent to ${emailHint || "your staff email"}.`
                        : "Enter the current 6-digit code from your authenticator app."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Code Input */}
              <div className="space-y-1.5 text-left">
                <label
                  className="block text-xs font-bold text-slate-700"
                  htmlFor="terminal-mfa-code"
                >
                  6-Digit Security Code
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    id="terminal-mfa-code"
                    type="text"
                    maxLength={8}
                    autoFocus
                    autoComplete="one-time-code"
                    placeholder="••••••"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    disabled={isLoading}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xl font-mono font-bold tracking-widest text-center focus:bg-white focus:outline-none focus:border-[#23055c] focus:ring-2 focus:ring-[#23055c]"
                  />
                </div>
              </div>

              {/* Resend Link for Email OTP */}
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
                    setIsMfaChallenge(false);
                    setMfaCode("");
                  }}
                  disabled={isLoading}
                  className="px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors flex items-center gap-1.5 shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>

                <button
                  type="submit"
                  disabled={isLoading || mfaCode.trim().length < 6}
                  className="flex-1 bg-[#392271] hover:bg-[#23055c] text-white py-3 rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Unlocking...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      Verify & Open Scanner
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer Area */}
        <div className="bg-[#f1f4f9] px-8 py-3.5 border-t border-[#EBE7F5] text-center">
          <p className="text-[11px] text-slate-500 font-medium">
            DAIH Workspace Platform · Terminal Hardware Gateway v1.5
          </p>
        </div>
      </div>
    </div>
  );
}
