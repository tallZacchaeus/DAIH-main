"use client";

import React from "react";

export interface SubscriptionPlanMetric {
  name: string;
  count: number;
  percentage: number;
  revenueContribution: string;
  colorClass: string;
  barColorClass: string;
}

interface SubscriptionBreakdownProps {
  plans?: SubscriptionPlanMetric[];
  totalCount?: number;
  loading?: boolean;
}

const colorPalette = [
  { colorClass: "text-primary", barColorClass: "bg-primary-container" },
  { colorClass: "text-secondary", barColorClass: "bg-secondary" },
  {
    colorClass: "text-on-tertiary-container",
    barColorClass: "bg-on-tertiary-container",
  },
  { colorClass: "text-[#10b981]", barColorClass: "bg-[#10b981]" },
  { colorClass: "text-[#0ea5e9]", barColorClass: "bg-[#0ea5e9]" },
];

export const SubscriptionBreakdown: React.FC<SubscriptionBreakdownProps> = ({
  plans = [],
  totalCount = 0,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="bg-surface-container-lowest rounded-lg border border-accent-soft p-6 elevation-1 animate-pulse h-full">
        <div className="flex justify-between items-center mb-5 pb-3 border-b border-accent-soft">
          <div className="h-5 w-44 bg-slate-200 rounded" />
        </div>
        <div className="h-3 w-full bg-slate-200 rounded-full mb-6" />
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-3 bg-slate-100 rounded border border-slate-200 h-14"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-container-lowest rounded-lg border border-accent-soft p-6 elevation-1 flex flex-col justify-between h-full">
      <div>
        <div className="flex justify-between items-center mb-5 pb-3 border-b border-accent-soft">
          <div>
            <h3 className="font-headline-sm text-[20px] leading-[28px] font-semibold text-on-surface">
              Subscription Breakdown
            </h3>
            <p className="font-body-md text-xs text-on-surface-variant mt-0.5">
              Active tier allocation &amp; plan revenue share
            </p>
          </div>
          <span className="material-symbols-outlined text-outline">
            pie_chart
          </span>
        </div>

        {plans.length === 0 ? (
          <div className="py-12 text-center text-on-surface-variant text-xs">
            <p className="font-bold text-on-surface mb-1">
              No Active Plans Yet
            </p>
            <p className="text-[11px] text-slate-400">
              Subscription distribution will display once members reserve plans.
            </p>
          </div>
        ) : (
          <>
            {/* Stacked Progress Bar */}
            <div className="w-full h-3 rounded-full bg-surface-variant overflow-hidden flex mb-6">
              {plans.map((plan, idx) => {
                const palette = colorPalette[idx % colorPalette.length];
                const barColor = plan.barColorClass || palette.barColorClass;
                return (
                  <div
                    key={plan.name}
                    style={{ width: `${Math.max(plan.percentage, 2)}%` }}
                    className={`${barColor} h-full transition-all duration-500`}
                    title={`${plan.name}: ${plan.percentage}%`}
                  />
                );
              })}
            </div>

            {/* Individual Plan List */}
            <div className="space-y-3">
              {plans.map((plan, idx) => {
                const palette = colorPalette[idx % colorPalette.length];
                const barColor = plan.barColorClass || palette.barColorClass;
                return (
                  <div
                    key={plan.name}
                    className="p-3 bg-workspace-surface rounded-DEFAULT border border-accent-soft/60 flex items-center justify-between hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${barColor}`}
                      />
                      <div className="min-w-0">
                        <h4 className="font-label-md text-label-md text-on-surface font-semibold truncate">
                          {plan.name}
                        </h4>
                        <p className="text-[11px] text-on-surface-variant font-medium truncate">
                          {plan.count} bookings · {plan.revenueContribution}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-2">
                      <span className="font-headline-sm text-sm font-bold text-on-surface">
                        {plan.percentage}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="mt-5 pt-3 border-t border-accent-soft flex items-center justify-between text-xs text-on-surface-variant">
        <span className="font-medium">Total Active Bookings</span>
        <span className="font-bold font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">
          {totalCount} Total
        </span>
      </div>
    </div>
  );
};
