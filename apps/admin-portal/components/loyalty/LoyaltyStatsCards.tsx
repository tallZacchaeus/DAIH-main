"use client";

import React from "react";
import { AdminLoyaltyStatsDTO } from "@daih/types";
import { Coins, TrendingUp, ArrowDownRight, Users, Scale } from "lucide-react";

interface LoyaltyStatsCardsProps {
  stats: AdminLoyaltyStatsDTO | null;
  loading?: boolean;
}

export const LoyaltyStatsCards: React.FC<LoyaltyStatsCardsProps> = ({
  stats,
  loading = false,
}) => {
  if (loading && !stats) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-[#EBE7F5] p-5 animate-pulse h-32 flex flex-col justify-between"
          >
            <div className="h-4 bg-slate-200 rounded w-1/3"></div>
            <div className="h-8 bg-slate-200 rounded w-2/3"></div>
            <div className="h-3 bg-slate-100 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

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

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Coins in Circulation */}
      <div className="bg-gradient-to-br from-[#23055c] via-[#2f136d] to-[#492e88] rounded-2xl p-5 text-white shadow-sm relative overflow-hidden flex flex-col justify-between">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />
        <div className="flex items-center justify-between z-10">
          <span className="text-xs font-bold uppercase tracking-wider text-purple-200">
            Coins in Circulation
          </span>
          <div className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-amber-300">
            <Coins className="w-4 h-4" />
          </div>
        </div>
        <div className="my-2 z-10">
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {formatCoins(stats?.totalCirculationCoins || 0)}{" "}
            <span className="text-sm font-bold text-amber-300">PDC</span>
          </div>
          <div className="text-xs text-purple-200 mt-1 flex items-center gap-1.5 font-medium">
            <Scale className="w-3.5 h-3.5 text-purple-300" />
            <span>
              Fiat Value: {formatNgn(stats?.totalCirculationNgn || 0)}
            </span>
          </div>
        </div>
        <div className="text-[11px] text-purple-200/70 border-t border-white/10 pt-2 z-10 flex items-center justify-between">
          <span>Active Hub Liability</span>
          <span>100 PDC = ₦100</span>
        </div>
      </div>

      {/* 2. Lifetime Coins Awarded */}
      <div className="bg-white rounded-2xl border border-[#EBE7F5] p-5 shadow-xs flex flex-col justify-between hover:border-purple-200 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Lifetime Awarded
          </span>
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div className="my-2">
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {formatCoins(stats?.lifetimeCoinsEarned || 0)}{" "}
            <span className="text-sm font-bold text-emerald-600">PDC</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Total tokens generated across all bookings &amp; referrals
          </p>
        </div>
        <div className="text-[11px] text-slate-400 border-t border-slate-100 pt-2 flex items-center justify-between">
          <span>Total Operations</span>
          <span className="font-semibold text-slate-700">
            {stats?.totalTransactionsCount ?? 0} records
          </span>
        </div>
      </div>

      {/* 3. Lifetime Coins Redeemed */}
      <div className="bg-white rounded-2xl border border-[#EBE7F5] p-5 shadow-xs flex flex-col justify-between hover:border-purple-200 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Total Redeemed
          </span>
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <ArrowDownRight className="w-4 h-4" />
          </div>
        </div>
        <div className="my-2">
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {formatCoins(stats?.lifetimeCoinsRedeemed || 0)}{" "}
            <span className="text-sm font-bold text-amber-600">PDC</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Converted into checkout discounts by customers
          </p>
        </div>
        <div className="text-[11px] text-slate-400 border-t border-slate-100 pt-2 flex items-center justify-between">
          <span>Savings Delivered</span>
          <span className="font-semibold text-slate-700">
            {formatNgn(
              (stats?.lifetimeCoinsRedeemed || 0) *
                (stats?.redemptionRateNgnPerCoin || 1),
            )}
          </span>
        </div>
      </div>

      {/* 4. Active Earners Count */}
      <div className="bg-white rounded-2xl border border-[#EBE7F5] p-5 shadow-xs flex flex-col justify-between hover:border-purple-200 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Active Token Holders
          </span>
          <div className="w-8 h-8 rounded-xl bg-purple-50 text-[#23055c] flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
        </div>
        <div className="my-2">
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {formatCoins(stats?.activeEarnersCount || 0)}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Registered customers with positive coin balances
          </p>
        </div>
        <div className="text-[11px] text-slate-400 border-t border-slate-100 pt-2 flex items-center justify-between">
          <span>Program Status</span>
          <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Active
          </span>
        </div>
      </div>
    </div>
  );
};
