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
  Lock,
} from "lucide-react";
import { api } from "@daih/api-client";
import { useToast } from "@daih/ui";

export default function AdminForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const toast = useToast();

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

    return true;
  };

  const isSubmittingRef = React.useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setErrorMessage(null);

    if (!validate()) {
      setTimeout(() => {
        isSubmittingRef.current = false;
      }, 600);
      return;
    }

    setIsLoading(true);

    try {
      await api.auth.requestPasswordReset(email.trim().toLowerCase());
      setIsSubmitted(true);
      toast.success(
        `Password reset instructions sent to ${email.trim().toLowerCase()}`,
        {
          title: "Reset Link Sent",
        },
      );
    } catch (err: any) {
      const msg =
        err?.message || "Failed to request password reset. Please try again.";
      setErrorMessage(msg);
      toast.error(msg, { title: "Request Failed" });
    } finally {
      setIsLoading(false);
      isSubmittingRef.current = false;
    }
  };

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
            Reset Admin Password
          </h1>
          <p className="text-xs text-slate-500 font-semibold flex items-center justify-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-[#23055c]" />
            Secure Credential Recovery
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 flex-1 md:flex-none">
          {isSubmitted ? (
            <div className="text-center space-y-5">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-xs border border-emerald-100">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1.5">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  Check Your Inbox
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  If an administrator account exists for{" "}
                  <strong className="text-slate-900 break-all">{email}</strong>,
                  we have sent password reset instructions with a secure link.
                </p>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Please check your junk or spam folder if the email does not
                appear in your inbox within a few minutes.
              </p>

              <div className="pt-3 flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsSubmitted(false);
                    setEmail("");
                  }}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Try a different email
                </button>

                <div className="pt-3 border-t border-slate-100">
                  <Link
                    href="/login"
                    className="font-bold text-xs text-[#23055c] hover:text-[#392271] transition-colors inline-flex items-center gap-1.5 group mx-auto"
                  >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Back to Admin Login
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <p className="text-xs text-slate-600 leading-relaxed">
                Enter your registered administrator email address. We will
                verify your account and email you a password reset link.
              </p>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="font-medium flex-1">{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5 text-left">
                  <label
                    htmlFor="email"
                    className="block text-xs font-bold text-slate-700"
                  >
                    Admin Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      placeholder="admin@daihworkspace.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs sm:text-sm focus:bg-white focus:outline-none focus:border-[#23055c] focus:ring-2 focus:ring-[#23055c]/20 transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#392271] hover:bg-[#23055c] text-white py-3 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 mt-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending Reset Link...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Password Reset Link</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="pt-2 text-center">
                  <Link
                    href="/login"
                    className="text-xs font-semibold text-slate-500 hover:text-[#23055c] inline-flex items-center gap-1.5 transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Return to Login
                  </Link>
                </div>
              </form>
            </div>
          )}
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
