"use client";

import React from "react";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@daih/ui";

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  icon: LucideIcon;
  iconBgColor?: string;
  iconColor?: string;
  accentBorderColor?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  icon: Icon,
  iconBgColor = "bg-purple-50",
  iconColor = "text-[#23055c]",
  accentBorderColor = "border-purple-100",
}) => {
  return (
    <div
      className={cn(
        "bg-white rounded-2xl p-6 border shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between relative overflow-hidden group",
        accentBorderColor,
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            {title}
          </p>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {value}
          </h3>
        </div>

        <div
          className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 shadow-sm",
            iconBgColor,
            iconColor,
          )}
        >
          <Icon className="w-6 h-6" />
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        {subtitle && (
          <span className="text-slate-500 font-medium">{subtitle}</span>
        )}

        {trend && (
          <span
            className={cn(
              "inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-[11px]",
              trend.isPositive
                ? "bg-emerald-50 text-emerald-700"
                : "bg-rose-50 text-rose-700",
            )}
          >
            {trend.isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {trend.value}
          </span>
        )}
      </div>
    </div>
  );
};
