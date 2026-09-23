"use client";

import React, { useState, Suspense, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@daih/api-client";
import { useToast } from "@daih/ui";
import {
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  ArrowRight,
  ArrowLeft,
  Check,
} from "lucide-react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const toast = useToast();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    token
      ? null
      : "Missing password reset token in URL. Please use the link sent to your email.",
  );

  const criteria = useMemo(() => {
    return {
      minLength: password.length >= 8,
      hasUpper: /[A-Z]/.test(password),
      hasLower: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };
  }, [password]);

  const isValidPassword =
    criteria.minLength &&
    criteria.hasUpper &&
    criteria.hasLower &&
    criteria.hasNumber &&
    criteria.hasSpecial;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!token) {
      setErrorMessage("No password reset token was provided in the link.");
      toast.error("Invalid reset link");
      return;
    }

    if (!isValidPassword) {
      setErrorMessage("Password does not meet all security complexity rules.");
      toast.warning("Password does not meet security rules");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please verify and re-enter.");
      toast.warning("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      await api.auth.resetPassword({
        token,
        newPassword: password,
      });

      setIsSuccess(true);
      toast.success("Your administrator password has been updated.");
    } catch (err: any) {
      const msg =
        err?.message || "Failed to reset password. The link may have expired.";
      setErrorMessage(msg);
      toast.error(msg, { title: "Reset Failed" });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-xs border border-emerald-100">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Password Reset Complete
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Your administrator password has been securely updated. You can now
            log in to the DAIH Admin Console.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/login"
            className="w-full bg-[#23055c] hover:bg-[#392271] text-white py-3 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-2"
          >
            <span>Proceed to Admin Login</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-xs text-slate-600 leading-relaxed">
        Choose a strong, unique password to secure your administrator console
        access.
      </p>

      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span className="font-medium flex-1">{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* New Password */}
        <div className="space-y-1.5 text-left">
          <label
            htmlFor="new-password"
            className="block text-xs font-bold text-slate-700"
          >
            New Password <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              id="new-password"
              name="new-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              placeholder="Enter new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading || !token}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs sm:text-sm focus:bg-white focus:outline-none focus:border-[#23055c] focus:ring-2 focus:ring-[#23055c]/20 transition-colors pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Complexity Rules */}
          {password && (
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1 mt-1 text-[11px]">
              <span
                className={`flex items-center gap-1.5 ${
                  criteria.minLength
                    ? "text-emerald-700 font-bold"
                    : "text-slate-400"
                }`}
              >
                {criteria.minLength ? "✓" : "○"} 8+ characters
              </span>
              <span
                className={`flex items-center gap-1.5 ${
                  criteria.hasUpper
                    ? "text-emerald-700 font-bold"
                    : "text-slate-400"
                }`}
              >
                {criteria.hasUpper ? "✓" : "○"} Uppercase letter (A-Z)
              </span>
              <span
                className={`flex items-center gap-1.5 ${
                  criteria.hasLower
                    ? "text-emerald-700 font-bold"
                    : "text-slate-400"
                }`}
              >
                {criteria.hasLower ? "✓" : "○"} Lowercase letter (a-z)
              </span>
              <span
                className={`flex items-center gap-1.5 ${
                  criteria.hasNumber
                    ? "text-emerald-700 font-bold"
                    : "text-slate-400"
                }`}
              >
                {criteria.hasNumber ? "✓" : "○"} Numeric digit (0-9)
              </span>
              <span
                className={`flex items-center gap-1.5 ${
                  criteria.hasSpecial
                    ? "text-emerald-700 font-bold"
                    : "text-slate-400"
                }`}
              >
                {criteria.hasSpecial ? "✓" : "○"} Special character (!@#$)
              </span>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5 text-left">
          <label
            htmlFor="confirm-password"
            className="block text-xs font-bold text-slate-700"
          >
            Confirm Password <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              id="confirm-password"
              name="confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading || !token}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs sm:text-sm focus:bg-white focus:outline-none focus:border-[#23055c] focus:ring-2 focus:ring-[#23055c]/20 transition-colors pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              {showConfirmPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          {confirmPassword && password !== confirmPassword && (
            <p className="text-[11px] text-rose-500 font-medium">
              Passwords do not match.
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={
            isLoading ||
            !isValidPassword ||
            password !== confirmPassword ||
            !token
          }
          className="w-full bg-[#392271] hover:bg-[#23055c] text-white py-3 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Updating Password...</span>
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              <span>Reset &amp; Save Password</span>
            </>
          )}
        </button>

        <div className="pt-2 text-center">
          <Link
            href="/login"
            className="text-xs font-semibold text-slate-500 hover:text-[#23055c] inline-flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Login
          </Link>
        </div>
      </form>
    </div>
  );
}

export default function AdminResetPasswordPage() {
  return (
    <div className="bg-white md:bg-[#ebeef3] min-h-screen flex items-stretch md:items-center justify-center p-0 md:p-8 font-sans antialiased text-[#181c20] relative overflow-x-hidden">
      {/* Ambient background decoration */}
      <div className="hidden md:block absolute inset-0 w-full h-full overflow-hidden pointer-events-none -z-10 opacity-30">
        <div className="w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-[#392271]/20 to-transparent absolute blur-[100px] -top-[150px] -right-[150px]" />
        <div className="w-[500px] h-[500px] rounded-full bg-gradient-to-bl from-[#bfa9fe]/30 to-transparent absolute blur-[80px] -bottom-[100px] -left-[100px]" />
      </div>

      <div className="w-full max-w-none md:max-w-md bg-white rounded-none md:rounded-2xl border-0 md:border md:border-[#EBE7F5] shadow-none md:shadow-[0px_12px_32px_rgba(57,34,113,0.08)] overflow-hidden flex flex-col justify-between md:justify-start min-h-screen md:min-h-0">
        {/* Header Section */}
        <div className="p-6 sm:p-8 pb-6 text-center border-b border-slate-100">
          <Link href="/" className="inline-block mb-4">
            <img
              src="/images/logo.png"
              alt="DAIH Workspace Logo"
              className="mx-auto h-10 w-auto object-contain"
            />
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-[#181c20] tracking-tight mb-1">
            Create New Password
          </h1>
          <p className="text-xs text-slate-500 font-semibold flex items-center justify-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-[#23055c]" />
            Admin Security Setup
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 flex-1 md:flex-none">
          <Suspense
            fallback={
              <div className="min-h-[200px] flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-[#23055c] animate-spin" />
              </div>
            }
          >
            <ResetPasswordForm />
          </Suspense>
        </div>

        {/* Footer Area */}
        <div className="bg-[#f1f4f9] px-6 sm:px-8 py-3.5 border-t border-[#EBE7F5] text-center">
          <p className="text-[11px] text-slate-500 font-medium">
            Internal use only. Unauthorized access is prohibited.
          </p>
        </div>
      </div>
    </div>
  );
}
