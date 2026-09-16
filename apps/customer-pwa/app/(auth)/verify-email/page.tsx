"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@daih/api-client";
import { useToast } from "@daih/ui";
import { Loader2 } from "lucide-react";
import {
  VerifyEmailCard,
  VerificationStatusCard,
} from "../../../components/auth";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const emailParam = searchParams.get("email");

  const toast = useToast();

  const [status, setStatus] = useState<
    "verifying" | "success" | "error" | "awaiting" | "already_used"
  >(token ? "verifying" : "awaiting");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [resendEmail, setResendEmail] = useState(emailParam || "");
  const [resendStatus, setResendStatus] = useState<"idle" | "loading" | "sent">(
    "idle",
  );

  const verifiedTokenRef = React.useRef<string | null>(null);

  useEffect(() => {
    if (!token || verifiedTokenRef.current === token) return;

    api.auth
      .verifyEmail(token)
      .then(() => {
        verifiedTokenRef.current = token;
        setStatus("success");
        setErrorCode(null);
        toast.success("Your email has been verified successfully!", {
          title: "Email Verified",
        });
      })
      .catch((err: any) => {
        const code = err?.code || "VERIFICATION_ERROR";
        setErrorCode(code);

        if (code === "TOKEN_ALREADY_USED") {
          setStatus("already_used");
        } else {
          setStatus("error");
          const msg =
            err?.message || "Verification link is invalid or has expired";
          setErrorMessage(msg);
          toast.error(msg, {
            title: "Verification Failed",
          });
        }
      });
  }, [token]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim()) {
      toast.warning("Please enter your email address.", {
        title: "Email Required",
      });
      return;
    }
    setResendStatus("loading");
    try {
      await api.auth.resendVerification(resendEmail.trim().toLowerCase());
      setResendStatus("sent");
      toast.success(`Verification link sent to ${resendEmail}`, {
        title: "Verification Link Sent",
      });
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to resend verification email");
      setResendStatus("idle");
      toast.error(err?.message || "Failed to resend verification email", {
        title: "Resend Failed",
      });
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-[#f7f9ff] text-[#181c20] font-sans antialiased relative overflow-hidden">
      {/* Ambient background spheres */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden flex items-center justify-center opacity-40">
        <div className="w-[700px] h-[700px] rounded-full bg-gradient-to-tr from-[#EBE7F5] to-transparent absolute blur-[100px] -top-[200px] -right-[200px]" />
        <div className="w-[500px] h-[500px] rounded-full bg-gradient-to-bl from-[#f1f4f9] to-transparent absolute blur-[80px] -bottom-[100px] -left-[100px]" />
      </div>

      <main className="flex-grow flex items-center justify-center p-4 sm:p-6 lg:p-8 relative z-10 w-full min-h-[calc(100vh-80px)]">
        {status === "awaiting" ? (
          <VerifyEmailCard email={emailParam || ""} />
        ) : (
          <VerificationStatusCard
            status={status}
            errorMessage={errorMessage}
            errorCode={errorCode}
            resendEmail={resendEmail}
            onResendEmailChange={setResendEmail}
            onResendSubmit={handleResend}
            resendStatus={resendStatus}
          />
        )}
      </main>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#f7f9ff]">
          <Loader2 className="w-8 h-8 text-[#23055c] animate-spin" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
