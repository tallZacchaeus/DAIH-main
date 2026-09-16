"use client";

import React from "react";
import {
  Users,
  UserCheck,
  UserPlus,
  TrendingUp,
  DollarSign,
} from "lucide-react";

export interface MemberMetricsProps {
  totalMembers?: number;
  activeNow?: number;
  newThisMonth?: number;
  mrrGrowth?: string;
}

export const MemberMetricsGrid: React.FC<MemberMetricsProps> = ({
  totalMembers = 1248,
  activeNow = 156,
  newThisMonth = 42,
  mrrGrowth = "$24.5k",
}) => {
  const metrics = [
    {
      label: "Total Members",
      value: totalMembers.toLocaleString(),
      change: "+12% this month",
      isPositive: true,
      icon: Users,
    },
    {
      label: "Verified Members",
      value: activeNow.toLocaleString(),
      change: "Active in last 90d",
      isPositive: null,
      icon: UserCheck,
    },
    {
      label: "New this Month",
      value: newThisMonth.toLocaleString(),
      change: "+5% vs last month",
      isPositive: true,
      icon: UserPlus,
    },
    {
      label: "Subscription Growth",
      value: mrrGrowth,
      change: "MRR increase",
      isPositive: true,
      icon: DollarSign,
    },
  ];

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {metrics.map((metric, idx) => {
        const Icon = metric.icon;

        return (
          <div
            key={idx}
            className="bg-white p-6 rounded-2xl border border-[#EBE7F5] flex flex-col justify-between shadow-[0_4px_12px_rgba(33,37,41,0.04)] hover:shadow-[0_8px_18px_rgba(57,34,113,0.06)] transition-all duration-200"
          >
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {metric.label}
              </span>
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#23055c] flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5" />
              </div>
            </div>

            <div className="text-2xl sm:text-3xl font-extrabold text-[#181c20] tracking-tight mb-2">
              {metric.value}
            </div>

            <div className="flex items-center gap-1 text-xs font-semibold">
              {metric.isPositive === true && (
                <>
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="text-emerald-600">{metric.change}</span>
                </>
              )}
              {metric.isPositive === null && (
                <span className="text-slate-500 font-medium">
                  {metric.change}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
};
