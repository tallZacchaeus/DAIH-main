"use client";

import React from "react";
import Link from "next/link";
import {
  Shield,
  Award,
  Crown,
  Sparkles,
  ChevronRight,
  Zap,
} from "lucide-react";

export type MemberTierName = "BRONZE" | "SILVER" | "GOLD";

export interface MemberTierConfig {
  name: MemberTierName;
  displayName: string;
  multiplier: number;
  minLifetime: number;
  maxLifetime: number | null;
  nextTier: MemberTierName | null;
  nextThreshold: number | null;
  pillClasses: string;
  badgeClasses: string;
  iconClasses: string;
  accentColor: string;
  borderGlow: string;
}

export const TIER_CONFIGS: Record<MemberTierName, MemberTierConfig> = {
  BRONZE: {
    name: "BRONZE",
    displayName: "Bronze Member",
    multiplier: 1.0,
    minLifetime: 0,
    maxLifetime: 249,
    nextTier: "SILVER",
    nextThreshold: 250,
    pillClasses:
      "bg-amber-900/10 text-amber-900 border-amber-700/30 hover:bg-amber-900/15",
    badgeClasses:
      "bg-gradient-to-br from-amber-900/10 via-amber-700/15 to-amber-800/10 border-amber-600/30 text-amber-950",
    iconClasses: "text-amber-700",
    accentColor: "#b45309",
    borderGlow: "shadow-[0_0_12px_rgba(180,83,9,0.15)]",
  },
  SILVER: {
    name: "SILVER",
    displayName: "Silver Member",
    multiplier: 1.25,
    minLifetime: 250,
    maxLifetime: 999,
    nextTier: "GOLD",
    nextThreshold: 1000,
    pillClasses:
      "bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200/80 shadow-2xs",
    badgeClasses:
      "bg-gradient-to-br from-slate-200/80 via-slate-100 to-slate-300/70 border-slate-300 text-slate-900 shadow-sm",
    iconClasses: "text-slate-600",
    accentColor: "#64748b",
    borderGlow: "shadow-[0_0_12px_rgba(100,116,139,0.2)]",
  },
  GOLD: {
    name: "GOLD",
    displayName: "Gold VIP",
    multiplier: 1.5,
    minLifetime: 1000,
    maxLifetime: null,
    nextTier: null,
    nextThreshold: null,
    pillClasses:
      "bg-gradient-to-r from-amber-500/20 via-yellow-400/25 to-amber-500/20 text-amber-950 border-amber-400/70 shadow-2xs ring-1 ring-amber-400/30",
    badgeClasses:
      "bg-gradient-to-br from-amber-400/25 via-yellow-300/30 to-amber-500/25 border-amber-400/70 text-amber-950 shadow-md ring-1 ring-amber-400/30",
    iconClasses: "text-amber-600",
    accentColor: "#d97706",
    borderGlow: "shadow-[0_0_16px_rgba(245,158,11,0.35)]",
  },
};

export function resolveTier(lifetimeEarned: number = 0): MemberTierConfig {
  if (lifetimeEarned >= 1000) return TIER_CONFIGS.GOLD;
  if (lifetimeEarned >= 250) return TIER_CONFIGS.SILVER;
  return TIER_CONFIGS.BRONZE;
}

interface MemberTierBadgeProps {
  tier?: MemberTierName | string;
  lifetimeEarned?: number;
  multiplier?: number;
  variant?: "pill" | "badge" | "card";
  showMultiplier?: boolean;
  showProgress?: boolean;
  showLabel?: boolean;
  responsive?: boolean;
  className?: string;
  href?: string | null;
}

