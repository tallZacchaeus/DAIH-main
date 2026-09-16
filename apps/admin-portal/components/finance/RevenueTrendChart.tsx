"use client";

import React, { useState, useMemo } from "react";
import { PaymentTransaction, PaymentStatus } from "@daih/types";
import { DateRangeOption } from "./FinanceHeader";

interface RevenueTrendChartProps {
  transactions?: PaymentTransaction[];
  dateRange?: DateRangeOption;
  loading?: boolean;
}

export const RevenueTrendChart: React.FC<RevenueTrendChartProps> = ({
  transactions = [],
  dateRange = "Last 30 Days",
  loading = false,
}) => {
  const [viewMode, setViewMode] = useState<"Trend" | "Cumulative">("Trend");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Helper to compute revenue in a date filter predicate
  const computeNetRevenue = (
    filterFn: (tx: PaymentTransaction) => boolean,
  ): number => {
    let gross = 0;

    transactions.forEach((t) => {
      if (!filterFn(t)) return;

      const amt = Number(t.amount || 0);
      const isSuccess =
        t.status === PaymentStatus.SUCCESSFUL ||
        (t.status as any) === "SUCCESS";

      if (isSuccess) gross += amt;
    });

    return gross;
  };

  // Helper to format date as dd/MM (e.g. 24/08)
  const formatDayMonth = (d: Date): string => {
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${day}/${month}`;
  };

  // Generate dynamic intervals matching the selected date range
  const chartPoints = useMemo(() => {
    const now = new Date();
    const points: Array<{
      label: string;
      shortDate: string;
      dateKey: string;
      amount: number;
    }> = [];

    if (dateRange === "Today") {
      // Hourly intervals today
      const hours = [8, 10, 12, 14, 16, 18, 20];
      const todayDateStr = now.toISOString().split("T")[0];

      hours.forEach((hour) => {
        const hourLabel = `${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? "PM" : "AM"}`;
        const shortDate = `${String(hour).padStart(2, "0")}:00`;
        const netTotal = computeNetRevenue((t) => {
          const txDate = new Date(t.createdAt);
          return (
            t.createdAt.startsWith(todayDateStr) &&
            txDate.getHours() >= hour - 2 &&
            txDate.getHours() <= hour
          );
        });

        points.push({
          label: hourLabel,
          shortDate,
          dateKey: `${todayDateStr}_${hour}`,
          amount: netTotal,
        });
      });
    } else if (dateRange === "Last 7 Days") {
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const dateKey = d.toISOString().split("T")[0];
        const label = d.toLocaleDateString("en-NG", {
          weekday: "short",
          day: "numeric",
          month: "short",
        });
        const shortDate = formatDayMonth(d);

        const netTotal = computeNetRevenue((t) =>
          t.createdAt.startsWith(dateKey),
        );
        points.push({ label, shortDate, dateKey, amount: netTotal });
      }
    } else if (dateRange === "Last 30 Days") {
      // 8 sample points across 30 days
      const step = 4;
      for (let i = 7; i >= 0; i--) {
        const endD = new Date(now.getTime() - i * step * 24 * 60 * 60 * 1000);
        const startD = new Date(endD.getTime() - step * 24 * 60 * 60 * 1000);
        const label = endD.toLocaleDateString("en-NG", {
          month: "short",
          day: "numeric",
        });
        const shortDate = formatDayMonth(endD);

        const netTotal = computeNetRevenue((t) => {
          const txDate = new Date(t.createdAt);
          return txDate >= startD && txDate <= endD;
        });

        points.push({ label, shortDate, dateKey: shortDate, amount: netTotal });
      }
    } else {
      // Quarter or Year to Date
      const count = 7;
      const daysSpan = dateRange === "This Quarter" ? 90 : 180;
      for (let i = count - 1; i >= 0; i--) {
        const endD = new Date(
          now.getTime() - ((i * daysSpan) / count) * 24 * 60 * 60 * 1000,
        );
        const startD = new Date(
          endD.getTime() - (daysSpan / count) * 24 * 60 * 60 * 1000,
        );
        const label = endD.toLocaleDateString("en-NG", {
          month: "short",
          day: "numeric",
        });
        const shortDate = formatDayMonth(endD);

        const netTotal = computeNetRevenue((t) => {
          const txDate = new Date(t.createdAt);
          return txDate >= startD && txDate <= endD;
        });

        points.push({ label, shortDate, dateKey: shortDate, amount: netTotal });
      }
    }

    if (viewMode === "Cumulative") {
      let runSum = 0;
      return points.map((p) => {
        runSum += p.amount;
        return { ...p, amount: runSum };
      });
    }

    return points;
  }, [transactions, dateRange, viewMode]);

  const maxAmount = useMemo(() => {
    const highest = Math.max(...chartPoints.map((p) => p.amount), 0);
    return highest > 0 ? highest * 1.3 : 100000;
  }, [chartPoints]);

  // Compute safely padded normalized coordinates (x: 4 to 96, y: 10 to 90)
  const normalizedPoints = useMemo(() => {
    return chartPoints.map((p, index) => {
      const x =
        chartPoints.length > 1
          ? 4 + (index / (chartPoints.length - 1)) * 92
          : 50;
      const yRatio =
        maxAmount > 0 ? Math.min(1, Math.max(0, p.amount / maxAmount)) : 0;
      const y = 90 - yRatio * 80;
      return {
        ...p,
        x,
        y,
        formattedAmount: `₦${p.amount.toLocaleString("en-NG", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
      };
    });
  }, [chartPoints, maxAmount]);

  // Construct clean, solid line path (straight line segments)
  const solidLinePath = useMemo(() => {
    if (normalizedPoints.length === 0) return "";
    return normalizedPoints.reduce((acc, pt, i) => {
      if (i === 0) return `M ${pt.x.toFixed(2)},${pt.y.toFixed(2)}`;
      return `${acc} L ${pt.x.toFixed(2)},${pt.y.toFixed(2)}`;
    }, "");
  }, [normalizedPoints]);

  const formatYAxis = (amt: number) => {
    if (amt >= 1000000) return `₦${(amt / 1000000).toFixed(1)}M`;
    if (amt >= 1000) return `₦${Math.round(amt / 1000)}k`;
    return `₦${Math.round(amt)}`;
  };

  const hoveredPoint =
    hoverIndex !== null ? normalizedPoints[hoverIndex] : null;

  if (loading) {
    return (
      <div className="bg-white/80 backdrop-blur-md border border-[#EBE7F5] rounded-xl p-6 flex flex-col h-[420px] shadow-xs animate-pulse">
        <div className="flex justify-between items-center mb-6">
          <div className="h-5 w-32 bg-slate-200 rounded" />
          <div className="h-7 w-28 bg-slate-200 rounded" />
        </div>
        <div className="flex-1 bg-slate-100 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="bg-white/80 backdrop-blur-md border border-[#EBE7F5] rounded-xl p-6 flex flex-col h-[420px] shadow-xs">
      {/* Header with Title and View Mode Toggle */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Total Net Revenue Trend
          </h3>
          <p className="text-xs text-slate-400">
            {dateRange} · Revenue trajectory
          </p>
        </div>
        <div className="flex gap-1.5 bg-[#F8F9FA] p-1 rounded-lg border border-[#EBE7F5]">
          <button
            onClick={() => setViewMode("Trend")}
            className={`px-3 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
              viewMode === "Trend"
                ? "bg-[#392271] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Interval Trend
          </button>
          <button
            onClick={() => setViewMode("Cumulative")}
            className={`px-3 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
              viewMode === "Cumulative"
                ? "bg-[#392271] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Cumulative
          </button>
        </div>
      </div>

      {/* Main Chart Body: Left Y-Axis Units Column + Center Chart Box + Bottom X-Axis Dates */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 flex items-stretch min-h-0">
          {/* Left Y-Axis Units Column (Visible, Non-Clipped) */}
          <div className="w-16 flex flex-col justify-between items-end pr-2 text-[11px] font-mono font-semibold text-slate-500 select-none pb-1">
            <span>{formatYAxis(maxAmount)}</span>
            <span>{formatYAxis(maxAmount * 0.75)}</span>
            <span>{formatYAxis(maxAmount * 0.5)}</span>
            <span>{formatYAxis(maxAmount * 0.25)}</span>
            <span>₦0</span>
          </div>

          {/* Chart SVG Box with Borders */}
          <div
            className="flex-1 relative h-full border-b border-l border-[#EBE7F5] overflow-hidden"
            onMouseLeave={() => setHoverIndex(null)}
          >
            {/* Grid Horizontal Lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              <div className="w-full border-t border-slate-100 h-0" />
              <div className="w-full border-t border-slate-100 h-0" />
              <div className="w-full border-t border-slate-100 h-0" />
              <div className="w-full border-t border-slate-100 h-0" />
            </div>

            {/* SVG Solid Graph Line */}
            <svg
              className="absolute inset-0 w-full h-full"
              preserveAspectRatio="none"
              viewBox="0 0 100 100"
            >
              {/* Solid Graph Line */}
              {solidLinePath && (
                <path
                  d={solidLinePath}
                  fill="none"
                  stroke="#392271"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              )}

              {/* Interactive vertical hover indicator line */}
              {hoveredPoint && (
                <>
                  <line
                    x1={hoveredPoint.x}
                    y1={0}
                    x2={hoveredPoint.x}
                    y2={100}
                    stroke="#392271"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                    opacity="0.6"
                    vectorEffect="non-scaling-stroke"
                  />
                  <circle
                    cx={hoveredPoint.x}
                    cy={hoveredPoint.y}
                    r="4"
                    fill="#392271"
                    stroke="#ffffff"
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                  />
                </>
              )}
            </svg>

            {/* Invisible vertical hover hit areas for smooth user interaction */}
            <div className="absolute inset-0 flex h-full">
              {normalizedPoints.map((pt, idx) => (
                <div
                  key={idx}
                  className="flex-1 h-full cursor-crosshair"
                  onMouseEnter={() => setHoverIndex(idx)}
                />
              ))}
            </div>

            {/* Floating Tooltip */}
            {hoveredPoint && (
              <div
                className="absolute bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs shadow-xl pointer-events-none z-30 transform -translate-x-1/2 -translate-y-full whitespace-nowrap"
                style={{
                  left: `${hoveredPoint.x}%`,
                  top: `${(hoveredPoint.y / 100) * 180 + 10}px`,
                }}
              >
                <p className="font-semibold text-slate-300 text-[10px]">
                  {hoveredPoint.label} ({hoveredPoint.shortDate})
                </p>
                <p className="font-extrabold text-emerald-400 text-xs">
                  {hoveredPoint.formattedAmount} (Net)
                </p>
              </div>
            )}
          </div>
        </div>

        {/* X-Axis Date Labels Row (Aligned under the chart box) */}
        <div className="flex pl-16 pt-2 select-none">
          <div className="flex-1 flex justify-between text-[11px] font-mono font-medium text-slate-500 px-1">
            {normalizedPoints.map((p, idx) => (
              <span key={idx}>{p.shortDate}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
