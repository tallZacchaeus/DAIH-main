"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@daih/api-client";
import { resolveAvatarUrl } from "../../lib/image-utils";
import { NotificationDropdown, useNotifications } from "../notifications";
import { Bell, HelpCircle, Menu } from "lucide-react";

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
  const notificationMenuRef = useRef<HTMLDivElement | null>(null);

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
    <header className="sticky top-0 w-full z-30 flex justify-between items-center px-4 sm:px-8 py-3.5 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-xs">
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

      <div className="flex items-center gap-3 sm:gap-6">
        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
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
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-[#23055c] hover:bg-slate-100 transition"
          >
            <HelpCircle className="w-4 h-4" />
          </Link>

          {/* User Profile Avatar */}
          <Link
            href="/settings"
            className="flex items-center gap-2 ml-1"
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
    </header>
  );
};
