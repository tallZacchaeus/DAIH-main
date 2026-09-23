"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth, api } from "@daih/api-client";
import { resolveAvatarUrl } from "../../lib/image-utils";
import { NotificationDropdown, useNotifications } from "../notifications";
import { MemberTierBadge } from "../loyalty/MemberTierBadge";
import { Bell, HelpCircle, Menu, Coins } from "lucide-react";

interface TopAppBarProps {
  title?: string;
  onMobileMenuToggle?: () => void;
}

export const TopAppBar: React.FC<TopAppBarProps> = ({
  title,
  onMobileMenuToggle,
}) => {
  const { user } = useAuth();
  const { isOpen, toggle, close, unreadCount } = useNotifications();
  const [avatarError, setAvatarError] = useState(false);
  const [coinBalance, setCoinBalance] = useState<number | null>(null);
  const [walletTier, setWalletTier] = useState<string | null>(null);
  const [tierMultiplier, setTierMultiplier] = useState<number | null>(null);
  const [lifetimeEarned, setLifetimeEarned] = useState<number>(0);
  const notificationMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!user) return;
    let isMounted = true;

    const refreshBalance = (force = true) => {
      api.loyalty
        .getMyWallet(force)
        .then((w) => {
          if (isMounted) {
            setCoinBalance(w.availableBalance);
            if (w.tier) setWalletTier(w.tier);
            if (w.tierMultiplier) setTierMultiplier(w.tierMultiplier);
            if (w.lifetimeEarned != null) setLifetimeEarned(w.lifetimeEarned);
          }
        })
        .catch(() => {});
    };

    // Initial load: force refresh to guarantee up-to-date balance
    refreshBalance(true);

    const handleUpdate = () => {
      refreshBalance(true);
    };

    if (typeof window !== "undefined") {
      window.addEventListener("focus", handleUpdate);
      window.addEventListener("daih:loyalty-updated", handleUpdate);
    }

    return () => {
      isMounted = false;
      if (typeof window !== "undefined") {
        window.removeEventListener("focus", handleUpdate);
        window.removeEventListener("daih:loyalty-updated", handleUpdate);
      }
    };
  }, [user]);

  useEffect(() => {
    setAvatarError(false);
  }, [user?.avatarUrl]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (
        notificationMenuRef.current &&
        !notificationMenuRef.current.contains(event.target as Node)
      ) {
        close();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [close, isOpen]);

  const resolvedAvatar = resolveAvatarUrl(user?.avatarUrl);

  return (
    <header className="sticky top-0 w-full z-30 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-xs">
      <div className="max-w-7xl mx-auto w-full flex justify-between items-center px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex items-center gap-3">
          {/* Mobile Hamburger Button */}
          <button
            onClick={onMobileMenuToggle}
            className="md:hidden text-slate-600 hover:text-[#23055c] p-2 rounded-lg hover:bg-slate-100 transition"
            aria-label="Toggle navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* DAIH Logo Branding */}
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <img
              src="/images/logo.png"
              alt="DAIH Hub Logo"
              className="h-8 w-auto object-contain transition-transform group-hover:scale-105"
            />
            {title && title !== "Executive Flux" && (
              <span className="text-base sm:text-lg font-bold tracking-tight text-[#23055c] border-l border-slate-200 pl-3">
                {title}
              </span>
            )}
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-6">
          {/* Action Controls */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            <div ref={notificationMenuRef} className="relative">
              <button
                title="Notifications"
                onClick={toggle}
                aria-haspopup="dialog"
                aria-expanded={isOpen}
                className="relative w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-[#23055c] hover:bg-slate-100 transition cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#23055c] text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-xs leading-none pointer-events-none">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
              <NotificationDropdown />
            </div>

            <Link
              href="/support"
              title="Help & Support"
              className="hidden sm:flex w-8 h-8 rounded-full items-center justify-center text-slate-500 hover:text-[#23055c] hover:bg-slate-100 transition"
            >
              <HelpCircle className="w-4 h-4" />
            </Link>

            {/* Member Tier Badge (Logo only, BRONZE 1x text removed) */}
            <MemberTierBadge
              variant="pill"
              tier={walletTier || undefined}
              lifetimeEarned={lifetimeEarned}
              multiplier={tierMultiplier || undefined}
              showLabel={false}
              showMultiplier={false}
              responsive={false}
              href="/loyalty"
            />

            {/* Live PD Coin Loyalty Pill */}
            <Link
              href="/loyalty"
              title="My PD Coins"
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-full bg-amber-50 hover:bg-amber-100 border border-amber-200/80 text-amber-900 transition-all shadow-2xs group"
            >
              <Coins className="w-3.5 h-3.5 text-amber-500 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold font-mono">
                {coinBalance !== null ? coinBalance.toLocaleString() : "0"}
              </span>
            </Link>

            {/* User Profile Avatar */}
            <Link
              href="/settings"
              className="flex items-center gap-2 ml-0.5 sm:ml-1"
              title="Account Settings"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#23055c] to-[#392271] text-white flex items-center justify-center font-bold text-xs shadow-xs border border-purple-200/80 hover:scale-105 transition-transform overflow-hidden">
                {resolvedAvatar && !avatarError ? (
                  <img
                    key={resolvedAvatar}
                    src={resolvedAvatar}
                    alt={`${user?.firstName} ${user?.lastName}`}
                    className="w-full h-full object-cover"
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <span>
                    {user?.firstName?.[0] || "M"}
                    {user?.lastName?.[0] || ""}
                  </span>
                )}
              </div>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};
