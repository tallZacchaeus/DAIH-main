"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, useAuth } from "@daih/api-client";
import { useToast } from "@daih/ui";
import { UserRole, MfaMethod } from "@daih/types";
import {
  Mail,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  ShieldCheck,
  Smartphone,
  RefreshCw,
} from "lucide-react";

export const AdminLoginForm: React.FC = () => {
  const router = useRouter();
  const {
    login,
    logout,
    user,
    isAuthenticated,
    isLoading: authLoading,
    setSession,
  } = useAuth();
  const toast = useToast();

  // Credentials State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // MFA Challenge State
  const [isMfaChallenge, setIsMfaChallenge] = useState(false);
  const [mfaChallengeToken, setMfaChallengeToken] = useState<string>("");
  const [mfaMethod, setMfaMethod] = useState<MfaMethod>("EMAIL_OTP");
  const [emailHint, setEmailHint] = useState<string>("");
  const [mfaCode, setMfaCode] = useState<string>("");
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [isResending, setIsResending] = useState(false);

  // If already authenticated with staff/admin role, automatically redirect to dashboard
  useEffect(() => {
    if (
      !authLoading &&
      isAuthenticated &&
      user &&
      user.role !== UserRole.CUSTOMER
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

  const validate = (): boolean => {
    if (!email.trim()) {
      toast.warning("Please enter your administrator email address.", {
        title: "Email Required",
      });
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.warning("Please enter a valid administrator email address.", {
        title: "Invalid Email Format",
      });
      return false;
    }

    if (!password) {
      toast.warning("Please enter your administrator password.", {
        title: "Password Required",
      });
      return false;
    }

    return true;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!validate()) return;

    setIsLoading(true);

    try {
      const response = await login({
        email: email.trim().toLowerCase(),
        password,
        portal: "admin",
      });

      // 1. Check if MFA setup is required
      if ("requiresMfaSetup" in response && response.requiresMfaSetup) {
        if (typeof window !== "undefined") {
          sessionStorage.setItem("daih_mfa_setup_token", response.setupToken);
        }
        toast.info(
          "First-time setup: Please configure your Two-Factor Authentication.",
          {
            title: "MFA Setup Required",
          },
        );
        router.push(
          `/setup-mfa?token=${encodeURIComponent(response.setupToken)}`,
        );
        return;
      }

      // 2. Check if MFA Challenge is required
      if ("requiresMfa" in response && response.requiresMfa) {
        setMfaChallengeToken(response.mfaChallengeToken);
        setMfaMethod(response.method);
        setEmailHint(response.emailHint || "");
        setIsMfaChallenge(true);
        if (response.method === "EMAIL_OTP") {
          setResendCooldown(60); // 60s cooldown for OTP
        }
        return;
      }

      // 3. Direct Login (non-MFA or already verified)
      const loggedUser = (response as any).user;
      if (loggedUser && loggedUser.role === UserRole.CUSTOMER) {
        await logout();
        const msg =
          "Access Denied: Customer accounts cannot access the Staff & Admin Console. Please use the Customer PWA.";
        setErrorMessage(msg);
        toast.error(msg, { title: "Access Denied" });
        return;
      }

      toast.success(
        `Welcome back, ${loggedUser?.firstName || "Admin"}! Redirecting to dashboard...`,
        {
          title: "Access Granted",
        },
      );

      router.replace("/");
    } catch (err: any) {
      const msg =
        err?.message || "Invalid administrator credentials. Please try again.";
      setErrorMessage(msg);
      toast.error(msg, { title: "Authentication Failed" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanCode = mfaCode.trim().replace(/\s/g, "");
    if (!cleanCode || cleanCode.length < 6) {
      toast.warning("Please enter the 6-digit verification code.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await api.auth.verifyMfaChallenge({
        mfaChallengeToken,
        code: cleanCode,
      });

      setSession(res.token, res.user as any);

      toast.success(`Welcome back, ${res.user.firstName}!`, {
        title: "Security Verified",
      });

      router.replace("/");
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

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    setErrorMessage(null);

    try {
      await api.auth.sendMfaOtp({ mfaChallengeToken });
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

  return (
    <div className="space-y-5">
      {/* Inline Error Alert */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span className="font-medium flex-1">{errorMessage}</span>
        </div>
      )}

      {!isMfaChallenge ? (
        /* ── Standard Email & Password Form ────────────────────────────── */
        <form noValidate onSubmit={handleLogin} className="space-y-4">
          {/* Email Field */}
          <div className="space-y-1.5 text-left">
            <label
              className="block text-xs font-bold text-slate-700"
              htmlFor="email"
            >
              Admin Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="admin@daihworkspace.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:bg-white focus:outline-none focus:border-[#23055c] focus:ring-2 focus:ring-[#23055c] transition-colors"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1.5 text-left">
            <label
              className="block text-xs font-bold text-slate-700"
              htmlFor="password"
            >
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:bg-white focus:outline-none focus:border-[#23055c] focus:ring-2 focus:ring-[#23055c] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-[#23055c] transition-colors cursor-pointer"
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

          {/* Remember Me & Forgot Password Row */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[#23055c] focus:ring-[#23055c] cursor-pointer"
              />
              <span>Keep me signed in</span>
            </label>

            <Link
              href="/forgot-password"
              className="text-xs font-semibold text-[#23055c] hover:text-[#392271] transition-colors"
            >
              Forgot Password?
            </Link>
          </div>

          {/* Action Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#392271] hover:bg-[#23055c] text-white py-3 rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2 group"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Signing In...
              </>
            ) : (
              <>
                Sign In
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
                    ? `A 6-digit code has been sent to ${emailHint || "your registered email"}.`
                    : "Enter the current 6-digit code shown in your authenticator app (Google Auth, Authy, etc.)."}
                </p>
              </div>
            </div>
          </div>

          {/* Code Input */}
          <div className="space-y-1.5 text-left">
            <label
              className="block text-xs font-bold text-slate-700"
              htmlFor="mfa-challenge-code"
            >
              6-Digit Security Code
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                id="mfa-challenge-code"
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
                  Verifying...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Verify & Sign In
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
