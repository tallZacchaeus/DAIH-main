"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, api } from "@daih/api-client";
import { useToast } from "@daih/ui";
import {
  Users,
  Search,
  Share2,
  Building2,
  Sparkles,
  ArrowRight,
  Loader2,
  CheckCircle2,
} from "lucide-react";

interface OptionItem {
  id: string;
  label: string;
  icon: React.ElementType;
  asksForReferral?: boolean;
}

const HEARD_FROM_OPTIONS: OptionItem[] = [
  {
    id: "friend",
    label: "Friend or Colleague (Word of mouth)",
    icon: Users,
    asksForReferral: true,
  },
  { id: "google", label: "Google Search", icon: Search },
  {
    id: "social",
    label: "Social Media (Instagram, LinkedIn, X)",
    icon: Share2,
  },
  { id: "event", label: "Community Event or Partner Space", icon: Building2 },
  { id: "other", label: "Other", icon: Sparkles },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, updateUser } = useAuth();
  const toast = useToast();

  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reverse route guard
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.replace("/login");
      } else if (user?.onboardingCompleted) {
        router.replace("/dashboard");
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  // Pre-fill cached referral code if available
  useEffect(() => {
    try {
      const cached = localStorage.getItem("daih_referral_code");
      if (cached && /^REF-[2-9A-HJ-NP-Z]{6}$/i.test(cached)) {
        setReferralCode(cached);
        setSelectedSource("friend");
      }
    } catch {}
  }, []);

  const handleFinish = async (isSkipping = false) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const cleanCode =
        !isSkipping && selectedSource === "friend" && referralCode.trim()
          ? referralCode.trim().toUpperCase()
          : undefined;

      const payload = {
        source: !isSkipping && selectedSource ? selectedSource : undefined,
        referralCode: cleanCode,
      };

      const updatedProfile =
        await api.auth.submitOnboardingAttribution(payload);

      // Crucial: Update React auth state before navigating to prevent redirect loop
      updateUser(updatedProfile);

      // Clean up cached referral code
      try {
        localStorage.removeItem("daih_referral_code");
        if (typeof document !== "undefined") {
          document.cookie =
            "daih_referral_code=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        }
      } catch {}

      if (cleanCode && updatedProfile.hasReferrer) {
        toast.success(
          "Referral code applied successfully! Welcome perks unlocked.",
          {
            title: "Referral Connected",
          },
        );
      } else {
        toast.success("Welcome aboard! Let's explore your workspace.", {
          title: "Setup Complete",
        });
      }

      router.push("/dashboard");
    } catch (err: any) {
      const msg =
        err?.message ||
        "Could not save attribution. You can skip for now or try again.";
      setErrorMessage(msg);
      toast.error(msg, { title: "Onboarding Notice" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !isAuthenticated || user?.onboardingCompleted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f9ff]">
        <Loader2 className="w-8 h-8 text-[#23055c] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 bg-[#f7f9ff]">
      <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-10 shadow-sm border border-slate-100/80 transition-all">
        {/* Header with Skip button */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Welcome to DAIH
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleFinish(true)}
            disabled={isSubmitting}
            className="text-xs sm:text-sm font-semibold text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            Skip for now
          </button>
        </div>

        {/* Title */}
        <div className="space-y-2 mb-6 text-left">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#23055c] tracking-tight">
            How did you hear about us?
          </h1>
          <p className="text-sm text-slate-500">
            Help us understand how you found DAIH so we can tailor your
            experience.
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
            {errorMessage}
          </div>
        )}

        {/* Options List */}
        <div className="space-y-2.5 mb-6">
          {HEARD_FROM_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isSelected = selectedSource === option.id;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  setSelectedSource(option.id);
                  setErrorMessage(null);
                }}
                className={`w-full flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? "border-[#23055c] bg-[#23055c]/5 text-[#23055c] font-semibold shadow-xs"
                    : "border-slate-200 hover:border-slate-300 text-slate-700 bg-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                      isSelected
                        ? "bg-[#23055c] text-white"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium">{option.label}</span>
                </div>
                {isSelected && (
                  <CheckCircle2 className="w-5 h-5 text-[#23055c] shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Conditional Referral Code Section */}
        {selectedSource === "friend" && (
          <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-purple-50/50 border border-purple-100 space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#23055c]">
              <Users className="w-4 h-4" />
              <span>Friend's Referral Code</span>
            </div>
            <p className="text-xs text-slate-500">
              Enter your friend's code to link your referral and unlock welcome
              rewards.
            </p>
            <input
              type="text"
              placeholder="e.g. REF-234ABC"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              disabled={isSubmitting}
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm font-mono uppercase tracking-wider placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#23055c] focus:border-transparent transition-colors"
            />
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={() => handleFinish(false)}
            disabled={!selectedSource || isSubmitting}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-[#23055c] hover:bg-[#1a0445] text-white font-semibold text-sm rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                Continue to Dashboard
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
