"use client";

import React, { useState, useEffect } from "react";
import {
  LoyaltySettingsRecord,
  UpdateLoyaltySettingsDTO,
  LoyaltyFormulaMode,
} from "@daih/types";
import {
  Coins,
  Sparkles,
  Save,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sliders,
  Users,
  CreditCard,
  Calculator,
  RefreshCw,
  Lock,
  Gift,
  Flame,
  Calendar,
  Clock,
  ShieldAlert,
  UserPlus,
  Award,
} from "lucide-react";
import { useToast } from "@daih/ui";

interface LoyaltyFormulaBuilderProps {
  settings: LoyaltySettingsRecord | null;
  onSave: (updated: UpdateLoyaltySettingsDTO) => Promise<void>;
  loading?: boolean;
  readOnly?: boolean;
}

export const LoyaltyFormulaBuilder: React.FC<LoyaltyFormulaBuilderProps> = ({
  settings,
  onSave,
  loading = false,
  readOnly = false,
}) => {
  const toast = useToast();
  const [formData, setFormData] = useState<UpdateLoyaltySettingsDTO>({
    isProgramActive: true,
    coinName: "PD Coin",
    coinSymbol: "PDC",
    isTransactionRewardEnabled: true,
    formulaMode: "SPEND_RATIO",
    spendRatioNgn: 100,
    percentageRate: 1.0,
    fixedAmountCoins: 50,
    minSpendThreshold: 500,
    maxCoinsPerTransaction: null,
    isReferralRewardEnabled: false,
    coinsPerActiveReferral: 100,
    refereeWelcomeBonus: 0,
    referralRewardPercent: 5.0,
    referralFloorCoins: 50,
    referralCapCoins: 1000,
    referralWindowDays: 90,
    isRedemptionEnabled: true,
    redemptionRateCoins: 100,
    redemptionRateNgn: 100,
    minCoinsToRedeem: 100,
    maxDiscountPercent: 50,
    isBirthdayBonusEnabled: true,
    birthdayBonusCoins: 500,
    isStreakBonusEnabled: true,
    streakBonusCoins: 200,
    streakThresholdCount: 3,
    streakWindowDays: 30,
    isSignupBonusEnabled: true,
    signupBonusCoins: 500,
    isExpiryEnabled: true,
    expiryMonths: 12,
    dailyAdjustmentLimitCoins: 20000,
    holdExpiryMinutes: 15,
  });

  const [saving, setSaving] = useState(false);
  const [isCapped, setIsCapped] = useState(false);

  // Simulator state
  const [simSpend, setSimSpend] = useState<number | string>(25000);
  const [simCoinsToRedeem, setSimCoinsToRedeem] = useState<number | string>(
    1000,
  );
  const [simIsReferredFirstBooking, setSimIsReferredFirstBooking] =
    useState<boolean>(true);
  const [simIncludeBirthday, setSimIncludeBirthday] = useState<boolean>(false);
  const [simIncludeStreak, setSimIncludeStreak] = useState<boolean>(false);
  const [simIncludeSignup, setSimIncludeSignup] = useState<boolean>(false);

  const cleanNumber = (val: any, fallback: number = 0) => {
    if (val === "" || val === null || val === undefined || isNaN(Number(val))) {
      return fallback;
    }
    return Number(val);
  };

  const handleNumberChange = (
    field: keyof UpdateLoyaltySettingsDTO,
    raw: string,
  ) => {
    if (raw === "") {
      setFormData((prev) => ({ ...prev, [field]: "" as any }));
      return;
    }
    if (raw.endsWith(".") || raw === "-" || raw === "0.") {
      setFormData((prev) => ({ ...prev, [field]: raw as any }));
      return;
    }
    const num = Number(raw);
    setFormData((prev) => ({
      ...prev,
      [field]: isNaN(num) ? ("" as any) : num,
    }));
  };

  useEffect(() => {
    if (settings) {
      setFormData({
        isProgramActive: settings.isProgramActive ?? true,
        coinName: settings.coinName || "PD Coin",
        coinSymbol: settings.coinSymbol || "PDC",
        isTransactionRewardEnabled: settings.isTransactionRewardEnabled ?? true,
        formulaMode: settings.formulaMode || "SPEND_RATIO",
        spendRatioNgn: settings.spendRatioNgn ?? 100,
        percentageRate: settings.percentageRate ?? 1.0,
        fixedAmountCoins: settings.fixedAmountCoins ?? 50,
        minSpendThreshold: settings.minSpendThreshold ?? 500,
        maxCoinsPerTransaction: settings.maxCoinsPerTransaction ?? null,
        isReferralRewardEnabled: settings.isReferralRewardEnabled ?? false,
        coinsPerActiveReferral: settings.coinsPerActiveReferral ?? 100,
        refereeWelcomeBonus: settings.refereeWelcomeBonus ?? 0,
        referralRewardPercent: settings.referralRewardPercent ?? 5.0,
        referralFloorCoins: settings.referralFloorCoins ?? 50,
        referralCapCoins: settings.referralCapCoins ?? 1000,
        referralWindowDays: settings.referralWindowDays ?? 90,
        isRedemptionEnabled: settings.isRedemptionEnabled ?? true,
        redemptionRateCoins: settings.redemptionRateCoins ?? 100,
        redemptionRateNgn: settings.redemptionRateNgn ?? 100,
        minCoinsToRedeem: settings.minCoinsToRedeem ?? 100,
        maxDiscountPercent: settings.maxDiscountPercent ?? 50,
        isBirthdayBonusEnabled: settings.isBirthdayBonusEnabled ?? true,
        birthdayBonusCoins: settings.birthdayBonusCoins ?? 500,
        isStreakBonusEnabled: settings.isStreakBonusEnabled ?? true,
        streakBonusCoins: settings.streakBonusCoins ?? 200,
        streakThresholdCount: settings.streakThresholdCount ?? 3,
        streakWindowDays: settings.streakWindowDays ?? 30,
        isSignupBonusEnabled: settings.isSignupBonusEnabled ?? true,
        signupBonusCoins: settings.signupBonusCoins ?? 500,
        isExpiryEnabled: settings.isExpiryEnabled ?? true,
        expiryMonths: settings.expiryMonths ?? 12,
        dailyAdjustmentLimitCoins: settings.dailyAdjustmentLimitCoins ?? 20000,
        holdExpiryMinutes: settings.holdExpiryMinutes ?? 15,
      });
      setIsCapped(
        settings.maxCoinsPerTransaction !== null &&
          settings.maxCoinsPerTransaction !== undefined &&
          settings.maxCoinsPerTransaction > 0,
      );
    }
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: UpdateLoyaltySettingsDTO = {
        ...formData,
        spendRatioNgn: Math.max(1, cleanNumber(formData.spendRatioNgn, 100)),
        percentageRate: cleanNumber(formData.percentageRate, 1.0),
        fixedAmountCoins: cleanNumber(formData.fixedAmountCoins, 50),
        minSpendThreshold: cleanNumber(formData.minSpendThreshold, 500),
        maxCoinsPerTransaction: isCapped
          ? cleanNumber(formData.maxCoinsPerTransaction, 500)
          : null,
        coinsPerActiveReferral: cleanNumber(
          formData.coinsPerActiveReferral,
          100,
        ),
        refereeWelcomeBonus: cleanNumber(formData.refereeWelcomeBonus, 0),
        referralRewardPercent: cleanNumber(formData.referralRewardPercent, 5.0),
        referralFloorCoins: cleanNumber(formData.referralFloorCoins, 50),
        referralCapCoins: cleanNumber(formData.referralCapCoins, 1000),
        referralWindowDays: Math.max(
          1,
          cleanNumber(formData.referralWindowDays, 90),
        ),
        redemptionRateCoins: Math.max(
          1,
          cleanNumber(formData.redemptionRateCoins, 100),
        ),
        redemptionRateNgn: Math.max(
          1,
          cleanNumber(formData.redemptionRateNgn, 100),
        ),
        minCoinsToRedeem: cleanNumber(formData.minCoinsToRedeem, 100),
        maxDiscountPercent: Math.min(
          100,
          Math.max(1, cleanNumber(formData.maxDiscountPercent, 50)),
        ),
        birthdayBonusCoins: cleanNumber(formData.birthdayBonusCoins, 50),
        streakBonusCoins: cleanNumber(formData.streakBonusCoins, 30),
        streakThresholdCount: Math.max(
          1,
          cleanNumber(formData.streakThresholdCount, 4),
        ),
        streakWindowDays: Math.max(
          1,
          cleanNumber(formData.streakWindowDays, 30),
        ),
        signupBonusCoins: cleanNumber(formData.signupBonusCoins, 500),
        expiryMonths: Math.max(1, cleanNumber(formData.expiryMonths, 12)),
        dailyAdjustmentLimitCoins: Math.max(
          100,
          cleanNumber(formData.dailyAdjustmentLimitCoins, 20000),
        ),
        holdExpiryMinutes: Math.max(
          1,
          cleanNumber(formData.holdExpiryMinutes, 15),
        ),
      };
      await onSave(payload);
      toast.success("Loyalty reward formula and settings saved successfully!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save loyalty settings.");
    } finally {
      setSaving(false);
    }
  };

  // Run Simulator Calculations
  const numSpend = simSpend === "" ? 0 : Number(simSpend);
  const numCoinsToRedeem =
    simCoinsToRedeem === "" ? 0 : Number(simCoinsToRedeem);
  const simRedemptionRateCoins = cleanNumber(formData.redemptionRateCoins, 100);
  const simRedemptionRateNgn = cleanNumber(formData.redemptionRateNgn, 100);
  const calcRate =
    simRedemptionRateCoins > 0
      ? simRedemptionRateNgn / simRedemptionRateCoins
      : 1;

  // 1. Redemption discount
  let simDiscountNgn = 0;
  let simCoinsActuallyUsed = 0;
  const simMinCoinsToRedeem = cleanNumber(formData.minCoinsToRedeem, 0);
  const simMaxDiscountPercent = cleanNumber(formData.maxDiscountPercent, 50);
  if (
    formData.isProgramActive &&
    formData.isRedemptionEnabled &&
    numCoinsToRedeem >= simMinCoinsToRedeem
  ) {
    const rawDisc = numCoinsToRedeem * calcRate;
    const maxAllowed = (numSpend * simMaxDiscountPercent) / 100;
    simDiscountNgn = Math.min(rawDisc, maxAllowed);
    simCoinsActuallyUsed = Math.ceil(simDiscountNgn / calcRate);
  }

  // 2. Net cash paid
  const simNetCash = Math.max(0, numSpend - simDiscountNgn);

  // 3. Coins earned on net cash
  let simCoinsEarned = 0;
  const simMinSpend = cleanNumber(formData.minSpendThreshold, 0);
  if (
    formData.isProgramActive &&
    formData.isTransactionRewardEnabled &&
    simNetCash >= simMinSpend
  ) {
    if (formData.formulaMode === "SPEND_RATIO") {
      const ratio = cleanNumber(formData.spendRatioNgn, 100);
      simCoinsEarned = Math.floor(simNetCash / (ratio > 0 ? ratio : 100));
    } else if (formData.formulaMode === "PERCENTAGE") {
      const pct = cleanNumber(formData.percentageRate, 1.0);
      simCoinsEarned = Math.floor((simNetCash * pct) / 100);
    } else if (formData.formulaMode === "FIXED_AMOUNT") {
      simCoinsEarned = Math.floor(cleanNumber(formData.fixedAmountCoins, 0));
    }

    const simMaxCap = cleanNumber(formData.maxCoinsPerTransaction, 0);
    if (isCapped && simMaxCap > 0) {
      simCoinsEarned = Math.min(simCoinsEarned, simMaxCap);
    }
  }

  // 4. Referral bonus earned
  let simReferralBonus = 0;
  let simWelcomeBonus = 0;
  if (
    formData.isProgramActive &&
    formData.isReferralRewardEnabled &&
    simIsReferredFirstBooking &&
    simNetCash >= simMinSpend
  ) {
    simReferralBonus = cleanNumber(formData.coinsPerActiveReferral, 0);
    simWelcomeBonus = cleanNumber(formData.refereeWelcomeBonus, 0);
  }

  // 5. Milestone & Lifecycle Bonuses
  let simBirthdayBonus = 0;
  if (
    formData.isProgramActive &&
    formData.isBirthdayBonusEnabled &&
    simIncludeBirthday
  ) {
    simBirthdayBonus = cleanNumber(formData.birthdayBonusCoins, 0);
  }

  let simStreakBonus = 0;
  if (
    formData.isProgramActive &&
    formData.isStreakBonusEnabled &&
    simIncludeStreak
  ) {
    simStreakBonus = cleanNumber(formData.streakBonusCoins, 0);
  }

  let simSignupBonus = 0;
  if (
    formData.isProgramActive &&
    formData.isSignupBonusEnabled &&
    simIncludeSignup
  ) {
    simSignupBonus = cleanNumber(formData.signupBonusCoins, 0);
  }

  const formatNgn = (val: number | string) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(Number(val) || 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Main Settings Form */}
      <form
        onSubmit={handleSubmit}
        noValidate
        className="lg:col-span-8 space-y-6"
      >
        {readOnly && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-center gap-3 text-xs text-amber-900">
            <Lock className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-bold">Read-Only Access (Finance Officer)</p>
              <p className="text-amber-800 text-[11px] mt-0.5">
                You have view permissions for the loyalty formula, tokenomics
                analytics, and financial ledgers. Only Operations Admin and
                Super Admin have write access to modify formula parameters.
              </p>
            </div>
          </div>
        )}

        <fieldset
          disabled={readOnly}
          className="space-y-6 border-0 p-0 m-0 min-w-0"
        >
          {/* Master Program Status Banner */}
          <div
            className={`rounded-2xl border p-5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              formData.isProgramActive
                ? "bg-purple-50/70 border-purple-200"
                : "bg-slate-100 border-slate-200"
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                  formData.isProgramActive
                    ? "bg-[#23055c] text-amber-300"
                    : "bg-slate-300 text-slate-600"
                }`}
              >
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">
                    PD Coin Loyalty Engine
                  </h3>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      formData.isProgramActive
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {formData.isProgramActive ? "System Active" : "Paused"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enable or suspend global coin issuance, referrals, and
                  checkout redemptions.
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={formData.isProgramActive}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    isProgramActive: e.target.checked,
                  })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#23055c]"></div>
            </label>
          </div>

          {/* 1. Transaction Reward Formula Section */}
          <div className="bg-white rounded-2xl border border-[#EBE7F5] p-5 sm:p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#23055c]" />
                  <h2 className="text-base font-bold text-slate-900">
                    Transaction Earning Formula
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Configure how many PD Coins members earn upon successful
                  booking payments.
                </p>
              </div>

              {/* Transaction Reward Toggle */}
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-semibold text-slate-600">
                  {formData.isTransactionRewardEnabled ? "Enabled" : "Disabled"}
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isTransactionRewardEnabled}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        isTransactionRewardEnabled: e.target.checked,
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
            </div>

            <fieldset
              disabled={!formData.isTransactionRewardEnabled}
              className={`space-y-5 border-0 p-0 m-0 transition-opacity ${
                !formData.isTransactionRewardEnabled
                  ? "opacity-60 pointer-events-none select-none"
                  : ""
              }`}
            >
              {/* Formula Mode Selector Cards */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  Calculation Mode
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Option 1: SPEND_RATIO */}
                  <button
                    type="button"
                    disabled={!formData.isTransactionRewardEnabled}
                    onClick={() =>
                      setFormData({ ...formData, formulaMode: "SPEND_RATIO" })
                    }
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      !formData.isTransactionRewardEnabled
                        ? "cursor-not-allowed"
                        : "cursor-pointer"
                    } ${
                      formData.formulaMode === "SPEND_RATIO"
                        ? "border-[#23055c] bg-purple-50/50 ring-1 ring-[#23055c]"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-900">
                        Spend Ratio
                      </span>
                      {formData.formulaMode === "SPEND_RATIO" && (
                        <CheckCircle2 className="w-4 h-4 text-[#23055c]" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      Earn 1 PD Coin for every fixed ₦ spent.
                    </p>
                  </button>

                  {/* Option 2: PERCENTAGE */}
                  <button
                    type="button"
                    disabled={!formData.isTransactionRewardEnabled}
                    onClick={() =>
                      setFormData({ ...formData, formulaMode: "PERCENTAGE" })
                    }
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      !formData.isTransactionRewardEnabled
                        ? "cursor-not-allowed"
                        : "cursor-pointer"
                    } ${
                      formData.formulaMode === "PERCENTAGE"
                        ? "border-[#23055c] bg-purple-50/50 ring-1 ring-[#23055c]"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-900">
                        Percentage (%)
                      </span>
                      {formData.formulaMode === "PERCENTAGE" && (
                        <CheckCircle2 className="w-4 h-4 text-[#23055c]" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      A % of net cash spent converted to coins (Math.floor).
                    </p>
                  </button>

                  {/* Option 3: FIXED_AMOUNT */}
                  <button
                    type="button"
                    disabled={!formData.isTransactionRewardEnabled}
                    onClick={() =>
                      setFormData({ ...formData, formulaMode: "FIXED_AMOUNT" })
                    }
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      !formData.isTransactionRewardEnabled
                        ? "cursor-not-allowed"
                        : "cursor-pointer"
                    } ${
                      formData.formulaMode === "FIXED_AMOUNT"
                        ? "border-[#23055c] bg-purple-50/50 ring-1 ring-[#23055c]"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-900">
                        Fixed Coins
                      </span>
                      {formData.formulaMode === "FIXED_AMOUNT" && (
                        <CheckCircle2 className="w-4 h-4 text-[#23055c]" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      Fixed coin bonus for each qualifying booking.
                    </p>
                  </button>
                </div>
              </div>

              {/* Mode-Specific Value Input */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-4">
                {formData.formulaMode === "SPEND_RATIO" && (
                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">
                      Spend Ratio Rate: 1 PD Coin per ₦ spent
                    </label>
                    <div className="relative max-w-xs">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-bold text-xs">
                        ₦
                      </span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        disabled={!formData.isTransactionRewardEnabled}
                        value={formData.spendRatioNgn ?? ""}
                        onChange={(e) =>
                          handleNumberChange("spendRatioNgn", e.target.value)
                        }
                        className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-[#23055c] focus:border-[#23055c] disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                        placeholder="100"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Default: ₦100 (e.g. ₦10,000 booking = 100 PD Coins
                      earned).
                    </p>
                  </div>
                )}

                {formData.formulaMode === "PERCENTAGE" && (
                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">
                      Cash Spend Percentage Rate (%)
                    </label>
                    <div className="relative max-w-xs">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="any"
                        disabled={!formData.isTransactionRewardEnabled}
                        value={formData.percentageRate ?? ""}
                        onChange={(e) =>
                          handleNumberChange("percentageRate", e.target.value)
                        }
                        className="w-full pl-3 pr-8 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-[#23055c] focus:border-[#23055c] disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                        placeholder="1.0"
                      />
                      <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 font-bold text-xs">
                        %
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Payout rounds down to integer coins via Math.floor (e.g.
                      1.0% of ₦25,750 = 257 PD Coins).
                    </p>
                  </div>
                )}

                {formData.formulaMode === "FIXED_AMOUNT" && (
                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">
                      Fixed PD Coins Awarded Per Booking
                    </label>
                    <div className="relative max-w-xs">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        disabled={!formData.isTransactionRewardEnabled}
                        value={formData.fixedAmountCoins ?? ""}
                        onChange={(e) =>
                          handleNumberChange("fixedAmountCoins", e.target.value)
                        }
                        className="w-full pl-3 pr-12 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-[#23055c] focus:border-[#23055c] disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                        placeholder="50"
                      />
                      <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 font-bold text-xs">
                        PDC
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Granted once per paid booking meeting minimum spend.
                    </p>
                  </div>
                )}

                {/* Threshold & Cap controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Minimum Qualifying Spend (₦)
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-bold text-xs">
                        ₦
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        disabled={!formData.isTransactionRewardEnabled}
                        value={formData.minSpendThreshold ?? ""}
                        onChange={(e) =>
                          handleNumberChange(
                            "minSpendThreshold",
                            e.target.value,
                          )
                        }
                        className="w-full pl-7 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400">
                      Transactions below this earn 0 coins
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-700">
                        Max Coin Cap Per Booking
                      </label>
                      <label
                        className={`text-[11px] font-medium flex items-center gap-1 ${
                          !formData.isTransactionRewardEnabled
                            ? "text-slate-400 cursor-not-allowed"
                            : "text-purple-700 cursor-pointer"
                        }`}
                      >
                        <input
                          type="checkbox"
                          disabled={!formData.isTransactionRewardEnabled}
                          checked={isCapped}
                          onChange={(e) => {
                            setIsCapped(e.target.checked);
                            if (!e.target.checked) {
                              setFormData({
                                ...formData,
                                maxCoinsPerTransaction: null,
                              });
                            } else {
                              setFormData({
                                ...formData,
                                maxCoinsPerTransaction: 500,
                              });
                            }
                          }}
                          className="rounded text-[#23055c] disabled:cursor-not-allowed"
                        />
                        Enable Cap
                      </label>
                    </div>
                    <input
                      type="number"
                      min="1"
                      disabled={
                        !isCapped || !formData.isTransactionRewardEnabled
                      }
                      value={formData.maxCoinsPerTransaction ?? ""}
                      onChange={(e) =>
                        handleNumberChange(
                          "maxCoinsPerTransaction",
                          e.target.value,
                        )
                      }
                      placeholder="e.g. 500 PDC"
                      className={`w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold ${
                        !isCapped || !formData.isTransactionRewardEnabled
                          ? "opacity-40 bg-slate-100 cursor-not-allowed"
                          : "text-slate-900"
                      }`}
                    />
                    <span className="text-[10px] text-slate-400">
                      Caps maximum payout on high-value bookings
                    </span>
                  </div>
                </div>
              </div>
            </fieldset>
          </div>

          {/* 2. Active Referral Bonus Section */}
          <div className="bg-white rounded-2xl border border-[#EBE7F5] p-5 sm:p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#23055c]" />
                  <h2 className="text-base font-bold text-slate-900">
                    Active Referral Bonus
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Reward members when an invited friend makes their first paid
                  booking.
                </p>
              </div>

              {/* Referral Master Toggle */}
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-semibold text-slate-600">
                  {formData.isReferralRewardEnabled
                    ? "Enabled"
                    : "Disabled (Off)"}
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isReferralRewardEnabled}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        isReferralRewardEnabled: e.target.checked,
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
            </div>

            <fieldset
              disabled={!formData.isReferralRewardEnabled}
              className={`grid grid-cols-1 sm:grid-cols-2 gap-4 transition-opacity border-0 p-0 m-0 ${
                !formData.isReferralRewardEnabled
                  ? "opacity-60 pointer-events-none select-none"
                  : ""
              }`}
            >
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  Coins to Referrer on 1st Paid Booking
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    disabled={!formData.isReferralRewardEnabled}
                    value={formData.coinsPerActiveReferral ?? ""}
                    onChange={(e) =>
                      handleNumberChange(
                        "coinsPerActiveReferral",
                        e.target.value,
                      )
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                  />
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 font-bold text-xs">
                    PDC
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Awarded strictly once per referee (idempotent DB constraint).
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  Referee Welcome Gift (1st Check-In)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    disabled={!formData.isReferralRewardEnabled}
                    value={formData.refereeWelcomeBonus ?? ""}
                    onChange={(e) =>
                      handleNumberChange("refereeWelcomeBonus", e.target.value)
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                  />
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 font-bold text-xs">
                    PDC
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Granted strictly on the referee&apos;s 1st physical check-in
                  (prevents sign-up bot farming).
                </p>
              </div>

              {/* Extended Referral Parameters */}
              <div className="sm:col-span-2 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    1st Booking Reward (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="any"
                      disabled={!formData.isReferralRewardEnabled}
                      value={formData.referralRewardPercent ?? ""}
                      onChange={(e) =>
                        handleNumberChange(
                          "referralRewardPercent",
                          e.target.value,
                        )
                      }
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 disabled:bg-slate-100 disabled:text-slate-400"
                    />
                    <span className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 font-bold text-[10px]">
                      %
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Default: 5%
                  </span>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Reward Floor (Min)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      disabled={!formData.isReferralRewardEnabled}
                      value={formData.referralFloorCoins ?? ""}
                      onChange={(e) =>
                        handleNumberChange("referralFloorCoins", e.target.value)
                      }
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 disabled:bg-slate-100 disabled:text-slate-400"
                    />
                    <span className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 font-bold text-[10px]">
                      PDC
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Default: 50 PD
                  </span>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Reward Ceiling (Cap)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      disabled={!formData.isReferralRewardEnabled}
                      value={formData.referralCapCoins ?? ""}
                      onChange={(e) =>
                        handleNumberChange("referralCapCoins", e.target.value)
                      }
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 disabled:bg-slate-100 disabled:text-slate-400"
                    />
                    <span className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 font-bold text-[10px]">
                      PDC
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Default: 1,000 PD
                  </span>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Attribution Window
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      disabled={!formData.isReferralRewardEnabled}
                      value={formData.referralWindowDays ?? ""}
                      onChange={(e) =>
                        handleNumberChange("referralWindowDays", e.target.value)
                      }
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 disabled:bg-slate-100 disabled:text-slate-400"
                    />
                    <span className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 font-bold text-[10px]">
                      Days
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Default: 90 Days
                  </span>
                </div>
              </div>
            </fieldset>
          </div>

          {/* 3. Redemption at Checkout Policy */}
          <div className="bg-white rounded-2xl border border-[#EBE7F5] p-5 sm:p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#23055c]" />
                  <h2 className="text-base font-bold text-slate-900">
                    Checkout Redemption &amp; Valuation
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Define the fiat conversion rate and maximum discount allowable
                  per reservation.
                </p>
              </div>

              {/* Redemption Toggle */}
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-semibold text-slate-600">
                  {formData.isRedemptionEnabled ? "Enabled" : "Disabled"}
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isRedemptionEnabled}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        isRedemptionEnabled: e.target.checked,
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
            </div>

            <fieldset
              disabled={!formData.isRedemptionEnabled}
              className={`space-y-4 transition-opacity border-0 p-0 m-0 ${
                !formData.isRedemptionEnabled
                  ? "opacity-60 pointer-events-none select-none"
                  : ""
              }`}
            >
              {/* Conversion Rate pair */}
              <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-[#23055c] uppercase tracking-wider block">
                    Coin Conversion Valuation
                  </span>
                  <span className="text-xs text-slate-600">
                    How much discount in Naira do PD Coins provide at checkout?
                  </span>
                </div>
                <div className="flex items-center gap-2 font-bold text-sm text-slate-900 shrink-0">
                  <div className="w-24">
                    <input
                      type="number"
                      min="1"
                      disabled={!formData.isRedemptionEnabled}
                      value={formData.redemptionRateCoins ?? ""}
                      onChange={(e) =>
                        handleNumberChange(
                          "redemptionRateCoins",
                          e.target.value,
                        )
                      }
                      className="w-full px-2.5 py-1.5 bg-white border border-purple-200 rounded-lg text-center text-xs font-bold disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                    />
                    <span className="text-[10px] text-slate-400 block text-center mt-0.5">
                      PD Coins
                    </span>
                  </div>
                  <span className="text-slate-400">=</span>
                  <div className="w-24">
                    <input
                      type="number"
                      min="1"
                      disabled={!formData.isRedemptionEnabled}
                      value={formData.redemptionRateNgn ?? ""}
                      onChange={(e) =>
                        handleNumberChange("redemptionRateNgn", e.target.value)
                      }
                      className="w-full px-2.5 py-1.5 bg-white border border-purple-200 rounded-lg text-center text-xs font-bold text-[#23055c] disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                    />
                    <span className="text-[10px] text-slate-400 block text-center mt-0.5">
                      Naira (₦)
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">
                    Minimum Coins Required to Redeem
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      disabled={!formData.isRedemptionEnabled}
                      value={formData.minCoinsToRedeem ?? ""}
                      onChange={(e) =>
                        handleNumberChange("minCoinsToRedeem", e.target.value)
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                    />
                    <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 font-bold text-xs">
                      PDC
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Prevents trivial micro-redemptions (Default: 100 PDC).
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">
                    Max Order Percentage Redeemable (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      step="1"
                      disabled={!formData.isRedemptionEnabled}
                      value={formData.maxDiscountPercent ?? ""}
                      onChange={(e) =>
                        handleNumberChange("maxDiscountPercent", e.target.value)
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                    />
                    <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 font-bold text-xs">
                      %
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    e.g. 50% means coins can cover up to half the booking cost.
                  </p>
                </div>
              </div>
            </fieldset>
          </div>

          {/* 4. Milestones, Streaks & Member Lifecycle Bonuses */}
          <div className="bg-white rounded-2xl border border-[#EBE7F5] p-5 sm:p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-[#23055c]" />
                  <h2 className="text-base font-bold text-slate-900">
                    Milestones, Streaks &amp; Lifecycle Bonuses
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Configure celebration bonuses for member birthdays, frequency
                  streaks, and new account onboarding.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* A. Annual Birthday Celebration Bonus */}
              <div className="p-4 bg-pink-50/40 rounded-xl border border-pink-100 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Gift className="w-4 h-4 text-pink-600" />
                      <span className="text-xs font-bold text-slate-900">
                        Birthday Bonus
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isBirthdayBonusEnabled}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            isBirthdayBonusEnabled: e.target.checked,
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-9 h-4.5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-pink-600"></div>
                    </label>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Granted once per calendar year on member&apos;s birthday.
                  </p>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Birthday Reward (PD)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      disabled={!formData.isBirthdayBonusEnabled}
                      value={formData.birthdayBonusCoins ?? ""}
                      onChange={(e) =>
                        handleNumberChange("birthdayBonusCoins", e.target.value)
                      }
                      className="w-full px-3 py-2 bg-white border border-pink-200 rounded-lg text-sm font-bold text-slate-900 disabled:bg-slate-100 disabled:text-slate-400"
                      placeholder="50"
                    />
                    <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-pink-500 font-bold text-xs">
                      PD
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    e.g. 50 PD or 500 PD
                  </span>
                </div>
              </div>

              {/* B. Streak & Frequency Milestone */}
              <div className="p-4 bg-amber-50/40 rounded-xl border border-amber-100 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Flame className="w-4 h-4 text-amber-600" />
                      <span className="text-xs font-bold text-slate-900">
                        Streak Bonus
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isStreakBonusEnabled}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            isStreakBonusEnabled: e.target.checked,
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-9 h-4.5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-amber-600"></div>
                    </label>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Rewarding repeat visits and check-in momentum.
                  </p>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Streak Reward (PD)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        disabled={!formData.isStreakBonusEnabled}
                        value={formData.streakBonusCoins ?? ""}
                        onChange={(e) =>
                          handleNumberChange("streakBonusCoins", e.target.value)
                        }
                        className="w-full px-3 py-1.5 bg-white border border-amber-200 rounded-lg text-xs font-bold text-slate-900 disabled:bg-slate-100 disabled:text-slate-400"
                        placeholder="30"
                      />
                      <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-amber-600 font-bold text-xs">
                        PD
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">
                        Check-in Target
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          disabled={!formData.isStreakBonusEnabled}
                          value={formData.streakThresholdCount ?? ""}
                          onChange={(e) =>
                            handleNumberChange(
                              "streakThresholdCount",
                              e.target.value,
                            )
                          }
                          className="w-full px-2 py-1 bg-white border border-amber-200 rounded text-xs font-semibold text-slate-900 disabled:bg-slate-100"
                          placeholder="4"
                        />
                      </div>
                      <span className="text-[9px] text-slate-400">
                        e.g. 4 visits
                      </span>
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">
                        Window (Days)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          disabled={!formData.isStreakBonusEnabled}
                          value={formData.streakWindowDays ?? ""}
                          onChange={(e) =>
                            handleNumberChange(
                              "streakWindowDays",
                              e.target.value,
                            )
                          }
                          className="w-full px-2 py-1 bg-white border border-amber-200 rounded text-xs font-semibold text-slate-900 disabled:bg-slate-100"
                          placeholder="30"
                        />
                      </div>
                      <span className="text-[9px] text-slate-400">
                        e.g. 30 days
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* C. Welcome / Signup Onboarding Bonus */}
              <div className="p-4 bg-purple-50/40 rounded-xl border border-purple-100 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <UserPlus className="w-4 h-4 text-[#23055c]" />
                      <span className="text-xs font-bold text-slate-900">
                        Welcome Signup
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isSignupBonusEnabled}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            isSignupBonusEnabled: e.target.checked,
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-9 h-4.5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#23055c]"></div>
                    </label>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Granted to new customers on verified profile creation.
                  </p>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Welcome Reward (PD)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      disabled={!formData.isSignupBonusEnabled}
                      value={formData.signupBonusCoins ?? ""}
                      onChange={(e) =>
                        handleNumberChange("signupBonusCoins", e.target.value)
                      }
                      className="w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-sm font-bold text-slate-900 disabled:bg-slate-100 disabled:text-slate-400"
                      placeholder="500"
                    />
                    <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#23055c] font-bold text-xs">
                      PD
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Default: 500 PD
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Coin Lifespan & Operator Risk Policies */}
          <div className="bg-white rounded-2xl border border-[#EBE7F5] p-5 sm:p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#23055c]" />
                  <h2 className="text-base font-bold text-slate-900">
                    Coin Expiry &amp; Risk Guardrails
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Enforce balance inactivity expiry periods, checkout hold
                  timeouts, and operator manual adjustment ceilings.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Inactivity Expiry */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-600" />
                    <span className="text-xs font-bold text-slate-800">
                      Inactivity Expiry
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isExpiryEnabled}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          isExpiryEnabled: e.target.checked,
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="60"
                    step="1"
                    disabled={!formData.isExpiryEnabled}
                    value={formData.expiryMonths ?? ""}
                    onChange={(e) =>
                      handleNumberChange("expiryMonths", e.target.value)
                    }
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 disabled:bg-slate-100 disabled:text-slate-400"
                    placeholder="12"
                  />
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 font-semibold text-xs">
                    Months
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 leading-snug">
                  Balances expire if member has 0 earn or burn activity for this
                  duration (Default: 12 months).
                </p>
              </div>

              {/* Operator Daily Ceiling */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-xs font-bold text-slate-800">
                    Operator Daily Ceiling
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={formData.dailyAdjustmentLimitCoins ?? ""}
                    onChange={(e) =>
                      handleNumberChange(
                        "dailyAdjustmentLimitCoins",
                        e.target.value,
                      )
                    }
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                    placeholder="20000"
                  />
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 font-semibold text-xs">
                    PD / Day
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 leading-snug">
                  Maximum manual coin adjustments permitted per individual staff
                  operator per day (Default: 20,000 PD).
                </p>
              </div>

              {/* Checkout Hold Timeout */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-600" />
                  <span className="text-xs font-bold text-slate-800">
                    Checkout Hold Expiry
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="120"
                    step="1"
                    value={formData.holdExpiryMinutes ?? ""}
                    onChange={(e) =>
                      handleNumberChange("holdExpiryMinutes", e.target.value)
                    }
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                    placeholder="15"
                  />
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 font-semibold text-xs">
                    Minutes
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 leading-snug">
                  Temporary coin reservation hold released if customer abandons
                  the Paystack checkout modal (Default: 15m).
                </p>
              </div>
            </div>
          </div>
        </fieldset>

        {/* Save Actions */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            Formula changes are recorded in the system audit log.
          </p>

          {!readOnly ? (
            <button
              type="submit"
              disabled={saving || loading}
              className="px-6 py-2.5 bg-[#23055c] hover:bg-[#2f136d] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Formula Settings</span>
                </>
              )}
            </button>
          ) : (
            <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold bg-slate-100 px-4 py-2 rounded-xl">
              <Lock className="w-4 h-4 text-slate-400" />
              <span>Read-Only Mode</span>
            </div>
          )}
        </div>
      </form>

      {/* Live Formula Simulator Widget (Sticky Sidebar) */}
      <div className="lg:col-span-4 space-y-4">
        <div className="bg-gradient-to-br from-slate-900 to-[#1b0a3a] rounded-2xl p-5 text-white shadow-md space-y-5 sticky top-24 border border-purple-900/50">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white tracking-tight">
                Live Formula Simulator
              </h3>
            </div>
            <span className="text-[10px] font-bold uppercase bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/30">
              Interactive
            </span>
          </div>

          <p className="text-xs text-purple-200/80 leading-relaxed">
            Test how your formula behaves in real reservation scenarios before
            saving.
          </p>

          {/* Simulator Inputs */}
          <div className="space-y-3.5">
            <div>
              <label className="text-[11px] font-semibold text-purple-200 block mb-1">
                Simulated Booking Total (₦)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-purple-300 font-bold text-xs">
                  ₦
                </span>
                <input
                  type="number"
                  step="1000"
                  min="0"
                  value={simSpend}
                  onChange={(e) =>
                    setSimSpend(
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                  className="w-full pl-7 pr-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-xs font-bold text-white focus:outline-hidden focus:border-amber-400"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-purple-200 block mb-1">
                Customer Redeems Coins (PDC)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="100"
                  min="0"
                  value={simCoinsToRedeem}
                  onChange={(e) =>
                    setSimCoinsToRedeem(
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                  className="w-full pl-3 pr-12 py-1.5 bg-white/10 border border-white/20 rounded-lg text-xs font-bold text-white focus:outline-hidden focus:border-amber-400"
                />
                <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-purple-300 font-bold text-xs">
                  PDC
                </span>
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-purple-200 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={simIsReferredFirstBooking}
                onChange={(e) => setSimIsReferredFirstBooking(e.target.checked)}
                className="rounded text-amber-400 focus:ring-0"
              />
              <span>Referred friend&apos;s 1st paid booking</span>
            </label>

            {/* Milestone Simulators */}
            <div className="pt-2.5 border-t border-white/10 space-y-2">
              <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider block">
                Lifecycle &amp; Milestone Simulators
              </span>
              <label className="flex items-center gap-2 text-xs text-purple-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={simIncludeBirthday}
                  onChange={(e) => setSimIncludeBirthday(e.target.checked)}
                  className="rounded text-pink-400 focus:ring-0"
                />
                <span>
                  Member Birthday (+{formData.birthdayBonusCoins || 0} PD)
                </span>
              </label>
              <label className="flex items-center gap-2 text-xs text-purple-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={simIncludeStreak}
                  onChange={(e) => setSimIncludeStreak(e.target.checked)}
                  className="rounded text-amber-400 focus:ring-0"
                />
                <span>
                  Streak Hit ({formData.streakThresholdCount} visits in{" "}
                  {formData.streakWindowDays}d: +
                  {formData.streakBonusCoins || 0} PD)
                </span>
              </label>
              <label className="flex items-center gap-2 text-xs text-purple-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={simIncludeSignup}
                  onChange={(e) => setSimIncludeSignup(e.target.checked)}
                  className="rounded text-purple-400 focus:ring-0"
                />
                <span>
                  New Signup Welcome (+{formData.signupBonusCoins || 0} PD)
                </span>
              </label>
            </div>
          </div>

          {/* Live Outcome Calculation */}
          <div className="bg-black/30 rounded-xl p-4 border border-white/10 space-y-3">
            <span className="text-[10px] uppercase font-bold text-purple-300 tracking-wider block">
              Simulation Results
            </span>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-300">
                <span>Gross Booking Total:</span>
                <span className="font-mono">{formatNgn(simSpend)}</span>
              </div>

              {simDiscountNgn > 0 && (
                <div className="flex justify-between items-center text-amber-300">
                  <span>Coin Discount ({simCoinsActuallyUsed} PDC):</span>
                  <span className="font-mono">
                    -{formatNgn(simDiscountNgn)}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center font-bold text-white border-t border-white/10 pt-1.5">
                <span>Net Cash Paid (Paystack):</span>
                <span className="font-mono text-amber-300">
                  {formatNgn(simNetCash)}
                </span>
              </div>

              <div className="pt-2 border-t border-white/10 space-y-1.5">
                <div className="flex justify-between items-center text-emerald-400 font-bold">
                  <span>Customer Earns:</span>
                  <span className="font-mono">+{simCoinsEarned} PDC</span>
                </div>
                <p className="text-[10px] text-purple-300/80">
                  (Strictly earned on {formatNgn(simNetCash)} net cash)
                </p>

                {simReferralBonus > 0 && (
                  <div className="flex justify-between items-center text-purple-300 font-semibold pt-1">
                    <span>Referrer Bonus:</span>
                    <span className="font-mono">+{simReferralBonus} PDC</span>
                  </div>
                )}

                {simWelcomeBonus > 0 && (
                  <div className="flex justify-between items-center text-purple-300 font-semibold">
                    <span>Friend Welcome Gift:</span>
                    <span className="font-mono">+{simWelcomeBonus} PDC</span>
                  </div>
                )}

                {simBirthdayBonus > 0 && (
                  <div className="flex justify-between items-center text-pink-300 font-semibold">
                    <span>Birthday Bonus:</span>
                    <span className="font-mono">+{simBirthdayBonus} PDC</span>
                  </div>
                )}

                {simStreakBonus > 0 && (
                  <div className="flex justify-between items-center text-amber-300 font-semibold">
                    <span>
                      Streak ({formData.streakThresholdCount} check-ins/
                      {formData.streakWindowDays}d):
                    </span>
                    <span className="font-mono">+{simStreakBonus} PDC</span>
                  </div>
                )}

                {simSignupBonus > 0 && (
                  <div className="flex justify-between items-center text-purple-300 font-semibold">
                    <span>Welcome Signup Gift:</span>
                    <span className="font-mono">+{simSignupBonus} PDC</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
