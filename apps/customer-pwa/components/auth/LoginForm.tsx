"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth, api } from "@daih/api-client";
import { useToast } from "@daih/ui";
import { UserRole } from "@daih/types";
import {
  Mail,
  Lock,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Eye,
  EyeOff,
} from "lucide-react";

export const LoginForm: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, logout } = useAuth();
  const toast = useToast();

  const rawRedirect = searchParams?.get("redirectTo") || "";
  const targetDestination =
    rawRedirect && rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")
      ? rawRedirect
      : "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<"idle" | "loading" | "sent">(
    "idle",
  );

  const validateForm = (): boolean => {
    if (!email.trim()) {
      toast.warning("Please enter your email address.", {
        title: "Email Required",
      });
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.warning(
        "Please enter a valid email address (e.g. name@company.com).",
        {
          title: "Invalid Email Format",
        },
      );
      return false;
    }

    if (!password) {
      toast.warning("Please enter your password.", {
        title: "Password Required",
      });
      return false;
    }

    return true;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setErrorCode(null);

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const res = await login({
        email: email.trim().toLowerCase(),
        password,
        portal: "customer",
      });

      if ("requiresMfaSetup" in res || "requiresMfa" in res) {
        await logout();
        const msg =
          "Access Restricted: Staff and Administrator accounts must use the Admin Portal.";
        setErrorMessage(msg);
        toast.error(msg, { title: "Staff Access Restricted" });
        return;
      }

      // Enforce Customer role access: block staff/admins from logging in as customers
      if (res.user.role !== UserRole.CUSTOMER) {
        await logout();
        const msg =
          "Access Restricted: Staff and Administrator accounts cannot sign in through the Customer PWA. Please use the Admin Portal.";
        setErrorMessage(msg);
        toast.error(msg, { title: "Staff Access Restricted" });
        return;
      }

      toast.success("Welcome back! Redirecting...", {
        title: "Sign In Successful",
      });
      router.push(targetDestination);
    } catch (err: any) {
      const code = err?.code || "AUTH_ERROR";
      const msg =
        err?.message || "Failed to sign in. Please verify your credentials.";
      setErrorCode(code);
      setErrorMessage(msg);

      if (code === "EMAIL_NOT_VERIFIED") {
        toast.warning(
          "Your email address is not verified yet. Please check your inbox or click resend below.",
          { title: "Email Verification Required" },
        );
      } else {
        toast.error(msg, { title: "Authentication Failed" });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email.trim()) {
      toast.warning(
        "Please enter your email address to receive a verification link.",
        {
          title: "Email Required",
        },
      );
      return;
    }

    setResendStatus("loading");
    try {
      await api.auth.resendVerification(email.trim().toLowerCase());
      setResendStatus("sent");
      toast.success(
        `Verification email sent to ${email.trim().toLowerCase()}`,
        {
          title: "Verification Link Sent",
        },
      );
    } catch (err: any) {
      const msg = err?.message || "Failed to resend verification email.";
      setErrorMessage(msg);
      toast.error(msg, { title: "Resend Failed" });
      setResendStatus("idle");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-left space-y-1.5">
        <div className="w-12 h-12 rounded-xl bg-purple-50 text-[#23055c] flex items-center justify-center mb-3">
          <KeyRound className="w-6 h-6" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#23055c] tracking-tight">
          Welcome Back
        </h1>
        <p className="text-sm text-slate-500">
          Sign in to access your workspace portal.
        </p>
      </div>

      {/* Error / Resend Alert */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200/80 text-xs text-rose-700 space-y-2">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="font-medium flex-1">{errorMessage}</span>
          </div>

          {errorCode === "EMAIL_NOT_VERIFIED" && (
            <div className="pt-2 border-t border-rose-200 flex items-center justify-between text-xs">
              <span className="text-slate-600">
                Need a new verification link?
              </span>
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resendStatus === "loading"}
                className="font-bold text-[#23055c] hover:underline cursor-pointer disabled:opacity-50"
              >
                {resendStatus === "loading"
                  ? "Sending..."
                  : resendStatus === "sent"
                    ? "Sent! Check Inbox"
                    : "Resend Email"}
              </button>
            </div>
          )}
        </div>
      )}

      {resendStatus === "sent" && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            Verification email sent. Please check your inbox or spam folder.
          </span>
        </div>
      )}

      {/* Login Form with noValidate */}
      <form noValidate onSubmit={handleLogin} className="space-y-4">
        {/* Email Field */}
        <div className="space-y-1.5">
          <label
            className="block text-xs font-bold text-slate-700"
            htmlFor="email"
          >
            Email Address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Mail className="w-4 h-4" />
            </div>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="block w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#23055c] focus:border-transparent transition-colors"
            />
          </div>
        </div>

        {/* Password Field */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label
              className="block text-xs font-bold text-slate-700"
              htmlFor="password"
            >
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-[#23055c] hover:text-[#392271] font-semibold transition-colors"
            >
              Forgot Password?
            </Link>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className="block w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#23055c] focus:border-transparent transition-colors"
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-[#23055c] transition-colors cursor-pointer"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center py-3.5 px-4 rounded-xl bg-[#23055c] hover:bg-[#392271] text-white font-semibold text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer gap-2 group"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
                Signing In...
              </>
            ) : (
              <>
                Sign In
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
