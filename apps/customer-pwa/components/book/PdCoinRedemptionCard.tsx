"use client";

import React, { useState, useEffect, useCallback } from "react";
import { api } from "@daih/api-client";
import {
  LoyaltyWalletDTO,
  LoyaltySettingsRecord,
  RedemptionPreviewResponseDTO,
} from "@daih/types";
import {
  Coins,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";

interface PdCoinRedemptionCardProps {
  bookingId: string;
  bookingTotalAmount: number;
  onRedemptionChange: (
    appliedDiscountNgn: number,
    coinsRedeemed: number,
  ) => void;
  appliedCoins?: number;
  appliedDiscountNgn?: number;
}

export function PdCoinRedemptionCard({
  bookingId,
  bookingTotalAmount,
  onRedemptionChange,
  appliedCoins = 0,
  appliedDiscountNgn = 0,
}: PdCoinRedemptionCardProps) {
  const [wallet, setWallet] = useState<LoyaltyWalletDTO | null>(null);
  const [settings, setSettings] = useState<LoyaltySettingsRecord | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);

  const [useCoins, setUseCoins] = useState(appliedCoins > 0);
  const [selectedCoins, setSelectedCoins] = useState<number>(appliedCoins || 0);
  const [preview, setPreview] = useState<RedemptionPreviewResponseDTO | null>(
    null,
  );
  const [previewing, setPreviewing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isApplied, setIsApplied] = useState(appliedCoins > 0);

  // Load wallet and settings
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoadingInitial(true);
      try {
        const [walletRes, settingsRes] = await Promise.all([
          api.loyalty.getMyWallet(true),
          api.loyalty.getSettings(),
        ]);
        if (isMounted) {
          setWallet(walletRes);
          setSettings(settingsRes);
          if (appliedCoins > 0) {
            setSelectedCoins(appliedCoins);
            setIsApplied(true);
          }
        }
      } catch (err: any) {
        console.warn("Loyalty redemption load error:", err?.message);
      } finally {
        if (isMounted) setLoadingInitial(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [appliedCoins]);

  // Calculate maximum allowed coins based on wallet available balance & settings maxDiscountPercent
  const maxAllowedCoins = React.useMemo(() => {
    if (!wallet || !settings || !settings.isRedemptionEnabled) return 0;
    const available = wallet.availableBalance + (isApplied ? appliedCoins : 0);
    if (available <= 0) return 0;

    const rateCoins = Number(settings.redemptionRateCoins) || 100;
    const rateNgn = Number(settings.redemptionRateNgn) || 100;
    const maxDiscountPercent = Number(settings.maxDiscountPercent) || 50;

    const maxDiscountNgn = Math.floor(
      bookingTotalAmount * (maxDiscountPercent / 100),
    );
    const coinsForMaxDiscount = Math.floor(
      (maxDiscountNgn / rateNgn) * rateCoins,
    );

    return Math.max(0, Math.min(available, coinsForMaxDiscount));
  }, [wallet, settings, isApplied, appliedCoins, bookingTotalAmount]);

  // Initial preset selection when toggling on
  useEffect(() => {
    if (useCoins && selectedCoins === 0 && maxAllowedCoins > 0) {
      setSelectedCoins(maxAllowedCoins);
    }
  }, [useCoins, selectedCoins, maxAllowedCoins]);

  // Real-time preview calculation when selectedCoins changes
  useEffect(() => {
    if (!useCoins || selectedCoins <= 0 || !bookingId) {
      setPreview(null);
      return;
    }

    const timer = setTimeout(async () => {
      setPreviewing(true);
      setErrorMsg(null);
      try {
        const res = await api.loyalty.previewRedemption({
          bookingId,
          coinsToRedeem: selectedCoins,
        });
        setPreview(res);
        if (!res.valid) {
          setErrorMsg(res.message || "Invalid coin redemption amount");
        }
      } catch (err: any) {
        setErrorMsg(err?.message || "Could not preview coin redemption");
      } finally {
        setPreviewing(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [useCoins, selectedCoins, bookingId]);

  // Handle Apply Coins
  const handleApplyRedemption = async () => {
    if (!bookingId || selectedCoins <= 0) return;
    setApplying(true);
    setErrorMsg(null);
    try {
      const res = await api.loyalty.applyRedemption({
        bookingId,
        coinsToRedeem: selectedCoins,
      });

      if (res.valid) {
        setIsApplied(true);
        onRedemptionChange(res.discountAmountNgn, res.coinsRedeemed);
      } else {
        setErrorMsg(res.message || "Failed to apply redemption");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Could not apply PD Coin redemption");
    } finally {
      setApplying(false);
    }
  };

  // Handle Remove Redemption
  const handleRemoveRedemption = async () => {
    setApplying(true);
    setErrorMsg(null);
    try {
      await api.loyalty.applyRedemption({
        bookingId,
        coinsToRedeem: 0,
      });
      setIsApplied(false);
      setUseCoins(false);
      setSelectedCoins(0);
      setPreview(null);
      onRedemptionChange(0, 0);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to remove coin redemption");
    } finally {
      setApplying(false);
    }
  };

  // If initial load or redemption is disabled by admin, don't show card
  if (loadingInitial) {
    return (
      <div className="rounded-xl p-3.5 bg-slate-50 border border-slate-200 animate-pulse flex items-center justify-between text-xs text-slate-400">
        <span className="flex items-center gap-2">
          <Coins className="h-4 w-4 text-amber-500" />
          Loading PD Coin rewards...
        </span>
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      </div>
    );
  }

  if (!settings || !settings.isRedemptionEnabled || !wallet) {
    return null;
  }

  const coinName = settings.coinName || "PD Coin";
  const coinSymbol = settings.coinSymbol || "PDC";
  const availableCoins =
    wallet.availableBalance + (isApplied ? appliedCoins : 0);

  // If user has zero coins
  if (availableCoins <= 0) {
    return (
      <div className="rounded-xl p-3 bg-amber-50/50 border border-amber-200/60 flex items-center gap-2.5 text-xs text-amber-800">
        <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
        <span className="leading-tight">
          You currently have <strong>0 {coinSymbol}</strong>. Earn coins
          automatically on this booking to unlock discounts on your future
          visits!
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/40 via-white to-amber-50/20 p-4 shadow-xs space-y-3.5 text-left">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-white shadow-xs shrink-0">
            <Coins className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-bold text-slate-900 tracking-tight truncate">
                {coinName} Loyalty Balance
              </h4>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                Active
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Available:{" "}
              <strong className="text-amber-700 font-bold">
                {availableCoins.toLocaleString()} {coinSymbol}
              </strong>{" "}
              (≈ ₦{availableCoins.toLocaleString()})
            </p>
          </div>
        </div>

        {/* Toggle Switch */}
        {!isApplied && (
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={useCoins}
              onChange={(e) => {
                const checked = e.target.checked;
                setUseCoins(checked);
                if (!checked) {
                  setSelectedCoins(0);
                  setPreview(null);
                  setErrorMsg(null);
                }
              }}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#23055c]"></div>
          </label>
        )}
      </div>

      {/* Applied Success State */}
      {isApplied && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-emerald-800 text-xs font-semibold">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>
              Applied{" "}
              <strong>
                {appliedCoins.toLocaleString()} {coinSymbol}
              </strong>{" "}
              (-₦{appliedDiscountNgn.toLocaleString()}.00)
            </span>
          </div>
          <button
            type="button"
            onClick={handleRemoveRedemption}
            disabled={applying}
            className="text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            {applying ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <X className="h-3 w-3" />
            )}
            Remove
          </button>
        </div>
      )}

      {/* When Toggled ON & Not Yet Applied */}
      {useCoins && !isApplied && (
        <div className="space-y-3 pt-2 border-t border-amber-200/50">
          <div className="flex items-center justify-between text-xs text-slate-700">
            <span className="font-semibold">Coins to Redeem:</span>
            <span className="font-bold text-[#23055c]">
              {selectedCoins.toLocaleString()} {coinSymbol}
              {preview?.discountAmountNgn
                ? ` = -₦${preview.discountAmountNgn.toLocaleString()}.00`
                : ""}
            </span>
          </div>

          {/* Range Slider */}
          <div className="space-y-1">
            <input
              type="range"
              min={Number(settings.minCoinsToRedeem) || 1}
              max={maxAllowedCoins}
              step={10}
              value={selectedCoins}
              onChange={(e) => setSelectedCoins(Number(e.target.value))}
              disabled={maxAllowedCoins <= 0}
              className="w-full h-2 bg-amber-100 rounded-lg appearance-none cursor-pointer accent-[#23055c]"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-medium">
              <span>Min: {settings.minCoinsToRedeem || 1}</span>
              <span>Max allowed: {maxAllowedCoins.toLocaleString()}</span>
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex items-center gap-2">
            {[
              { label: "25%", factor: 0.25 },
              { label: "50%", factor: 0.5 },
              { label: "Max", factor: 1.0 },
            ].map(({ label, factor }) => {
              const val = Math.floor(maxAllowedCoins * factor);
              const isActive = selectedCoins === val;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setSelectedCoins(val)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    isActive
                      ? "bg-[#23055c] text-white"
                      : "bg-white border border-amber-200 text-slate-700 hover:bg-amber-50"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Error message */}
          {errorMsg && (
            <div className="flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-2">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Apply Button */}
          <button
            type="button"
            onClick={handleApplyRedemption}
            disabled={
              applying || previewing || selectedCoins <= 0 || Boolean(errorMsg)
            }
            className="w-full py-2.5 px-3 rounded-xl bg-[#23055c] hover:bg-[#392271] text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-2xs disabled:opacity-50 cursor-pointer"
          >
            {applying ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Applying Discount...</span>
              </>
            ) : previewing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Calculating discount...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                <span>
                  Apply {selectedCoins.toLocaleString()} {coinSymbol} Discount
                </span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
