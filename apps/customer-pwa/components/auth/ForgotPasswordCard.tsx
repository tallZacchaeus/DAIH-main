"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Mail,
  KeyRound,
  ArrowLeft,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { api } from "@daih/api-client";
import { useToast } from "@daih/ui";

export const ForgotPasswordCard: React.FC = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const toast = useToast();

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

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      await api.auth.requestPasswordReset(email.trim().toLowerCase());
      setIsSubmitted(true);
      toast.success(
        `Password reset instructions sent to ${email.trim().toLowerCase()}`,
        {
          title: "Instructions Sent",
        },
      );
    } catch (err: any) {
      const msg =
        err?.message || "Failed to request password reset. Please try again.";
      setErrorMessage(msg);
      toast.error(msg, { title: "Reset Request Failed" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      {/* Brand Identity / Top Header */}
      <div className="text-center mb-8">
        <Link href="/" className="inline-block">
          <img
            src="/images/logo.png"
            alt="DAIH Workspace"
            className="h-10 w-auto object-contain mx-auto"
          />
        </Link>
      </div>

      {/* Glassmorphic Forgot Password Card */}
      <div className="bg-white/90 backdrop-blur-md border border-[#EBE7F5] rounded-2xl shadow-[0_12px_32px_rgba(57,34,113,0.05)] p-8 sm:p-10 relative z-10 transition-shadow hover:shadow-[0_16px_40px_rgba(57,34,113,0.08)] duration-300">
        {isSubmitted ? (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-xs border border-emerald-100">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#181c20] tracking-tight">
                Check Your Inbox
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                If an account exists with{" "}
                <strong className="text-slate-900 break-all">{email}</strong>,
                we have dispatched instructions to reset your password.
              </p>
            </div>

            <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
              Please check your spam or junk folder if you do not see the email
              within a few minutes.
            </p>

            <div className="pt-2 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsSubmitted(false);
                  setEmail("");
                }}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
              >
                Send to a different email
              </button>

              <div className="pt-4 border-t border-[#EBE7F5]">
                <Link
                  href="/login"
                  className="font-semibold text-xs text-[#23055c] hover:text-[#392271] transition-colors inline-flex items-center gap-1.5 group mx-auto"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  Back to Login
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-purple-50 text-[#23055c] mb-4 border border-purple-100/60 shadow-xs">
                <KeyRound className="w-7 h-7" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#181c20] tracking-tight mb-2">
                Forgot Password?
              </h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                Enter your registered email address to receive a secure password
                reset link.
              </p>
            </div>

            {/* Inline Error Alert */}
            {errorMessage && (
              <div className="p-3.5 mb-6 rounded-xl bg-rose-50 border border-rose-200/80 text-xs text-rose-700 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="font-medium flex-1">{errorMessage}</span>
              </div>
            )}

            {/* Form */}
            <form noValidate onSubmit={handleSubmit} className="space-y-5">
              {/* Email Input */}
              <div className="space-y-1.5">
                <label
                  className="block text-xs font-bold text-slate-700"
                  htmlFor="email"
                >
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    className="block w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 text-sm focus:bg-white focus:outline-none focus:border-[#23055c] focus:ring-2 focus:ring-[#23055c] transition-colors"
                  />
                </div>
              </div>

              {/* Action Button */}
              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center items-center gap-2 py-3.5 px-4 rounded-xl shadow-md hover:shadow-lg font-bold text-sm text-white bg-[#23055c] hover:bg-[#392271] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#23055c] transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending Reset Link...
                    </>
                  ) : (
                    <>
                      Send Reset Link
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Back to Login */}
            <div className="mt-8 pt-6 border-t border-[#EBE7F5] text-center">
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
