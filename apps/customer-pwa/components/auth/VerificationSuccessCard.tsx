"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Mail,
  ArrowLeft,
  ExternalLink,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { api } from "@daih/api-client";
import { useToast } from "@daih/ui";

interface VerificationSuccessCardProps {
  email: string;
  onBackToLogin?: () => void;
}

export const VerificationSuccessCard: React.FC<
  VerificationSuccessCardProps
> = ({ email, onBackToLogin }) => {
  const [isResending, setIsResending] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const toast = useToast();

  const handleOpenEmailApp = () => {
    // Open standard email client / webmail provider
    if (email.includes("@gmail.com")) {
      window.open("https://mail.google.com", "_blank");
    } else if (
      email.includes("@outlook.com") ||
      email.includes("@hotmail.com")
    ) {
      window.open("https://outlook.live.com", "_blank");
    } else if (email.includes("@yahoo.com")) {
      window.open("https://mail.yahoo.com", "_blank");
    } else {
      window.location.href = `mailto:${email}`;
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setIsResending(true);
    try {
      await api.auth.resendVerification(email.trim().toLowerCase());
      setResendSent(true);
      toast.success(`Verification link sent to ${email}`, {
        title: "Verification Resent",
      });
    } catch (err: any) {
      toast.error(err?.message || "Failed to resend verification link.", {
        title: "Resend Failed",
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-[#f7f9ff] text-[#181c20] font-sans antialiased relative overflow-hidden">
      {/* Abstract Background Ambient Elements */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden flex items-center justify-center opacity-40">
        <div className="w-[700px] h-[700px] rounded-full bg-gradient-to-tr from-[#EBE7F5] to-transparent absolute blur-[100px] -top-[200px] -right-[200px]" />
        <div className="w-[500px] h-[500px] rounded-full bg-gradient-to-bl from-[#f1f4f9] to-transparent absolute blur-[80px] -bottom-[100px] -left-[100px]" />
      </div>

      {/* Main Content Area */}
      <main className="flex-grow flex items-center justify-center p-4 sm:p-6 lg:p-8 relative z-10 w-full min-h-[calc(100vh-80px)]">
        <div className="w-full max-w-md">
          {/* Glassmorphism Card */}
          <div className="bg-white/85 backdrop-blur-md rounded-2xl border border-[#EBE7F5] shadow-[0px_12px_32px_rgba(57,34,113,0.08)] p-8 sm:p-10 flex flex-col items-center text-center">
            {/* Icon Container */}
            <div className="w-20 h-20 rounded-full bg-[#EBE7F5] flex items-center justify-center mb-6 text-[#23055c] shadow-xs">
              <Mail className="w-10 h-10" />
            </div>

            {/* Title & Body */}
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#23055c] tracking-tight mb-3">
              Verify your email
            </h1>

            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
              We've sent a verification link to <br />
              <span className="font-semibold text-[#23055c] mt-1 inline-block break-all">
                {email || "your email address"}
              </span>
            </p>

            <p className="text-xs text-slate-500 mb-8 max-w-xs mx-auto leading-relaxed opacity-85">
              To maintain the security of the DAIH Workspace ecosystem, please
              verify your address to access your executive suite.
            </p>

            {/* Resend status message */}
            {resendSent && (
              <div className="w-full p-3 mb-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>New verification link sent to your inbox.</span>
              </div>
            )}

            {/* Actions */}
            <div className="w-full flex flex-col gap-3">
              <button
                type="button"
                onClick={handleOpenEmailApp}
                className="w-full bg-[#23055c] hover:bg-[#392271] text-white font-semibold text-sm py-3.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-[0_4px_14px_0_rgba(35,5,92,0.25)] hover:shadow-[0_6px_20px_rgba(35,5,92,0.23)] cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" />
                Open Email App
              </button>

              <button
                type="button"
                onClick={handleResend}
                disabled={isResending}
                className="w-full bg-transparent border border-slate-300 hover:border-[#23055c] text-[#23055c] font-semibold text-sm py-3.5 rounded-xl hover:bg-[#F8F9FA] transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isResending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Resending Link...
                  </>
                ) : (
                  "Resend Verification Link"
                )}
              </button>
            </div>

            {/* Back to login */}
            <div className="mt-8 pt-6 border-t border-[#EBE7F5] w-full">
              {onBackToLogin ? (
                <button
                  type="button"
                  onClick={onBackToLogin}
                  className="text-slate-500 hover:text-[#23055c] transition-colors text-xs font-semibold flex items-center justify-center gap-1 group mx-auto cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  Back to login
                </button>
              ) : (
                <Link
                  href="/login"
                  className="text-slate-500 hover:text-[#23055c] transition-colors text-xs font-semibold flex items-center justify-center gap-1 group mx-auto"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  Back to login
                </Link>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
