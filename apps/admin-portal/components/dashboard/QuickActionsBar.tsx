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

interface QuickActionsBarProps {
  onOpenWalkInModal?: () => void;
}

export const QuickActionsBar: React.FC<QuickActionsBarProps> = ({
  onOpenWalkInModal,
}) => {
  return (
    <div className="bg-surface-container-lowest rounded-2xl p-6 border border-accent-soft elevation-1 mb-8">
      <h2 className="text-sm font-bold text-on-surface mb-4 flex items-center gap-2 uppercase tracking-wider text-outline">
        <span>⚡</span> Operations Quick Commands
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <button
          onClick={onOpenWalkInModal}
          className="p-3.5 rounded-xl border border-accent-soft bg-workspace-surface hover:bg-surface-container text-left transition-all hover:shadow-sm group cursor-pointer flex flex-col justify-between"
        >
          <div className="w-8 h-8 rounded-lg bg-on-tertiary-container text-white flex items-center justify-center mb-2 shadow-sm">
            <UserPlus className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-on-surface">Issue Walk-In</p>
            <p className="text-[10px] text-on-surface-variant mt-0.5">
              Day pass receipt
            </p>
          </div>
        </button>

        <Link
          href="/operations"
          className="p-3.5 rounded-xl border border-accent-soft bg-workspace-surface hover:bg-surface-container text-left transition-all hover:shadow-sm group cursor-pointer flex flex-col justify-between"
        >
          <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center mb-2 shadow-sm">
            <QrCode className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-on-surface">Scan QR Key</p>
            <p className="text-[10px] text-on-surface-variant mt-0.5">
              Verify badge
            </p>
          </div>
        </Link>

        <Link
          href="/finance"
          className="p-3.5 rounded-xl border border-accent-soft bg-workspace-surface hover:bg-surface-container text-left transition-all hover:shadow-sm group cursor-pointer flex flex-col justify-between"
        >
          <div className="w-8 h-8 rounded-lg bg-[#10b981] text-white flex items-center justify-center mb-2 shadow-sm">
            <CreditCard className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-on-surface">Paystack Lookup</p>
            <p className="text-[10px] text-on-surface-variant mt-0.5">
              Verify payment
            </p>
          </div>
        </Link>

        <Link
          href="/customers"
          className="p-3.5 rounded-xl border border-accent-soft bg-workspace-surface hover:bg-surface-container text-left transition-all hover:shadow-sm group cursor-pointer flex flex-col justify-between"
        >
          <div className="w-8 h-8 rounded-lg bg-secondary text-white flex items-center justify-center mb-2 shadow-sm">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-on-surface">
              Members Directory
            </p>
            <p className="text-[10px] text-on-surface-variant mt-0.5">
              Profiles & IDs
            </p>
          </div>
        </Link>

        <Link
          href="/operations"
          className="p-3.5 rounded-xl border border-accent-soft bg-workspace-surface hover:bg-surface-container text-left transition-all hover:shadow-sm group cursor-pointer flex flex-col justify-between"
        >
          <div className="w-8 h-8 rounded-lg bg-primary-container text-white flex items-center justify-center mb-2 shadow-sm">
            <Building className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-on-surface">Desk Inventory</p>
            <p className="text-[10px] text-on-surface-variant mt-0.5">
              Seat allotment
            </p>
          </div>
        </Link>

        <Link
          href="/reports"
          className="p-3.5 rounded-xl border border-accent-soft bg-workspace-surface hover:bg-surface-container text-left transition-all hover:shadow-sm group cursor-pointer flex flex-col justify-between"
        >
          <div className="w-8 h-8 rounded-lg bg-error text-white flex items-center justify-center mb-2 shadow-sm">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-on-surface">Audit Reports</p>
            <p className="text-[10px] text-on-surface-variant mt-0.5">
              Export metrics
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
};
