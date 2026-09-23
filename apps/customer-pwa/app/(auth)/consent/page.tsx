"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth, apiClient } from "@daih/api-client";
import { useToast } from "@daih/ui";
import {
  ShieldCheck,
  Check,
  ArrowRight,
  Loader2,
  FileText,
} from "lucide-react";
import { AuthSplitLayout } from "../../../components/auth";

function ConsentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { updateUser } = useAuth();
  const toast = useToast();

  const tokenParam = searchParams?.get("token");
  const destination = searchParams?.get("destination") || "/dashboard";

  const [policyAgreed, setPolicyAgreed] = useState(false);
  const [marketingAgreed, setMarketingAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If token is provided in query params from OAuth callback, set it in apiClient
  React.useEffect(() => {
    if (tokenParam) {
      apiClient.setAccessToken(tokenParam);
    }
  }, [tokenParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!policyAgreed) {
      setError(
        "You must accept the NDPR Privacy Policy and Terms of Service to continue.",
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await apiClient.auth.capturePolicyConsent({
        policyVersion: "1.0",
        consented: true,
        marketingConsent: marketingAgreed,
      });

      if (response?.user) {
        updateUser(response.user);
      }

      toast.success("Welcome! Your privacy preferences have been recorded.");
      router.push(destination);
    } catch (err: any) {
      setError(err?.message || "Failed to record consent. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* Header */}
      <div className="text-left space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-50 text-[#23055c] rounded-full text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5 text-[#23055c]" />
          <span>NDPR Compliance & Data Protection</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Privacy & Terms Agreement
        </h1>
        <p className="text-xs text-slate-500 leading-relaxed">
          In accordance with the Nigeria Data Protection Regulation (NDPR), we
          ensure your personal data is processed transparently, securely, and
          strictly for hub services.
        </p>
      </div>

      {error && (
        <div className="p-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl">
          {error}
        </div>
      )}

      {/* NDPR Information Summary Box */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 text-xs text-slate-600">
        <div className="flex items-start gap-2.5">
          <FileText className="w-4 h-4 text-[#23055c] shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-slate-800">
              How we protect your data:
            </p>
            <ul className="list-disc list-inside mt-1 space-y-1 text-slate-500">
              <li>
                Your details are used solely for identity verification and
                bookings.
              </li>
              <li>
                We never sell or share your personal data with third parties.
              </li>
              <li>
                You retain the right to access, rectify, or request deletion of
                your records.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Consent Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Mandatory Policy Consent */}
        <label
          htmlFor="policyAgreed"
          className="flex items-start gap-3 p-3.5 border rounded-xl cursor-pointer transition-all border-slate-200 hover:border-purple-300 bg-white"
        >
          <div className="relative flex items-center justify-center mt-0.5">
            <input
              id="policyAgreed"
              type="checkbox"
              checked={policyAgreed}
              onChange={(e) => setPolicyAgreed(e.target.checked)}
              className="sr-only"
            />
            <div
              className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                policyAgreed
                  ? "bg-[#23055c] border-[#23055c] text-white"
                  : "border-slate-300 bg-white"
              }`}
            >
              {policyAgreed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
            </div>
          </div>
          <div className="text-xs leading-tight">
            <span className="font-semibold text-slate-900">
              I agree to the Terms of Service & Privacy Policy{" "}
              <span className="text-red-500">*</span>
            </span>
            <p className="text-[11px] text-slate-500 mt-1">
              Required to access workspaces, meeting rooms, and PeeDee rewards.
            </p>
          </div>
        </label>

        {/* Unbundled Optional Marketing Checkbox */}
        <label
          htmlFor="marketingAgreed"
          className="flex items-start gap-3 p-3.5 border rounded-xl cursor-pointer transition-all border-slate-200 hover:border-purple-300 bg-white"
        >
          <div className="relative flex items-center justify-center mt-0.5">
            <input
              id="marketingAgreed"
              type="checkbox"
              checked={marketingAgreed}
              onChange={(e) => setMarketingAgreed(e.target.checked)}
              className="sr-only"
            />
            <div
              className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                marketingAgreed
                  ? "bg-[#23055c] border-[#23055c] text-white"
                  : "border-slate-300 bg-white"
              }`}
            >
              {marketingAgreed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
            </div>
          </div>
          <div className="text-xs leading-tight">
            <span className="font-semibold text-slate-900">
              Personalized communications & reward updates (Optional)
            </span>
            <p className="text-[11px] text-slate-500 mt-1">
              Receive updates on exclusive space discounts, PeeDee coin drops,
              and community events.
            </p>
          </div>
        </label>

        {/* Action Button */}
        <button
          type="submit"
          disabled={!policyAgreed || isSubmitting}
          className={`w-full py-3 px-4 rounded-xl text-white font-semibold text-xs tracking-wide transition-all shadow-md flex items-center justify-center gap-2 ${
            policyAgreed && !isSubmitting
              ? "bg-[#23055c] hover:bg-[#1a0346] shadow-purple-900/10 cursor-pointer"
              : "bg-slate-300 cursor-not-allowed shadow-none"
          }`}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving Preferences...</span>
            </>
          ) : (
            <>
              <span>Complete & Continue to Hub</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export default function ConsentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <Loader2 className="w-8 h-8 text-[#23055c] animate-spin" />
        </div>
      }
    >
      <AuthSplitLayout
        bgImage="/images/background/1.jpg"
        showcaseTitle="Your Privacy is Protected"
        showcaseDescription="Experience enterprise-grade security and full data sovereignty as you step into the DAIH ecosystem."
        showShowcaseLogo={false}
      >
        <ConsentContent />
      </AuthSplitLayout>
    </Suspense>
  );
}
