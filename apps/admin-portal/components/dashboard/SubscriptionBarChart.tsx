"use client";

import React, { useState, useMemo } from "react";
import { SubscriptionPlanMetric } from "./SubscriptionBreakdown";
import { BarChart3, TrendingUp, Users } from "lucide-react";

interface SubscriptionBarChartProps {
  plans?: SubscriptionPlanMetric[];
  totalCount?: number;
  loading?: boolean;
}

export const SubscriptionBarChart: React.FC<SubscriptionBarChartProps> = ({
  plans = [],
  totalCount = 0,
  loading = false,
}) => {
  const [metricMode, setMetricMode] = useState<"count" | "revenue">("count");
  const [hoveredBar, setHoveredBar] = useState<any | null>(null);

  const enrichedPlans = useMemo(() => {
    if (!plans || plans.length === 0) {
      return [];
    }

    const maxCount = Math.max(...plans.map((p) => p.count), 1);
    const maxRev = Math.max(
      ...plans.map((p) => {
        const num = Number(p.revenueContribution.replace(/[^0-9.]/g, "")) || 0;
        return num;
      }),
      10000,
    );

    const colors = [
      { fill: "#392271", stroke: "#23055c", light: "#ede9fe" },
      { fill: "#65519f", stroke: "#4f378b", light: "#f3e8ff" },
      { fill: "#d56c04", stroke: "#b45309", light: "#fef3c7" },
      { fill: "#10b981", stroke: "#059669", light: "#d1fae5" },
      { fill: "#0ea5e9", stroke: "#0284c7", light: "#e0f2fe" },
    ];

    return plans.map((p, idx) => {
      const rawRev = Number(p.revenueContribution.replace(/[^0-9.]/g, "")) || 0;
      const countHeightRatio = p.count / maxCount;
      const revHeightRatio = rawRev / maxRev;
      const palette = colors[idx % colors.length];

      return {
        ...p,
        rawRev,
        countHeightPercent: Math.max(8, Math.round(countHeightRatio * 85)),
        revHeightPercent: Math.max(8, Math.round(revHeightRatio * 85)),
        fill: palette.fill,
        stroke: palette.stroke,
        light: palette.light,
      };
    });
  }, [plans]);

  if (loading) {
    return (
      <div className="bg-surface-container-lowest rounded-lg border border-accent-soft p-6 elevation-1 animate-pulse h-[380px] flex flex-col justify-between">
        <div className="flex justify-between items-center mb-6">
          <div className="h-5 w-48 bg-slate-200 rounded" />
          <div className="h-7 w-32 bg-slate-200 rounded" />
        </div>
        <div className="flex-1 bg-slate-100 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="bg-surface-container-lowest rounded-lg border border-accent-soft p-6 elevation-1 flex flex-col justify-between h-full">
      {/* Header */}
      <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 pb-4 border-b border-accent-soft">
          <div>
            <h3 className="font-headline-sm text-[18px] leading-[24px] font-semibold text-on-surface">
              Subscription Plan Distribution
            </h3>
            <p className="font-body-md text-xs text-on-surface-variant mt-0.5">
              Comparative volume &amp; revenue contribution across tiers
            </p>
          </div>

          {/* Metric Toggle */}
          <div className="flex items-center gap-1 bg-surface-container-high p-1 rounded-DEFAULT border border-accent-soft">
            <button
              onClick={() => setMetricMode("count")}
              className={`px-3 py-1 text-xs font-semibold rounded-DEFAULT transition-colors cursor-pointer flex items-center gap-1.5 ${
                metricMode === "count"
                  ? "bg-surface-container-lowest text-primary shadow-xs font-bold"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Subscribers</span>
            </button>
            <button
              onClick={() => setMetricMode("revenue")}
              className={`px-3 py-1 text-xs font-semibold rounded-DEFAULT transition-colors cursor-pointer flex items-center gap-1.5 ${
                metricMode === "revenue"
                  ? "bg-surface-container-lowest text-primary shadow-xs font-bold"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Revenue</span>
            </button>
          </div>
        </div>

        {enrichedPlans.length === 0 ? (
          <div className="py-16 text-center text-on-surface-variant text-xs">
            <BarChart3 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-on-surface mb-1">
              No Active Plans Yet
            </p>
            <p className="text-[11px] text-slate-400">
              Subscription bars will dynamically render once members book
              workspace plans.
            </p>
          </div>
        ) : (
          /* Bar Chart Canvas */
          <div className="relative w-full h-[220px] flex items-end justify-around pt-6 pb-2 px-4 border-b border-accent-soft">
            {/* Background Grid Lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8">
              <div className="w-full border-t border-slate-100" />
              <div className="w-full border-t border-slate-100" />
              <div className="w-full border-t border-slate-100" />
              <div className="w-full border-t border-slate-100" />
            </div>

            {/* Bars */}
            {enrichedPlans.map((plan, idx) => {
              const heightPercent =
                metricMode === "count"
                  ? plan.countHeightPercent
                  : plan.revHeightPercent;

              const isHovered = hoveredBar?.name === plan.name;

              return (
                <div
                  key={plan.name}
                  className="flex flex-col items-center flex-1 max-w-[80px] h-full justify-end group cursor-pointer z-10"
                  onMouseEnter={() => setHoveredBar(plan)}
                  onMouseLeave={() => setHoveredBar(null)}
                >
                  {/* Top Value Label on hover */}
                  <span
                    className={`text-[11px] font-bold mb-1 transition-all duration-200 ${
                      isHovered
                        ? "opacity-100 transform -translate-y-1"
                        : "opacity-75"
                    }`}
                    style={{ color: plan.fill }}
                  >
                    {metricMode === "count"
                      ? plan.count
                      : `₦${Math.round(plan.rawRev / 1000)}k`}
                  </span>

                  {/* Vertical Column Bar */}
                  <div className="w-full max-w-[42px] bg-slate-100 rounded-t-md overflow-hidden flex flex-col justify-end h-full">
                    <div
                      className="w-full rounded-t-md transition-all duration-500 ease-out"
                      style={{
                        height: `${heightPercent}%`,
                        backgroundColor: plan.fill,
                        opacity: isHovered ? 1 : 0.88,
                        transform: isHovered ? "scaleY(1.02)" : "scaleY(1)",
                        transformOrigin: "bottom",
                      }}
                    />
                  </div>

                  {/* X-axis Plan Label */}
                  <p
                    className="text-[10px] font-semibold text-on-surface-variant truncate w-full text-center mt-2"
                    title={plan.name}
                  >
                    {plan.name.split(" ")[0]}
                  </p>
                </div>
              );
            })}

            {/* Hover Tooltip Card */}
            {hoveredBar && (
              <div className="absolute top-2 right-4 bg-slate-900 text-white p-3 rounded-lg text-xs shadow-xl pointer-events-none z-30 space-y-1">
                <p className="font-bold border-b border-slate-700 pb-1 text-slate-200">
                  {hoveredBar.name}
                </p>
                <div className="flex justify-between gap-4 text-[11px]">
                  <span className="text-slate-400">Subscribers:</span>
                  <span className="font-bold text-white">
                    {hoveredBar.count} ({hoveredBar.percentage}%)
                  </span>
                </div>
                <div className="flex justify-between gap-4 text-[11px]">
                  <span className="text-slate-400">Revenue:</span>
                  <span className="font-bold text-emerald-400">
                    {hoveredBar.revenueContribution}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-4 pt-3 flex items-center justify-between text-xs text-on-surface-variant">
        <span className="font-medium">
          {enrichedPlans.length} active subscription categories
        </span>
        <span className="font-bold text-primary font-mono">
          {totalCount} Total Subscriptions
        </span>
      </div>
    </div>
  );
};
