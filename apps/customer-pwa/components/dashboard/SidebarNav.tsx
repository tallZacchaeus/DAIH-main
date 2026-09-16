"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@daih/api-client";
import { useToast } from "@daih/ui";
import { resolveAvatarUrl } from "../../lib/image-utils";
import {
  LayoutDashboard,
  Calendar,
  Layers,
  KeyRound,
  Settings,
  HelpCircle,
  LogOut,
  X,
  PlusCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Users,
} from "lucide-react";

interface SidebarNavProps {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  isMobileOpen = false,
  onMobileClose,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const toast = useToast();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    setAvatarError(false);
  }, [user?.avatarUrl]);

  const resolvedAvatar = resolveAvatarUrl(user?.avatarUrl);

  const displayName = user
    ? `${user.firstName} ${user.lastName}`.trim()
    : "Member";
  const displayRole =
    user?.role === "SUPER_ADMIN" ? "Administrator" : "Premium Member";

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      toast.info("You have been signed out.", { title: "Signed Out" });
      router.push("/login");
    } catch {
      router.push("/login");
    } finally {
      setIsLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  const navItems = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      active: pathname === "/dashboard",
    },
    {
      label: "Pricing plans",
      href: "/book",
      icon: Layers,
      active: pathname === "/book" || pathname.startsWith("/book/"),
    },
    {
      label: "My Bookings",
      href: "/bookings",
      icon: Calendar,
      active: pathname.startsWith("/bookings"),
    },
    {
      label: "Entry Key",
      href: "/qr",
      icon: KeyRound,
      active: pathname.startsWith("/qr"),
    },
    {
      label: "Referrals",
      href: "/referrals",
      icon: Users,
      active: pathname.startsWith("/referrals"),
    },
    {
      label: "Settings",
      href: "/settings",
      icon: Settings,
      active: pathname.startsWith("/settings"),
    },
  ];

  const renderContent = (collapsed: boolean) => (
    <div
      className={`flex flex-col h-full justify-between p-4 bg-[#F8F9FA] text-[#181c20] transition-all duration-300 ${collapsed ? "px-2" : "p-4"}`}
    >
      {/* Brand & Profile Header */}
      <div>
        <div
          className={`flex items-center justify-between pt-2 pb-4 mb-4 border-b border-slate-200/60 ${collapsed ? "flex-col gap-3 px-0" : "px-2"}`}
        >
          <Link href="/dashboard" className="flex items-center gap-2">
            <img
              src="/images/logo.png"
              alt="DAIH Hub"
              className={`${collapsed ? "h-7" : "h-8"} w-auto object-contain transition-all`}
            />
          </Link>

          {/* Desktop Toggle Button */}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="hidden md:flex text-slate-400 hover:text-[#23055c] p-1.5 rounded-lg hover:bg-slate-200/60 transition cursor-pointer"
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          )}

          {/* Close button for mobile drawer */}
          {onMobileClose && (
            <button
              onClick={onMobileClose}
              className="md:hidden text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200/60"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* User Badge */}
        <Link
          href="/settings"
          onClick={onMobileClose}
          className={`flex items-center mb-6 group hover:bg-slate-200/40 p-1.5 rounded-xl transition ${collapsed ? "justify-center px-0" : "gap-3"}`}
          title="Account Settings"
        >
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#23055c] to-[#392271] text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0 group-hover:scale-105 transition-transform overflow-hidden">
            {resolvedAvatar && !avatarError ? (
              <img
                key={resolvedAvatar}
                src={resolvedAvatar}
                alt={displayName}
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
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <h2 className="text-xs font-bold text-[#181c20] truncate group-hover:text-[#23055c] transition-colors">
                {displayName}
              </h2>
              <p className="text-[11px] text-slate-500 truncate">
                {displayRole}
              </p>
            </div>
          )}
        </Link>

        {/* Navigation Items */}
        <ul className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.label}>
                <Link
                  href={item.href}
                  onClick={onMobileClose}
                  title={collapsed ? item.label : undefined}
                  className={`flex items-center gap-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                    collapsed ? "justify-center px-2" : "px-3.5"
                  } ${
                    item.active
                      ? "bg-[#EBE7F5] text-[#23055c] shadow-xs"
                      : "text-slate-600 hover:bg-slate-200/50 hover:text-[#23055c]"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${item.active ? "text-[#23055c]" : "text-slate-500"}`}
                  />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Bottom Actions */}
      <div className="pt-4 border-t border-slate-200/70 space-y-3">
        <Link
          href="/book"
          onClick={onMobileClose}
          title={collapsed ? "Book a Space" : undefined}
          className={`w-full flex items-center justify-center gap-2 bg-[#23055c] hover:bg-[#392271] text-white text-xs font-semibold py-2.5 rounded-xl transition-colors shadow-sm ${
            collapsed ? "px-0" : "px-3"
          }`}
        >
          <PlusCircle className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Book a Space</span>}
        </Link>

        <ul className="space-y-1">
          <li>
            <Link
              href="/support"
              onClick={onMobileClose}
              title={collapsed ? "Support" : undefined}
              className={`flex items-center gap-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200/50 hover:text-[#23055c] rounded-xl transition ${
                collapsed ? "justify-center px-2" : "px-3"
              }`}
            >
              <HelpCircle className="w-4 h-4 text-slate-400 shrink-0" />
              {!collapsed && <span>Support</span>}
            </Link>
          </li>
          <li>
            <button
              onClick={() => setShowLogoutModal(true)}
              title={collapsed ? "Logout" : undefined}
              className={`w-full flex items-center gap-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer ${
                collapsed ? "justify-center px-2" : "px-3"
              }`}
            >
              <LogOut className="w-4 h-4 text-rose-500 shrink-0" />
              {!collapsed && <span>Logout</span>}
            </button>
          </li>
        </ul>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <nav
        className={`h-screen hidden md:flex flex-col border-r border-slate-200/80 fixed left-0 top-0 z-40 transition-all duration-300 ${
          isCollapsed ? "w-20" : "w-64"
        }`}
      >
        {renderContent(isCollapsed)}
      </nav>

      {/* Mobile Drawer Backdrop & Menu (Always expanded for usability on mobile) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={onMobileClose}
          />
          <div className="relative w-4/5 max-w-xs h-full bg-[#F8F9FA] shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {renderContent(false)}
          </div>
        </div>
      )}

      {/* Logout Confirmation Dialog */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <LogOut className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-slate-900">
                Log Out of Account?
              </h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to log out? You will need your email and
                password to sign back in.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                disabled={isLoggingOut}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                disabled={isLoggingOut}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isLoggingOut ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Logging out...</span>
                  </>
                ) : (
                  <span>Yes, Log Out</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
