"use client";

import React from "react";
import Link from "next/link";
import {
  UserPlus,
  QrCode,
  CreditCard,
  Building,
  FileSpreadsheet,
  Users,
} from "lucide-react";

interface QuickActionsProps {
  onOpenWalkInModal?: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onOpenWalkInModal,
}) => {
  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm mb-8">
      <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
        <span>⚡</span> Operations Quick Commands
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <button
          onClick={onOpenWalkInModal}
          className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-50 text-left transition-all hover:shadow-sm group cursor-pointer flex flex-col justify-between"
        >
          <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center mb-2 shadow-sm">
            <UserPlus className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900">Issue Walk-In</p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Day pass receipt
            </p>
          </div>
        </button>

        <Link
          href="/operations"
          className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-50 text-left transition-all hover:shadow-sm group cursor-pointer flex flex-col justify-between"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center mb-2 shadow-sm">
            <QrCode className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900">Scan QR Key</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Verify badge</p>
          </div>
        </Link>

        <Link
          href="/finance"
          className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 text-left transition-all hover:shadow-sm group cursor-pointer flex flex-col justify-between"
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center mb-2 shadow-sm">
            <CreditCard className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900">Paystack Lookup</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Verify payment</p>
          </div>
        </Link>

        <Link
          href="/customers"
          className="p-3.5 rounded-xl border border-purple-200 bg-purple-50/50 hover:bg-purple-50 text-left transition-all hover:shadow-sm group cursor-pointer flex flex-col justify-between"
        >
          <div className="w-8 h-8 rounded-lg bg-[#23055c] text-white flex items-center justify-center mb-2 shadow-sm">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900">
              Members Directory
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">Profiles & IDs</p>
          </div>
        </Link>

        <Link
          href="/operations"
          className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 text-left transition-all hover:shadow-sm group cursor-pointer flex flex-col justify-between"
        >
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center mb-2 shadow-sm">
            <Building className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900">Desk Inventory</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Seat allotment</p>
          </div>
        </Link>

        <Link
          href="/reports"
          className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-50 text-left transition-all hover:shadow-sm group cursor-pointer flex flex-col justify-between"
        >
          <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center mb-2 shadow-sm">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900">Audit Reports</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Export metrics</p>
          </div>
        </Link>
      </div>
    </div>
  );
};
