"use client";

import React from "react";
import { ShieldAlert, Radio, Mail, TrendingUp } from "lucide-react";

interface UserMetricsGridProps {
  totalAdmins: number;
  activeNow: number;
  pendingInvites: number;
  onFilterPending?: () => void;
}

export const UserMetricsGrid: React.FC<UserMetricsGridProps> = ({
  totalAdmins,
  activeNow,
  pendingInvites,
  onFilterPending,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Card 1: Total Admins */}
      <div className="bg-white rounded-2xl p-6 border border-[#EBE7F5] shadow-[0px_4px_12px_rgba(33,37,41,0.05)] hover:shadow-[0px_12px_32px_rgba(57,34,113,0.12)] hover:-translate-y-0.5 transition-all flex flex-col justify-between">
        <div className="flex justify-between items-start mb-4">
          <div className="p-2.5 bg-purple-100/80 text-[#23055c] rounded-xl flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-emerald-700 font-bold">+2 this month</span>
          </span>
        </div>
        <div>
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Total Admins
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            {totalAdmins}
          </h2>
        </div>
      </div>

      {/* Card 2: Active Now */}
      <div className="bg-white rounded-2xl p-6 border border-[#EBE7F5] shadow-[0px_4px_12px_rgba(33,37,41,0.05)] hover:shadow-[0px_12px_32px_rgba(57,34,113,0.12)] hover:-translate-y-0.5 transition-all flex flex-col justify-between">
        <div className="flex justify-between items-start mb-4">
          <div className="p-2.5 bg-purple-100/80 text-[#23055c] rounded-xl flex items-center justify-center">
            <Radio className="w-5 h-5" />
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-700 uppercase">
              Live
            </span>
          </div>
        </div>
        <div>
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Active
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            {activeNow}
          </h2>
        </div>
      </div>

      {/* Card 3: Pending Invites */}
      <div className="bg-white rounded-2xl p-6 border border-[#EBE7F5] shadow-[0px_4px_12px_rgba(33,37,41,0.05)] hover:shadow-[0px_12px_32px_rgba(57,34,113,0.12)] hover:-translate-y-0.5 transition-all flex flex-col justify-between">
        <div className="flex justify-between items-start mb-4">
          <div className="p-2.5 bg-purple-100/80 text-[#23055c] rounded-xl flex items-center justify-center">
            <Mail className="w-5 h-5" />
          </div>
          {onFilterPending && (
            <button
              onClick={onFilterPending}
              className="text-xs font-bold text-[#23055c] hover:underline cursor-pointer"
            >
              View All
            </button>
          )}
        </div>
        <div>
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Pending Invites
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            {pendingInvites}
          </h2>
        </div>
      </div>
    </div>
  );
};
