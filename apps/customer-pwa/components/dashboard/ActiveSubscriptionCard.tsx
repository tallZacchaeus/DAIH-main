"use client";

import React from "react";
import Link from "next/link";
import { QrCode, ArrowRight, ShieldAlert } from "lucide-react";

interface ActiveSubscriptionCardProps {
  planName?: string;
  qrHref?: string;
  billingCycle?: string;
  statusBadge?: string;
  hasActivePass?: boolean;
  loading?: boolean;
}

export const ActiveSubscriptionCard: React.FC<ActiveSubscriptionCardProps> = ({
  planName,
  qrHref = "/qr",
  billingCycle,
  statusBadge = "Active",
  hasActivePass = false,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="bg-white border border-purple-100/90 rounded-2xl shadow-sm p-5 sm:p-6 animate-pulse">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-6 w-48 bg-slate-200 rounded-md" />
            <div className="h-4 w-64 bg-slate-100 rounded-md" />
          </div>
          <div className="h-10 w-36 bg-slate-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!hasActivePass || !planName) {
    return (
      <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-purple-200">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-slate-400" />
            <h4 className="text-base font-bold text-slate-700 tracking-tight">
              No Active Workspace Pass
            </h4>
          </div>
          <p className="text-xs text-slate-500">
            Book a dedicated desk, private office, or meeting room to receive
            your digital QR access pass.
          </p>
        </div>

        <Link
          href="/book"
          className="inline-flex items-center justify-center gap-1.5 bg-[#23055c] hover:bg-[#35089e] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer whitespace-nowrap self-start sm:self-auto"
        >
          <span>Book Workspace</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white border border-purple-100/90 rounded-2xl shadow-sm p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:shadow-md hover:border-purple-200">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2.5">
          <h4 className="text-xl sm:text-2xl font-extrabold text-[#181c20] tracking-tight">
            {planName}
          </h4>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {statusBadge}
          </span>
        </div>
        {billingCycle && (
          <p className="text-xs text-slate-500 font-medium">{billingCycle}</p>
        )}
      </div>

      <Link
        href={qrHref}
        className="inline-flex items-center justify-center gap-2 bg-[#23055c] hover:bg-[#392271] text-white text-xs font-bold px-6 py-3 rounded-xl transition-all shadow-sm hover:shadow-md cursor-pointer whitespace-nowrap"
      >
        <QrCode className="w-4 h-4" />
        View QR Code
      </Link>
    </div>
  );
};
