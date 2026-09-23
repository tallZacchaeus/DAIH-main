"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { api } from "@daih/api-client";
import { useToast } from "@daih/ui";
import {
  LoyaltyWalletDTO,
  LoyaltyTransactionDTO,
  LoyaltySettingsRecord,
} from "@daih/types";
import {
  Coins,
  Sparkles,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  Gift,
  Users,
  Award,
  RefreshCw,
  Loader2,
  ChevronRight,
  ShieldCheck,
  Zap,
  Info,
} from "lucide-react";
import { MemberTierBadge } from "../../../components/loyalty/MemberTierBadge";

export default function LoyaltyRewardsPage() {
  const toast = useToast();
  const [wallet, setWallet] = useState<LoyaltyWalletDTO | null>(null);
  const [settings, setSettings] = useState<LoyaltySettingsRecord | null>(null);
  const [ledgerItems, setLedgerItems] = useState<LoyaltyTransactionDTO[]>([]);
  const [ledgerTotal, setLedgerTotal] = useState(0);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);

  const fetchLoyaltyData = useCallback(
    async (forceRefresh = false, options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setLoading(true);
      }
      try {
        const [walletRes, settingsRes, ledgerRes] = await Promise.all([
          api.loyalty.getMyWallet(forceRefresh),
          api.loyalty.getSettings(),
          api.loyalty.getMyHistory({
            page: ledgerPage,
            limit: 15,
            type: activeFilter === "ALL" ? undefined : activeFilter,
          }),
        ]);
        setWallet(walletRes);
        setSettings(settingsRes);
        setLedgerItems(ledgerRes.items || []);
        setLedgerTotal(ledgerRes.total || 0);
      } catch (err: any) {
        if (!options?.silent) {
          toast.error(
            err?.message || "Failed to load loyalty rewards details.",
          );
        }
      } finally {
        if (!options?.silent) {
          setLoading(false);
        }
      }
    },
    [ledgerPage, activeFilter, toast],
  );

  // Initial load always does fresh fetch
  useEffect(() => {
    fetchLoyaltyData(true);
  }, [fetchLoyaltyData]);

  // Auto-refresh when tab gains focus, when payment/redemption updates occur, or periodic active polling
  useEffect(() => {
    const handleUpdate = () => {
      fetchLoyaltyData(true, { silent: true });
    };

    if (typeof window !== "undefined") {
      window.addEventListener("focus", handleUpdate);
      window.addEventListener("daih:loyalty-updated", handleUpdate);
    }

    // Poll every 8 seconds while tab is active to immediately capture webhook rewards
    const timer = setInterval(() => {
      if (
        typeof document !== "undefined" &&
        document.visibilityState === "visible"
      ) {
        fetchLoyaltyData(true, { silent: true });
      }
    }, 8000);

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("focus", handleUpdate);
        window.removeEventListener("daih:loyalty-updated", handleUpdate);
      }
      clearInterval(timer);
    };
  }, [fetchLoyaltyData]);

  const formatNgn = (val: number) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(val || 0);

  const formatCoins = (val: number) =>
    new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 0,
    }).format(val || 0);

  const formatDate = (isoStr: string) => {
    try {
      return new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(isoStr));
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 w-full pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-600" />
              Rewards &amp; Loyalty
            </span>
            <span className="text-xs text-slate-500 font-medium">
              DAIH Member Perks
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#181c20] tracking-tight flex items-center gap-2.5">
            <Coins className="w-7 h-7 text-[#23055c]" />
            PD Coin Rewards
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Earn digital tokens with every booking and active referral. Redeem
            coins for instant checkout discounts and future hub perks.
          </p>
        </div>

        <button
          onClick={() => fetchLoyaltyData(true)}
          disabled={loading}
          className="self-start sm:self-auto p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition-all shadow-2xs cursor-pointer disabled:opacity-50"
          title="Refresh Data"
        >
          <RefreshCw
            className={`h-4 w-4 ${loading ? "animate-spin text-[#23055c]" : ""}`}
          />
        </button>
      </div>

      {loading && !wallet ? (
        <div className="py-24 text-center space-y-3 bg-white rounded-2xl border border-[#EBE7F5] shadow-xs">
          <Loader2 className="h-8 w-8 animate-spin text-[#23055c] mx-auto" />
          <p className="text-xs text-slate-500 font-semibold">
            Loading your PD Coin balance &amp; rewards...
          </p>
        </div>
      ) : (
        <>
          {/* Hero Coin Wallet Card */}
          <div className="bg-gradient-to-br from-[#23055c] via-[#2f136d] to-[#492e88] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-48 h-48 bg-purple-400/15 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              {/* Balance column */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-amber-300 text-xs font-bold backdrop-blur-sm border border-white/15">
                    <Coins className="w-3.5 h-3.5" />
                    Available Balance
                  </span>
                  <MemberTierBadge
                    variant="pill"
                    tier={wallet?.tier}
                    lifetimeEarned={wallet?.lifetimeEarned || 0}
                    multiplier={wallet?.tierMultiplier}
                    className="bg-white/20 border-white/30 text-white"
                  />
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-black tracking-tight text-white font-mono">
                    {formatCoins(wallet?.availableBalance || 0)}
                  </span>
                  <span className="text-xl sm:text-2xl font-extrabold text-amber-300 tracking-wide">
                    {wallet?.coinSymbol || "PDC"}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className="bg-white/15 px-3 py-1 rounded-full text-purple-100 font-semibold backdrop-blur-xs">
                    Worth ~ {formatNgn(wallet?.equivalentNgnValue || 0)} in
                    booking discounts
                  </span>

                  {wallet && wallet.reservedCoins > 0 && (
                    <span className="bg-amber-500/20 text-amber-200 border border-amber-400/30 px-3 py-1 rounded-full font-medium">
                      {formatCoins(wallet.reservedCoins)} PDC reserved in
                      pending checkout
                    </span>
                  )}
                </div>
              </div>

              {/* Quick stats column */}
              <div className="grid grid-cols-2 gap-3 shrink-0 sm:w-80">
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15">
                  <span className="text-[11px] uppercase tracking-wider text-purple-200 font-bold block">
                    Lifetime Earned
                  </span>
                  <p className="text-xl font-extrabold font-mono text-emerald-300 mt-0.5">
                    +{formatCoins(wallet?.lifetimeEarned || 0)}
                  </p>
                  <span className="text-[10px] text-purple-200/70">
                    Total rewards issued
                  </span>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15">
                  <span className="text-[11px] uppercase tracking-wider text-purple-200 font-bold block">
                    Lifetime Redeemed
                  </span>
                  <p className="text-xl font-extrabold font-mono text-amber-300 mt-0.5">
                    {formatCoins(wallet?.lifetimeSpent || 0)}
                  </p>
                  <span className="text-[10px] text-purple-200/70">
                    Spent on bookings
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Member Tier & Multiplier Showcase Card */}
          <MemberTierBadge
            variant="card"
            tier={wallet?.tier}
            lifetimeEarned={wallet?.lifetimeEarned || 0}
            multiplier={wallet?.tierMultiplier}
          />

          {/* How to Earn & Perks Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Book & Earn */}
            <div className="bg-white rounded-2xl border border-[#EBE7F5] p-5 shadow-xs flex flex-col justify-between hover:border-purple-200 transition-all">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#23055c] flex items-center justify-center font-bold">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Book &amp; Earn Automatically
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {settings?.formulaMode === "SPEND_RATIO"
                      ? `Earn 1 ${settings?.coinName || "PD Coin"} for every ₦${(settings?.spendRatioNgn || 200).toLocaleString()} spent on confirmed desk and workspace bookings.`
                      : settings?.formulaMode === "PERCENTAGE"
                        ? `Earn ${settings?.percentageRate || 5}% of your booking amount back in ${settings?.coinName || "PD Coins"}.`
                        : `Earn ${settings?.fixedAmountCoins || 50} ${settings?.coinName || "PD Coins"} on every completed reservation.`}
                  </p>
                </div>
              </div>

              <Link
                href="/book"
                className="mt-4 pt-3 border-t border-slate-100 text-xs font-bold text-[#23055c] flex items-center justify-between group"
              >
                <span>Browse Workspaces</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            {/* Card 2: Refer Friends */}
            <div className="bg-white rounded-2xl border border-[#EBE7F5] p-5 shadow-xs flex flex-col justify-between hover:border-purple-200 transition-all">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">
                      Invite Friends
                    </h3>
                    {settings?.isReferralRewardEnabled ? (
                      <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800">
                        Bonus Active
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-slate-100 text-slate-600">
                        Milestones
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {settings?.isReferralRewardEnabled
                      ? settings.referralRewardPercent
                        ? `Earn ${settings.referralRewardPercent}% of your referred friend's booking spend in ${settings.coinName || "PD Coins"} (min ${settings.referralFloorCoins || 50} ${settings.coinSymbol || "PD"} on first booking, up to ${settings.referralCapCoins?.toLocaleString() || "1,000"} ${settings.coinSymbol || "PD"} within ${settings.referralWindowDays || 90} days).`
                        : `Earn ${settings.coinsPerActiveReferral} ${settings.coinName || "PD Coins"} when your referred friend completes their first paid reservation.`
                      : "Share your referral link with colleagues and track your network as they join DAIH."}
                  </p>
                </div>
              </div>

              <Link
                href="/referrals"
                className="mt-4 pt-3 border-t border-slate-100 text-xs font-bold text-amber-700 flex items-center justify-between group"
              >
                <span>Share Referral Link</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            {/* Card 3: Future Perks & Milestone Tiers */}
            <div className="bg-white rounded-2xl border border-[#EBE7F5] p-5 shadow-xs flex flex-col justify-between hover:border-purple-200 transition-all">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Redeem on Checkout &amp; Perks
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {settings?.isRedemptionEnabled
                      ? `Use your ${settings?.coinName || "PD Coins"} at checkout for instant discounts (${settings?.redemptionRateCoins || 100} ${settings?.coinSymbol || "PDC"} = ₦${(settings?.redemptionRateNgn || 100).toLocaleString()}). Lifetime coins also count toward VIP status.`
                      : "Accumulate lifetime PD Coins toward exclusive member milestone privileges and hub perks."}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
                <span>
                  {settings?.redemptionRateCoins || 100}{" "}
                  {settings?.coinSymbol || "PDC"} = ₦
                  {(settings?.redemptionRateNgn || 100).toLocaleString()} Value
                </span>
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
          </div>

          {/* Activity Ledger Timeline */}
          <div className="bg-white rounded-2xl border border-[#EBE7F5] shadow-xs overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-[#EBE7F5] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Coin Activity &amp; Earning History
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Complete history of all PD Coins earned, redeemed, or
                  adjusted.
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                {[
                  { label: "All Activity", value: "ALL" },
                  { label: "Bookings", value: "TRANSACTION_REWARD" },
                  { label: "Referrals", value: "ACTIVE_REFERRAL_BONUS" },
                  { label: "Redeemed", value: "REDEMPTION_BOOKING" },
                ].map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => {
                      setActiveFilter(tab.value);
                      setLedgerPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-all whitespace-nowrap cursor-pointer ${
                      activeFilter === tab.value
                        ? "bg-[#23055c] text-white shadow-xs"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            {ledgerItems.length === 0 ? (
              <div className="py-16 text-center space-y-3 px-4">
                <div className="w-12 h-12 rounded-full bg-purple-50 text-[#23055c] flex items-center justify-center mx-auto">
                  <Coins className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-800">
                  No coin activity yet
                </p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Complete your first workspace reservation or invite a
                  colleague to start earning PD Coins!
                </p>
                <Link
                  href="/book"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#23055c] text-white rounded-xl text-xs font-bold hover:bg-[#2f136d] transition-all"
                >
                  Book a Workspace
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {ledgerItems.map((tx) => {
                  const isCredit = tx.amount > 0;
                  return (
                    <div
                      key={tx.id}
                      className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            isCredit
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {isCredit ? (
                            <ArrowUpRight className="w-5 h-5" />
                          ) : (
                            <ArrowDownLeft className="w-5 h-5" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                            {tx.description}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                            <span>{formatDate(tx.createdAt)}</span>
                            <span>•</span>
                            <span className="font-mono">
                              Ref: {tx.referenceId.slice(0, 16)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div
                          className={`font-mono text-sm sm:text-base font-extrabold ${
                            isCredit ? "text-emerald-600" : "text-amber-600"
                          }`}
                        >
                          {isCredit ? `+${tx.amount}` : tx.amount} PDC
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Bal: {tx.balanceAfter} PDC
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