export const MemberTierBadge: React.FC<MemberTierBadgeProps> = ({
  tier,
  lifetimeEarned = 0,
  multiplier,
  variant = "pill",
  showMultiplier = true,
  showProgress = true,
  showLabel = true,
  responsive = false,
  className = "",
  href,
}) => {
  // Resolve config from tier prop or lifetimeEarned
  const config =
    tier && TIER_CONFIGS[tier.toUpperCase() as MemberTierName]
      ? TIER_CONFIGS[tier.toUpperCase() as MemberTierName]
      : resolveTier(lifetimeEarned);

  const displayMultiplier = multiplier || config.multiplier;

  const renderIcon = (size: "sm" | "md" | "lg" = "sm") => {
    const sizeClasses = {
      sm: "w-3.5 h-3.5",
      md: "w-4 h-4",
      lg: "w-6 h-6",
    }[size];

    switch (config.name) {
      case "GOLD":
        return (
          <Crown className={`${sizeClasses} ${config.iconClasses} shrink-0`} />
        );
      case "SILVER":
        return (
          <Award className={`${sizeClasses} ${config.iconClasses} shrink-0`} />
        );
      case "BRONZE":
      default:
        return (
          <Shield className={`${sizeClasses} ${config.iconClasses} shrink-0`} />
        );
    }
  };

  // 1. Compact Pill Variant (for TopAppBar, tables, inline headers)
  if (variant === "pill") {
    const isIconOnly = !showLabel && !showMultiplier;
    const paddingClasses = isIconOnly
      ? "p-1.5"
      : responsive
        ? "px-1.5 py-1 sm:px-2.5 sm:py-0.5"
        : "px-2.5 py-0.5";

    const content = (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border text-xs font-bold transition-all ${paddingClasses} ${config.pillClasses} ${className}`}
        title={`${config.displayName} · ${displayMultiplier}x booking coin multiplier`}
      >
        {renderIcon("sm")}
        {showLabel && (
          <span
            className={`tracking-tight uppercase text-[11px] font-extrabold ${
              responsive ? "hidden sm:inline" : ""
            }`}
          >
            {config.name}
          </span>
        )}
        {showMultiplier && (
          <span
            className={`text-[10px] font-mono opacity-80 pl-0.5 ${
              responsive ? "hidden sm:inline" : ""
            }`}
          >
            {displayMultiplier}x
          </span>
        )}
      </span>
    );

    if (href) {
      return (
        <Link href={href} className="inline-block group focus:outline-hidden">
          {content}
        </Link>
      );
    }
    return content;
  }

  // 2. Badge Variant (for Profile card, Sidebar header)
  if (variant === "badge") {
    const content = (
      <div
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border backdrop-blur-xs transition-all ${config.badgeClasses} ${config.borderGlow} ${className}`}
      >
        <div className="p-1 rounded-lg bg-white/70 shadow-2xs">
          {renderIcon("md")}
        </div>
        <div>
          <div className="flex items-center gap-1.5 leading-none">
            <span className="text-xs font-black uppercase tracking-wider">
              {config.name}
            </span>
            {showMultiplier && (
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-white/80 shadow-2xs font-mono">
                {displayMultiplier}×
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium opacity-75 leading-tight block mt-0.5">
            {config.displayName}
          </span>
        </div>
      </div>
    );

    if (href) {
      return (
        <Link href={href} className="inline-block group focus:outline-hidden">
          {content}
        </Link>
      );
    }
    return content;
  }

  // 3. Showcase Card Variant (for Dashboard, Loyalty Hero, Settings)
  const currentEarned = Math.max(0, lifetimeEarned);
  const nextThreshold = config.nextThreshold;
  const progressPercent = nextThreshold
    ? Math.min(
        100,
        Math.max(
          0,
          Math.round(
            ((currentEarned - config.minLifetime) /
              (nextThreshold - config.minLifetime)) *
              100,
          ),
        ),
      )
    : 100;
  const neededCoins = nextThreshold
    ? Math.max(0, nextThreshold - currentEarned)
    : 0;

  return (
    <div
      className={`rounded-2xl border p-5 sm:p-6 relative overflow-hidden transition-all ${config.badgeClasses} ${config.borderGlow} ${className}`}
    >
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Badge Title & Multiplier */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center border border-white/80">
            {renderIcon("lg")}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-white/80 shadow-2xs font-mono">
                {config.name} TIER
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-extrabold px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow-2xs font-mono">
                <Zap className="w-3 h-3 fill-current" />
                {displayMultiplier}x
              </span>
            </div>
            <h3 className="text-lg font-black tracking-tight text-slate-900 mt-1">
              {config.displayName} Status
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Earn {displayMultiplier}× PeeDee Coins on every confirmed
              workspace booking.
            </p>
          </div>
        </div>

        {/* Right: Quick Action Link */}
        {href && (
          <Link
            href={href}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 text-xs font-bold text-[#23055c] bg-white/90 hover:bg-white px-3.5 py-2 rounded-xl border border-white shadow-2xs hover:shadow-xs transition-all"
          >
            <span>Tier Benefits</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* Progress Bar towards Next Tier */}
      {showProgress && (
        <div className="mt-5 pt-4 border-t border-slate-900/10 space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-700">
            <span>
              Lifetime Earned:{" "}
              <strong className="font-bold text-slate-900 font-mono">
                {currentEarned.toLocaleString()} PD
              </strong>
            </span>
            {config.nextTier ? (
              <span className="text-right">
                Next Tier:{" "}
                <strong className="font-bold text-slate-900 uppercase">
                  {config.nextTier} ({nextThreshold?.toLocaleString()} PD)
                </strong>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                <Sparkles className="w-3.5 h-3.5" /> Top Tier Unlocked
              </span>
            )}
          </div>

          <div className="w-full h-2.5 bg-white/70 rounded-full overflow-hidden border border-white/60 p-0.5">
            <div
              className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-purple-600 to-amber-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {config.nextTier && neededCoins > 0 && (
            <p className="text-[11px] text-slate-500">
              Earn{" "}
              <strong className="font-bold text-slate-800 font-mono">
                {neededCoins.toLocaleString()} more PD
              </strong>{" "}
              from bookings or referrals to advance to {config.nextTier} (
              {TIER_CONFIGS[config.nextTier].multiplier}× earn boost).
            </p>
          )}
        </div>
      )}
    </div>
  );
};
