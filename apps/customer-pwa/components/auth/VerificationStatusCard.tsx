"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

interface VerificationStatusCardProps {
  status: "verifying" | "success" | "error" | "already_used";
  errorMessage?: string | null;
  errorCode?: string | null;
  resendEmail: string;
  onResendEmailChange: (value: string) => void;
  onResendSubmit: (e: React.FormEvent) => void;
  resendStatus: "idle" | "loading" | "sent";
}

export const VerificationStatusCard: React.FC<VerificationStatusCardProps> = ({
  status,
  errorMessage,
  errorCode,
  resendEmail,
  onResendEmailChange,
  onResendSubmit,
  resendStatus,
}) => {
  const [showResend, setShowResend] = useState(false);

  const isAlreadyUsed =
    status === "already_used" || errorCode === "TOKEN_ALREADY_USED";

  return (
    <div className="bg-white/85 backdrop-blur-md rounded-2xl border border-[#EBE7F5] shadow-[0px_12px_32px_rgba(57,34,113,0.08)] p-8 sm:p-10 flex flex-col items-center text-center w-full max-w-md">
      {/* 1. Verifying State */}
      {status === "verifying" && (
        <div className="py-6 space-y-4">
          <div className="w-20 h-20 rounded-full bg-[#EBE7F5] flex items-center justify-center mx-auto text-[#23055c]">
            <Loader2 className="w-10 h-10 animate-spin" />
          </div>
          <h2 className="text-2xl font-bold text-[#23055c] tracking-tight">
            Verifying your email...
          </h2>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Please wait while we validate your activation token with the
            workspace registry.
          </p>
        </div>
      )}

      {/* 2. Success State */}
      {status === "success" && (
        <>
          <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-6 shadow-xs border border-emerald-100">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#23055c] tracking-tight mb-3">
            Email Verified!
          </h1>

          <p className="text-sm text-slate-600 mb-8 leading-relaxed">
            Your email address has been successfully confirmed. You now have
            full access to your DAIH Workspace account.
          </p>

          <div className="w-full">
            <Link
              href="/login"
              className="w-full bg-[#23055c] hover:bg-[#392271] text-white font-semibold text-sm py-3.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-[0_4px_14px_0_rgba(35,5,92,0.25)] hover:shadow-[0_6px_20px_rgba(35,5,92,0.23)] cursor-pointer"
            >
              Proceed to Sign In <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </>
      )}

      {/* 3. Link Already Used State (Strict Single-Use Pattern) */}
      {isAlreadyUsed && (
        <>
          <div className="w-20 h-20 rounded-full bg-[#EBE7F5] text-[#23055c] flex items-center justify-center mb-6 shadow-xs border border-[#23055c]/10">
            <ShieldCheck className="w-10 h-10 text-[#23055c]" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#23055c] tracking-tight mb-6">
            Link Already Used
          </h1>

          <div className="w-full space-y-3 mb-6">
            <Link
              href="/login"
              className="w-full bg-[#23055c] hover:bg-[#392271] text-white font-semibold text-sm py-3.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-[0_4px_14px_0_rgba(35,5,92,0.25)] hover:shadow-[0_6px_20px_rgba(35,5,92,0.23)] cursor-pointer"
            >
              Proceed to Sign In <ArrowRight className="w-4 h-4" />
            </Link>

            {!showResend && (
              <button
                type="button"
                onClick={() => setShowResend(true)}
                className="w-full text-xs text-slate-500 hover:text-[#23055c] font-medium py-2 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Still need to verify? Request new link
              </button>
            )}
          </div>

          {showResend && (
            <div className="w-full border-t border-slate-100 pt-5">
              {resendStatus === "sent" ? (
                <div className="w-full p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center justify-center gap-2 mb-4">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    A new verification link has been sent to your email.
                  </span>
                </div>
              ) : (
                <form
                  noValidate
                  onSubmit={onResendSubmit}
                  className="w-full space-y-3 mb-4 text-left"
                >
                  <label
                    className="text-xs font-bold text-slate-700 block"
                    htmlFor="resendEmail"
                  >
                    Request New Verification Link
                  </label>
                  <input
                    id="resendEmail"
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={resendEmail}
                    onChange={(e) => onResendEmailChange(e.target.value)}
                    disabled={resendStatus === "loading"}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:border-[#23055c] focus:ring-2 focus:ring-[#23055c] transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={resendStatus === "loading"}
                    className="w-full bg-transparent border border-slate-300 hover:border-[#23055c] text-[#23055c] font-semibold text-sm py-3 rounded-xl hover:bg-[#F8F9FA] transition-colors duration-200 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {resendStatus === "loading" ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending Link...
                      </>
                    ) : (
                      "Resend Verification Email"
                    )}
                  </button>
                </form>
              )}
            </div>
          )}
        </>
      )}

      {/* 4. Other Failure State (Expired or Invalid) */}
      {status === "error" && !isAlreadyUsed && (
        <>
          <div className="w-20 h-20 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-6 shadow-xs border border-rose-100">
            <AlertCircle className="w-10 h-10" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#23055c] tracking-tight mb-3">
            Verification Failed
          </h1>

          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            {errorMessage ||
              "This verification link is invalid or has expired."}
          </p>

          {resendStatus === "sent" ? (
            <div className="w-full p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center justify-center gap-2 mb-4">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>A new verification link has been sent to your email.</span>
            </div>
          ) : (
            <form
              noValidate
              onSubmit={onResendSubmit}
              className="w-full space-y-3 mb-4 text-left"
            >
              <label
                className="text-xs font-bold text-slate-700 block"
                htmlFor="resendEmail"
              >
                Request New Verification Link
              </label>
              <input
                id="resendEmail"
                type="email"
                required
                placeholder="name@company.com"
                value={resendEmail}
                onChange={(e) => onResendEmailChange(e.target.value)}
                disabled={resendStatus === "loading"}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:border-[#23055c] focus:ring-2 focus:ring-[#23055c] transition-colors"
              />
              <button
                type="submit"
                disabled={resendStatus === "loading"}
                className="w-full bg-transparent border border-slate-300 hover:border-[#23055c] text-[#23055c] font-semibold text-sm py-3 rounded-xl hover:bg-[#F8F9FA] transition-colors duration-200 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {resendStatus === "loading" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending Link...
                  </>
                ) : (
                  "Resend Verification Email"
                )}
              </button>
            </form>
          )}

          <div className="pt-4 border-t border-[#EBE7F5] w-full">
            <Link
              href="/login"
              className="text-slate-500 hover:text-[#23055c] transition-colors text-xs font-semibold flex items-center justify-center gap-1 group mx-auto"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Back to login
            </Link>
          </div>
        </>
      )}
    </div>
  );
};
