"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api, useAuth } from "@daih/api-client";
import { useToast } from "@daih/ui";
import {
  ShieldCheck,
  Mail,
  Smartphone,
  Copy,
  Check,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Lock,
  AlertCircle,
  KeyRound,
  RefreshCw,
} from "lucide-react";

function SetupMfaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { setSession } = useAuth();

  const [setupToken, setSetupToken] = useState<string>("");
  const [method, setMethod] = useState<"EMAIL_OTP" | "TOTP">("EMAIL_OTP");
  const [step, setStep] = useState<"SELECT_METHOD" | "VERIFY_METHOD">(
    "SELECT_METHOD",
  );

  // TOTP setup data
  const [qrCodeDataUri, setQrCodeDataUri] = useState<string | null>(null);
  const [manualEntryKey, setManualEntryKey] = useState<string | null>(null);
  const [ephemeralSecret, setEphemeralSecret] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Verification state
  const [verificationCode, setVerificationCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [isResending, setIsResending] = useState(false);

  // Resend OTP Cooldown Timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  useEffect(() => {
    const tokenFromQuery = searchParams.get("token");
    const tokenFromStorage =
      typeof window !== "undefined"
        ? sessionStorage.getItem("daih_mfa_setup_token")
        : null;

    const token = tokenFromQuery || tokenFromStorage;
    if (!token) {
      toast.error("MFA setup token is missing. Please sign in again.", {
        title: "Session Expired",
      });
      router.replace("/login");
      return;
    }
    setSetupToken(token);
  }, [searchParams, router, toast]);

  const handleCopyKey = () => {
    if (!manualEntryKey) return;
    navigator.clipboard.writeText(manualEntryKey.replace(/\s/g, ""));
    setCopiedKey(true);
    toast.success("Setup key copied to clipboard!");
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleProceedToVerify = async () => {
    setErrorMessage(null);
    setIsInitializing(true);

    try {
      const res = await api.auth.setupMfa({
        setupToken,
        method,
      });

      if (method === "TOTP") {
        setQrCodeDataUri(res.qrCodeDataUri || null);
        setManualEntryKey(res.manualEntryKey || null);
        setEphemeralSecret(res.ephemeralSecret || null);
      } else {
        setResendCooldown(60);
      }

      setStep("VERIFY_METHOD");
    } catch (err: any) {
      const msg = err?.message || "Failed to initialize MFA method setup.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    setErrorMessage(null);

    try {
      await api.auth.setupMfa({ setupToken, method: "EMAIL_OTP" });
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

  const handleConfirmSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanCode = verificationCode.trim().replace(/\s/g, "");
    if (!cleanCode || cleanCode.length < 6) {
      toast.warning("Please enter the 6-digit verification code.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await api.auth.confirmMfaSetup({
        setupToken,
        method,
        code: cleanCode,
        ephemeralSecret:
          method === "TOTP" ? ephemeralSecret || undefined : undefined,
      });

      // Clear setup token from session storage
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("daih_mfa_setup_token");
      }

      setSession(res.token, res.user as any);

      toast.success(
        "Two-Factor Authentication has been successfully configured!",
        {
          title: "Account Secured",
        },
      );

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

  return (
    <div className="w-full max-w-lg bg-white rounded-2xl border border-[#EBE7F5] shadow-[0px_16px_36px_rgba(57,34,113,0.09)] overflow-hidden">
      {/* Header */}
      <div className="p-8 pb-6 text-center border-b border-slate-100">
        <Link href="/" className="inline-block mb-4">
          <img
            src="/images/logo.png"
            alt="DAIH Workspace Logo"
            className="mx-auto h-10 w-auto object-contain"
          />
        </Link>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f1f4f9] text-[#23055c] text-xs font-bold mb-2">
          <ShieldCheck className="w-3.5 h-3.5 text-[#23055c]" />
          Mandatory Staff Security
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#181c20] tracking-tight mb-1">
          Set Up Two-Factor Authentication
        </h1>
        <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto">
          All administrative and staff accounts require MFA protection before
          accessing the management console.
        </p>
      </div>

      {/* Content */}
      <div className="p-8">
        {errorMessage && (
          <div className="p-3.5 mb-5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="font-medium flex-1">{errorMessage}</span>
          </div>
        )}

        {step === "SELECT_METHOD" ? (
          <div className="space-y-5">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Choose your verification method:
            </p>

            {/* Email OTP Card */}
            <div
              onClick={() => setMethod("EMAIL_OTP")}
              className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-4 ${
                method === "EMAIL_OTP"
                  ? "border-[#23055c] bg-[#f8f5ff] shadow-sm"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div
                className={`p-2.5 rounded-lg shrink-0 ${
                  method === "EMAIL_OTP"
                    ? "bg-[#23055c] text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                <Mail className="w-5 h-5" />
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">
                    Email Verification Code (OTP)
                  </h3>
                  <input
                    type="radio"
                    name="mfa_method"
                    checked={method === "EMAIL_OTP"}
                    onChange={() => setMethod("EMAIL_OTP")}
                    className="h-4 w-4 text-[#23055c] focus:ring-[#23055c]"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  A 6-digit one-time passcode is sent to your registered email
                  address every time you log in. No extra apps required.
                </p>
              </div>
            </div>

            {/* Authenticator App Card */}
            <div
              onClick={() => setMethod("TOTP")}
              className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-4 ${
                method === "TOTP"
                  ? "border-[#23055c] bg-[#f8f5ff] shadow-sm"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div
                className={`p-2.5 rounded-lg shrink-0 ${
                  method === "TOTP"
                    ? "bg-[#23055c] text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                <Smartphone className="w-5 h-5" />
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">
                    Authenticator App (Recommended)
                  </h3>
                  <input
                    type="radio"
                    name="mfa_method"
                    checked={method === "TOTP"}
                    onChange={() => setMethod("TOTP")}
                    className="h-4 w-4 text-[#23055c] focus:ring-[#23055c]"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Use Google Authenticator, Microsoft Authenticator, Authy, or
                  1Password. Works offline and provides instant codes.
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={isInitializing}
              onClick={handleProceedToVerify}
              className="w-full bg-[#392271] hover:bg-[#23055c] text-white py-3 rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-4 group"
            >
              {isInitializing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Preparing Setup...
                </>
              ) : (
                <>
                  Continue Setup
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>
        ) : (
          /* Step 2: Verification Step */
          <form onSubmit={handleConfirmSetup} className="space-y-5">
            {method === "TOTP" && (
              <div className="space-y-4">
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    1. Link Your Authenticator App
                  </p>
                  <p className="text-xs text-slate-600 mb-3">
                    Scan the QR code with your authenticator app, or copy and
                    paste the setup key manually if you are using this device:
                  </p>
                </div>

                {/* QR Code and Key container */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-5">
                  {qrCodeDataUri ? (
                    <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm shrink-0">
                      <img
                        src={qrCodeDataUri}
                        alt="TOTP QR Code"
                        className="w-36 h-36"
                      />
                    </div>
                  ) : (
                    <div className="w-36 h-36 bg-slate-200 animate-pulse rounded-lg shrink-0 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                    </div>
                  )}

                  <div className="flex-1 text-left w-full">
                    <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Manual Setup Key (Copy & Paste):
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="bg-white px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono font-bold text-[#23055c] tracking-wider flex-1 select-all break-all">
                        {manualEntryKey || "•••• •••• •••• ••••"}
                      </code>
                      <button
                        type="button"
                        onClick={handleCopyKey}
                        className="p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors shrink-0"
                        title="Copy Key"
                      >
                        {copiedKey ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2">
                      Account Name:{" "}
                      <strong className="text-slate-700">DAIH Admin</strong>
                    </p>
                  </div>
                </div>

                <div className="text-left pt-2">
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    2. Enter the 6-digit code shown in your app
                  </p>
                </div>
              </div>
            )}

            {method === "EMAIL_OTP" && (
              <div className="bg-[#f8f5ff] border border-[#23055c]/15 rounded-xl p-4 text-left">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-[#23055c] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      Check Your Email Inbox
                    </h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      We have sent a 6-digit verification code to your email.
                      Enter it below to confirm that email delivery works
                      properly for your account.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Code Input */}
            <div className="space-y-1.5 text-left">
              <label
                className="block text-xs font-bold text-slate-700"
                htmlFor="verification-code"
              >
                6-Digit Verification Code
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  id="verification-code"
                  type="text"
                  maxLength={8}
                  autoComplete="one-time-code"
                  placeholder="123456"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  disabled={isLoading}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-lg font-mono tracking-widest font-bold focus:bg-white focus:outline-none focus:border-[#23055c] focus:ring-2 focus:ring-[#23055c] text-center"
                />
              </div>
            </div>

            {/* Resend Link for Email OTP */}
            {method === "EMAIL_OTP" && (
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
                  setStep("SELECT_METHOD");
                  setVerificationCode("");
                }}
                disabled={isLoading}
                className="px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors flex items-center gap-1.5 shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>

              <button
                type="submit"
                disabled={isLoading || verificationCode.trim().length < 6}
                className="flex-1 bg-[#392271] hover:bg-[#23055c] text-white py-3 rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Activating MFA...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Confirm & Complete Setup
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Footer */}
      <div className="bg-[#f1f4f9] px-8 py-3.5 border-t border-[#EBE7F5] text-center">
        <p className="text-[11px] text-slate-500 font-medium">
          Protected by DAIH Zero-Trust Identity Guard
        </p>
      </div>
    </div>
  );
}

export default function SetupMfaPage() {
  return (
    <div className="bg-[#ebeef3] min-h-screen flex items-center justify-center p-4 md:p-8 font-sans antialiased text-[#181c20] relative overflow-hidden">
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none -z-10 opacity-30">
        <div className="w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-[#392271]/20 to-transparent absolute blur-[100px] -top-[150px] -right-[150px]" />
        <div className="w-[500px] h-[500px] rounded-full bg-gradient-to-bl from-[#bfa9fe]/30 to-transparent absolute blur-[80px] -bottom-[100px] -left-[100px]" />
      </div>

      <Suspense
        fallback={<Loader2 className="w-8 h-8 animate-spin text-[#23055c]" />}
      >
        <SetupMfaContent />
      </Suspense>
    </div>
  );
}
