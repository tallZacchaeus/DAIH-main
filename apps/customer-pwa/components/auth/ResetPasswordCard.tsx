"use client";

import React, { useState } from "react";
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

export const ResetPasswordCard: React.FC = () => {
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
    token ? null : "No password reset token was provided in the URL link.",
  );

  // Compute Password Strength
  const calculateStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score += 1;
    return score;
  };

  const strength = calculateStrength(password);

  const getStrengthMeta = () => {
    if (!password) return { text: "None", color: "bg-slate-200", count: 0 };
    if (strength <= 1) return { text: "Weak", color: "bg-rose-500", count: 1 };
    if (strength === 2)
      return { text: "Fair", color: "bg-amber-500", count: 2 };
    if (strength === 3) return { text: "Good", color: "bg-blue-500", count: 3 };
    return { text: "Strong", color: "bg-emerald-500", count: 4 };
  };

  const strengthMeta = getStrengthMeta();

  const hasMinLength = password.length >= 8;
  const hasNumberOrSymbol = /[0-9]|[^A-Za-z0-9]/.test(password);

  const validate = (): boolean => {
    if (!token) {
      toast.error("Missing or invalid password reset token in link.", {
        title: "Invalid Token",
      });
      return false;
    }

    const missing: string[] = [];
    if (password.length < 8) missing.push("at least 8 characters");
    if (!/[A-Z]/.test(password)) missing.push("an uppercase letter (A-Z)");
    if (!/[a-z]/.test(password)) missing.push("a lowercase letter (a-z)");
    if (!/[0-9]/.test(password)) missing.push("a number (0-9)");
    if (!/[^A-Za-z0-9]/.test(password))
      missing.push("a special symbol (!@#$%^&*)");

    if (missing.length > 0) {
      const friendlyMsg = `Your password needs ${missing.join(", ")}.`;
      setErrorMessage(friendlyMsg);
      toast.warning(friendlyMsg, {
        title: "Password Requirements",
      });
      return false;
    }

    if (password !== confirmPassword) {
      toast.warning("Passwords do not match. Please re-enter your password.", {
        title: "Password Mismatch",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!validate()) return;

    setIsLoading(true);

    try {
      await api.auth.confirmPasswordReset({
        token: token!,
        newPassword: password,
      });
      setIsSuccess(true);
      toast.success("Your password has been reset successfully!", {
        title: "Password Updated",
      });
    } catch (err: any) {
      const msg =
        err?.message ||
        "Failed to reset password. The reset link may have expired or already been used.";
      setErrorMessage(msg);
      toast.error(msg, { title: "Reset Failed" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      {/* Brand Identity */}
      <div className="text-center mb-6">
        <Link href="/" className="inline-block">
          <img
            src="/images/logo.png"
            alt="DAIH Workspace"
            className="h-10 w-auto object-contain mx-auto"
          />
        </Link>
      </div>

      {/* Glassmorphic Card Container */}
      <div className="bg-white/90 backdrop-blur-md border border-[#EBE7F5] rounded-2xl shadow-[0_12px_32px_rgba(57,34,113,0.08)] p-8 sm:p-10 relative z-10">
        {isSuccess ? (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-xs border border-emerald-100">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#181c20] tracking-tight">
                Password Updated
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Your password has been successfully reset. Existing sessions
                have been securely revoked.
              </p>
            </div>

            <div className="pt-2">
              <Link
                href="/login"
                className="w-full inline-flex justify-center items-center gap-2 py-3.5 px-6 rounded-xl font-bold text-sm text-white bg-[#23055c] hover:bg-[#392271] transition-all shadow-md hover:shadow-lg cursor-pointer"
              >
                Return to Sign In <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-purple-50 text-[#23055c] mb-3 border border-purple-100/60 shadow-xs">
                <KeyRound className="w-7 h-7" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#181c20] tracking-tight mb-1">
                Reset Password
              </h1>
              <p className="text-sm text-slate-500">
                Enter your new password below to secure your account.
              </p>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="p-3.5 mb-5 rounded-xl bg-rose-50 border border-rose-200/80 text-xs text-rose-700 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="font-medium flex-1">{errorMessage}</span>
              </div>
            )}

            {/* Reset Form */}
            <form noValidate onSubmit={handleSubmit} className="space-y-4">
              {/* New Password Input */}
              <div className="space-y-1.5">
                <label
                  className="block text-xs font-bold text-slate-700"
                  htmlFor="newPassword"
                >
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="newPassword"
                    name="newPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading || !token}
                    className="w-full pl-4 pr-11 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:bg-white focus:outline-none focus:border-[#23055c] focus:ring-2 focus:ring-[#23055c] transition-colors"
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

                {/* Password Strength Meter */}
                {password.length > 0 && (
                  <div className="pt-1.5 space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-500 font-semibold">
                      <span>Password Strength</span>
                      <span
                        className={
                          strengthMeta.count <= 1
                            ? "text-rose-600"
                            : strengthMeta.count === 2
                              ? "text-amber-600"
                              : "text-emerald-600"
                        }
                      >
                        {strengthMeta.text}
                      </span>
                    </div>
                    <div className="flex gap-1.5 h-1.5">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={`flex-1 rounded-full transition-all duration-300 ${
                            step <= strengthMeta.count
                              ? strengthMeta.color
                              : "bg-slate-200"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password Input */}
              <div className="space-y-1.5">
                <label
                  className="block text-xs font-bold text-slate-700"
                  htmlFor="confirmPassword"
                >
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading || !token}
                    className="w-full pl-4 pr-11 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:bg-white focus:outline-none focus:border-[#23055c] focus:ring-2 focus:ring-[#23055c] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-[#23055c] transition-colors cursor-pointer"
                    aria-label={
                      showConfirmPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Requirements List */}
              <ul className="space-y-1.5 pt-1 text-xs text-slate-500 font-medium">
                <li
                  className={`flex items-center gap-2 transition-colors ${
                    hasMinLength
                      ? "text-emerald-600 font-bold"
                      : "text-slate-500"
                  }`}
                >
                  <Check
                    className={`w-3.5 h-3.5 ${
                      hasMinLength ? "text-emerald-500" : "text-slate-300"
                    }`}
                  />
                  At least 8 characters
                </li>
                <li
                  className={`flex items-center gap-2 transition-colors ${
                    hasNumberOrSymbol
                      ? "text-emerald-600 font-bold"
                      : "text-slate-500"
                  }`}
                >
                  <Check
                    className={`w-3.5 h-3.5 ${
                      hasNumberOrSymbol ? "text-emerald-500" : "text-slate-300"
                    }`}
                  />
                  Contains a number or symbol
                </li>
              </ul>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || !token}
                className="w-full bg-[#23055c] hover:bg-[#392271] text-white py-3 rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Updating Password...
                  </>
                ) : (
                  "Update Password"
                )}
              </button>
            </form>

            {/* Back to Login */}
            <div className="mt-6 pt-5 border-t border-[#EBE7F5] text-center">
              <Link
                href="/login"
                className="font-semibold text-xs text-[#23055c] hover:text-[#392271] transition-colors inline-flex items-center gap-1.5 group mx-auto"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Back to Login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
