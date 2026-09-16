"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldAlert, ArrowLeft, LogOut } from "lucide-react";
import { useAuth } from "@daih/api-client";
import { UserRole } from "@daih/types";

export interface AccessDeniedViewProps {
  message?: string;
}

export const AccessDeniedView: React.FC<AccessDeniedViewProps> = ({
  message = "You do not have permission to view or access this resource. If you believe you should have access, please contact your administrator.",
}) => {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/login");
    } catch {
      router.push("/login");
    }
  };

  const getDashboardRoute = (): string => {
    if (!user) return "/login";
    switch (user.role) {
      case UserRole.FINANCE_OFFICER:
        return "/finance";
      case UserRole.MANAGEMENT_VIEWER:
        return "/reports";
      default:
        return "/";
    }
  };

  return (
    <div className="bg-[#ebeef3] min-h-screen w-full flex items-center justify-center p-4 md:p-8 font-sans antialiased text-[#181c20] relative overflow-hidden">
      {/* Ambient background decoration */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none -z-10 opacity-30">
        <div className="w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-[#392271]/20 to-transparent absolute blur-[100px] -top-[150px] -right-[150px]" />
        <div className="w-[500px] h-[500px] rounded-full bg-gradient-to-bl from-[#bfa9fe]/30 to-transparent absolute blur-[80px] -bottom-[100px] -left-[100px]" />
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl border border-[#EBE7F5] shadow-[0px_12px_32px_rgba(57,34,113,0.08)] overflow-hidden">
        {/* Header Section with Logo */}
        <div className="p-8 pb-6 text-center border-b border-slate-100">
          <Link href="/" className="inline-block mb-5">
            <img
              src="/images/logo.png"
              alt="DAIH Workspace Logo"
              className="mx-auto h-11 w-auto object-contain"
            />
          </Link>
          <div className="w-14 h-14 rounded-2xl bg-purple-50 border border-purple-100 text-[#220563] flex items-center justify-center mx-auto mb-3">
            <ShieldAlert className="w-7 h-7 text-[#220563]" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#181c20] tracking-tight">
            Access Denied
          </h1>
        </div>

        {/* Body Section */}
        <div className="p-8 text-center">
          <p className="text-sm text-slate-600 leading-relaxed mb-6">
            {message}
          </p>

          <div className="space-y-3">
            <Link
              href={getDashboardRoute()}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#220563] text-white font-bold text-xs hover:bg-[#35089e] transition-colors shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>

            <button
              onClick={handleLogout}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors"
            >
              <LogOut className="w-4 h-4 text-slate-400" />
              Sign in as Different User
            </button>
          </div>
        </div>

        {/* Footer note */}
        <div className="bg-[#f1f4f9] px-8 py-3.5 border-t border-[#EBE7F5] text-center">
          <p className="text-[11px] text-slate-500 font-medium">
            DAIH Workspace • Internal Admin Access Only
          </p>
        </div>
      </div>
    </div>
  );
};
