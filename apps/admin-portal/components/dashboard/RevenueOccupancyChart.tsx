"use client";

import React, { useState, useMemo } from "react";
import { BookingSummary, PaymentTransaction, PaymentStatus } from "@daih/types";

type TimeframeOption = "7d" | "30d" | "ytd";

interface RevenueOccupancyChartProps {
  bookings?: BookingSummary[];
  transactions?: PaymentTransaction[];
  loading?: boolean;
  startDate?: Date;
  endDate?: Date;
  title?: string;
  subtitle?: string;
  hideToggle?: boolean;
}

export const RevenueOccupancyChart: React.FC<RevenueOccupancyChartProps> = ({
  bookings = [],
  transactions = [],
  loading = false,
  startDate,
  endDate,
  title = "Revenue vs Space Occupancy",
  subtitle = "Comparative live trajectory between yield and space utilization across selected period",
  hideToggle = false,
}) => {
  const [internalTimeframe, setInternalTimeframe] =
    useState<TimeframeOption>("30d");
  const [hoveredPoint, setHoveredPoint] = useState<any | null>(null);

  const chartData = useMemo(() => {
    let start: Date;
    let end: Date;

    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      const days =
        internalTimeframe === "7d" ? 7 : internalTimeframe === "30d" ? 30 : 90;
      end = new Date();
      start = new Date();
      start.setDate(end.getDate() - (days - 1));
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const diffDays = Math.max(
      1,
      Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
    );

    const dataPoints: any[] = [];
    let totalRevenue = 0;
    let totalOccupancy = 0;

    // Generate date points for each day in range (capped at 90 points for smoothness)
    const step = diffDays > 60 ? Math.ceil(diffDays / 30) : 1;

    for (let i = 0; i < diffDays; i += step) {
      const currentDay = new Date(start);
      currentDay.setDate(start.getDate() + i);
      const dateKey = currentDay.toISOString().split("T")[0];

      const label = currentDay.toLocaleDateString("en-NG", {
        weekday: diffDays <= 7 ? "short" : undefined,
        month: "short",
        day: "numeric",
      });

      // Sum transactions for this day (or bucket)
      const dayRev = transactions
        .filter((t) => {
          const isSuccess =
            t.status === PaymentStatus.SUCCESSFUL ||
            (t.status as any) === "SUCCESS";
          if (!isSuccess) return false;
          if (step === 1) {
            return t.createdAt.startsWith(dateKey);
          } else {
            const tDate = new Date(t.createdAt);
            const bucketEnd = new Date(currentDay);
            bucketEnd.setDate(currentDay.getDate() + step);
            return tDate >= currentDay && tDate < bucketEnd;
          }
        })
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

      totalRevenue += dayRev;

      // Count checked-in customers for this day
      const dayCheckedIn = bookings.filter((b) => {
        const hasCheckIn =
          Boolean(b.checkedInAt) ||
          b.state === "CHECKED_IN" ||
          b.state === "CHECKED_OUT";

        if (!hasCheckIn) return false;
        const checkInDateStr = b.checkedInAt
          ? b.checkedInAt.split("T")[0]
          : b.startTime.split("T")[0];

        if (step === 1) {
          return checkInDateStr === dateKey;
        } else {
          const bDate = new Date(b.checkedInAt || b.startTime);
          const bucketEnd = new Date(currentDay);
          bucketEnd.setDate(currentDay.getDate() + step);
          return bDate >= currentDay && bDate < bucketEnd;
        }
      });

      const visitors = dayCheckedIn.length;
      // Daily occupancy: checked-in visitors / hub capacity (104 standard capacity)
      const occupancyVal = Math.min(100, Math.round((visitors / 104) * 100));
      totalOccupancy += occupancyVal;

      dataPoints.push({
        label,
        dateKey,
        rawRevenue: dayRev,
        revenue: `₦${dayRev.toLocaleString("en-NG")}`,
        occupancyVal,
        occupancy: `${occupancyVal}%`,
        visitors,
      });
    }

    const maxRev = Math.max(...dataPoints.map((p) => p.rawRevenue), 50000);
    const avgOcc =
      dataPoints.length > 0
        ? Math.round(totalOccupancy / dataPoints.length)
        : 0;

    // Normalize SVG points (width 600, height 250)
    const pointsWithCoords = dataPoints.map((pt, index) => {
      const cx =
        dataPoints.length > 1
          ? (index / (dataPoints.length - 1)) * 560 + 20
          : 300;
      // Y for Revenue: 20 is top, 220 is bottom
      const revRatio = pt.rawRevenue / maxRev;
      const cyRev = Math.round(220 - revRatio * 180);
      // Y for Occupancy: 40 is 100%, 220 is 0%
      const cyOcc = Math.round(220 - (pt.occupancyVal / 100) * 170);

      return {
        ...pt,
        cx,
        cyRev,
        cyOcc,
      };
    });

    // Build clean solid SVG paths
    const generatePath = (yKey: "cyRev" | "cyOcc") => {
      if (pointsWithCoords.length === 0) return "";
      return pointsWithCoords.reduce((acc, pt, i) => {
        const xVal = Number(pt.cx) || 0;
        const yVal = Number(pt[yKey]) || 0;
        if (i === 0) return `M ${xVal.toFixed(1)},${yVal.toFixed(1)}`;
        return `${acc} L ${xVal.toFixed(1)},${yVal.toFixed(1)}`;
      }, "");
    };

    const revPath = generatePath("cyRev");
    const occPath = generatePath("cyOcc");

    const revArea = revPath
      ? `${revPath} L ${pointsWithCoords[pointsWithCoords.length - 1]?.cx || 600},250 L ${pointsWithCoords[0]?.cx || 0},250 Z`
      : "M0,250 L600,250 Z";

    return {
      revenueTotal: `₦${totalRevenue.toLocaleString("en-NG", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      avgOccupancy: `${avgOcc}%`,
      peakHour: "12:00 PM – 3:30 PM",
      revenuePath: revPath,
      revenueArea: revArea,
      occupancyPath: occPath,
      dataPoints: pointsWithCoords,
    };
  }, [bookings, transactions, internalTimeframe, startDate, endDate]);

  if (loading) {
    return (
      <div className="bg-surface-container-lowest rounded-lg border border-accent-soft p-6 elevation-1 animate-pulse h-[420px]">
        <div className="flex justify-between items-center mb-6">
          <div className="h-5 w-48 bg-slate-200 rounded" />
          <div className="h-8 w-32 bg-slate-200 rounded" />
        </div>
        <div className="h-64 bg-slate-100 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="bg-surface-container-lowest rounded-lg border border-accent-soft p-6 elevation-1 flex flex-col justify-between h-full">
      {/* Header with Title and Timeframe Toggle */}
      <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-accent-soft">
          <div>
            <h3 className="font-headline-sm text-[20px] leading-[28px] font-semibold text-on-surface">
              {title}
            </h3>
            <p className="font-body-md text-xs text-on-surface-variant mt-0.5">
              {subtitle}
            </p>
          </div>

          {!hideToggle && (
            <div className="flex items-center gap-1 bg-surface-container-high p-1 rounded-DEFAULT border border-accent-soft self-end sm:self-auto">
              {(["7d", "30d", "ytd"] as TimeframeOption[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setInternalTimeframe(t)}
                  className={`px-3 py-1 text-xs font-semibold rounded-DEFAULT transition-colors cursor-pointer ${
                    internalTimeframe === t
                      ? "bg-surface-container-lowest text-primary shadow-xs font-bold"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {t.toUpperCase()}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dynamic Legend and Key Totals */}
        <div className="flex flex-wrap items-center gap-6 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-xs font-medium text-on-surface-variant">
              Revenue ({chartData.revenueTotal})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-on-tertiary-container" />
            <span className="text-xs font-medium text-on-surface-variant">
              Avg Occupancy ({chartData.avgOccupancy})
            </span>
          </div>
        </div>

        {/* SVG Chart Canvas */}
        <div className="relative w-full h-[220px] mt-2">
          <svg
            className="w-full h-full overflow-visible"
            viewBox="0 0 600 250"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient
                id="adminRevAreaGrad"
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#23055c" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#23055c" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid background lines */}
            <line
              x1="0"
              y1="50"
              x2="600"
              y2="50"
              stroke="#F1F5F9"
              strokeDasharray="4 4"
            />
            <line
              x1="0"
              y1="120"
              x2="600"
              y2="120"
              stroke="#F1F5F9"
              strokeDasharray="4 4"
            />
            <line
              x1="0"
              y1="190"
              x2="600"
              y2="190"
              stroke="#F1F5F9"
              strokeDasharray="4 4"
            />

            {/* Revenue Area Fill */}
            <path d={chartData.revenueArea} fill="url(#adminRevAreaGrad)" />

            {/* Occupancy Line (Dashed) */}
            <path
              d={chartData.occupancyPath}
              fill="none"
              stroke="#d56c04"
              strokeWidth="2"
              strokeDasharray="4 3"
              vectorEffect="non-scaling-stroke"
            />

            {/* Revenue Solid Line */}
            <path
              d={chartData.revenuePath}
              fill="none"
              stroke="#23055c"
              strokeWidth="2.5"
              vectorEffect="non-scaling-stroke"
            />

            {/* Interactive Hover Indicator */}
            {hoveredPoint && (
              <g>
                <line
                  x1={hoveredPoint.cx}
                  y1={0}
                  x2={hoveredPoint.cx}
                  y2={250}
                  stroke="#23055c"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                  opacity="0.4"
                />
                <circle
                  cx={hoveredPoint.cx}
                  cy={hoveredPoint.cyRev}
                  r="4.5"
                  fill="#23055c"
                  stroke="#ffffff"
                  strokeWidth="2"
                />
                <circle
                  cx={hoveredPoint.cx}
                  cy={hoveredPoint.cyOcc}
                  r="4"
                  fill="#d56c04"
                  stroke="#ffffff"
                  strokeWidth="2"
                />
              </g>
            )}
          </svg>

          {/* Hit areas for clean hover interaction */}
          <div className="absolute inset-0 flex">
            {chartData.dataPoints.map((pt, idx) => (
              <div
                key={idx}
                className="flex-1 h-full cursor-crosshair"
                onMouseEnter={() => setHoveredPoint(pt)}
                onMouseLeave={() => setHoveredPoint(null)}
              />
            ))}
          </div>

          {/* Hover Tooltip */}
          {hoveredPoint && (
            <div
              className="absolute bg-slate-900 text-white px-3 py-2 rounded-lg text-xs shadow-xl pointer-events-none z-30 space-y-1 transform -translate-x-1/2 -translate-y-full"
              style={{
                left: `${(hoveredPoint.cx / 600) * 100}%`,
                top: `${Math.min(hoveredPoint.cyRev, hoveredPoint.cyOcc) - 10}px`,
              }}
            >
              <p className="font-bold border-b border-slate-700 pb-0.5">
                {hoveredPoint.label}
              </p>
              <p className="text-emerald-400">
                Revenue: {hoveredPoint.revenue}
              </p>
              <p className="text-amber-400">
                Occupancy: {hoveredPoint.occupancy} ({hoveredPoint.visitors}{" "}
                check-ins)
              </p>
            </div>
          )}
        </div>

        {/* X Axis Labels */}
        <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold mt-3 px-2">
          {chartData.dataPoints
            .filter((_, i) =>
              chartData.dataPoints.length <= 8
                ? true
                : i % Math.ceil(chartData.dataPoints.length / 7) === 0,
            )
            .map((p, i) => (
              <span key={i}>{p.label}</span>
            ))}
        </div>

        {/* X Axis Title */}
        <div className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-3 select-none">
          Timeline / Interval (
          {startDate && endDate
            ? `${chartData.dataPoints.length} Data Points`
            : internalTimeframe.toUpperCase()}
          )
        </div>
      </div>
    </div>
  );
};
