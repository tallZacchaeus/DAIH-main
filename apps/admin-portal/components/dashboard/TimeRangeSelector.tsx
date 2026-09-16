"use client";

import React, { useState } from "react";
import { CalendarDays } from "lucide-react";
import { cn } from "@daih/ui";

export type TimeRangePreset =
  | "today"
  | "this_week"
  | "this_month"
  | "7d"
  | "30d"
  | "90d"
  | "ytd"
  | "all_time"
  | "custom";

export interface TimeRangeValue {
  preset: TimeRangePreset;
  startDate: Date;
  endDate: Date;
  label: string;
  daysCount: number;
}

export interface TimeRangeSelectorProps {
  value: TimeRangeValue;
  onChange: (newValue: TimeRangeValue) => void;
  className?: string;
}

export function computeTimeRange(
  preset: TimeRangePreset | string,
  customStart?: Date,
  customEnd?: Date,
): TimeRangeValue {
  const now = new Date();
  let start = new Date(now);
  let end = new Date(now);
  let label = "";

  // Reset hours to start/end of day
  end.setHours(23, 59, 59, 999);

  switch (preset) {
    case "today": {
      start.setHours(0, 0, 0, 0);
      label = `Today (${start.toLocaleDateString("en-NG", { month: "short", day: "numeric" })})`;
      break;
    }
    case "this_week": {
      // Monday as start of week
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      start = new Date(now.setDate(diff));
      start.setHours(0, 0, 0, 0);
      label = `This Week (${start.toLocaleDateString("en-NG", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-NG", { month: "short", day: "numeric" })})`;
      break;
    }
    case "this_month": {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      start.setHours(0, 0, 0, 0);
      label = `This Month (${start.toLocaleDateString("en-NG", { month: "long", year: "numeric" })})`;
      break;
    }
    case "7d": {
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      label = `Last 7 Days (${start.toLocaleDateString("en-NG", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-NG", { month: "short", day: "numeric" })})`;
      break;
    }
    case "30d": {
      start.setDate(now.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      label = `Last 30 Days (${start.toLocaleDateString("en-NG", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-NG", { month: "short", day: "numeric" })})`;
      break;
    }
    case "90d": {
      start.setDate(now.getDate() - 89);
      start.setHours(0, 0, 0, 0);
      label = `Last 90 Days (${start.toLocaleDateString("en-NG", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-NG", { month: "short", day: "numeric" })})`;
      break;
    }
    case "ytd": {
      start = new Date(now.getFullYear(), 0, 1);
      start.setHours(0, 0, 0, 0);
      label = `Year to Date (${start.getFullYear()})`;
      break;
    }
    case "all_time": {
      start = new Date("2024-01-01");
      start.setHours(0, 0, 0, 0);
      label = "All Time (Complete History)";
      break;
    }
    case "custom": {
      start = customStart
        ? new Date(customStart)
        : new Date(now.setDate(now.getDate() - 7));
      start.setHours(0, 0, 0, 0);
      end = customEnd ? new Date(customEnd) : new Date();
      end.setHours(23, 59, 59, 999);
      label = `Custom (${start.toLocaleDateString("en-NG", { month: "short", day: "numeric", year: "numeric" })} – ${end.toLocaleDateString("en-NG", { month: "short", day: "numeric", year: "numeric" })})`;
      break;
    }
    default: {
      start.setDate(now.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      label = `Last 30 Days (${start.toLocaleDateString("en-NG", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-NG", { month: "short", day: "numeric" })})`;
      break;
    }
  }

  const diffTime = Math.abs(end.getTime() - start.getTime());
  const daysCount = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  return {
    preset: (preset || "30d") as TimeRangePreset,
    startDate: start,
    endDate: end,
    label,
    daysCount,
  };
}

export const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({
  value,
  onChange,
  className,
}) => {
  const [showCustomInputs, setShowCustomInputs] = useState(
    value.preset === "custom",
  );
  const [customStartDate, setCustomStartDate] = useState<string>(
    value.startDate.toISOString().split("T")[0],
  );
  const [customEndDate, setCustomEndDate] = useState<string>(
    value.endDate.toISOString().split("T")[0],
  );

  const presets: { id: TimeRangePreset; label: string }[] = [
    { id: "today", label: "Today" },
    { id: "this_week", label: "This Week" },
    { id: "this_month", label: "This Month" },
    { id: "7d", label: "7d" },
    { id: "30d", label: "30d" },
    { id: "90d", label: "90d" },
    { id: "ytd", label: "Year to Date" },
    { id: "all_time", label: "All Time" },
    { id: "custom", label: "Custom Range" },
  ];

  const handlePresetSelect = (presetId: TimeRangePreset) => {
    if (presetId === "custom") {
      setShowCustomInputs(true);
      const computed = computeTimeRange(
        "custom",
        new Date(customStartDate),
        new Date(customEndDate),
      );
      onChange(computed);
    } else {
      setShowCustomInputs(false);
      const computed = computeTimeRange(presetId);
      onChange(computed);
    }
  };

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customStartDate || !customEndDate) return;
    const start = new Date(customStartDate);
    const end = new Date(customEndDate);
    if (start > end) {
      alert("Start date cannot be after end date.");
      return;
    }
    const computed = computeTimeRange("custom", start, end);
    onChange(computed);
  };

  return (
    <div
      className={cn(
        "bg-white rounded-2xl p-4 sm:p-5 border border-accent-soft shadow-xs space-y-4",
        className,
      )}
    >
      {/* Top Bar: Active Window Summary & Preset Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[#EBE7F5] rounded-xl text-[#23055c]">
            <CalendarDays className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Analytics Timeframe
            </p>
            <p className="text-xs sm:text-sm font-bold text-[#181c20]">
              {value.label}
              <span className="ml-2 font-normal text-slate-500 font-mono text-[11px]">
                ({value.daysCount} {value.daysCount === 1 ? "day" : "days"})
              </span>
            </p>
          </div>
        </div>

        {/* Preset Selector Buttons: Retains all presets, with 7d, 30d, 90d short labels */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#F8F9FA] p-1 rounded-xl border border-slate-200">
          {presets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handlePresetSelect(preset.id)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                value.preset === preset.id
                  ? "bg-[#23055c] text-white shadow-xs font-bold"
                  : "text-slate-600 hover:text-[#23055c] hover:bg-slate-200/60",
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Pickers Drawer (when 'custom' preset is active) */}
      {showCustomInputs && (
        <form
          onSubmit={handleApplyCustom}
          className="p-4 bg-[#F8F9FA] rounded-xl border border-slate-200 flex flex-wrap items-end gap-3 text-xs animate-in fade-in duration-200"
        >
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 block">
              Start Date
            </label>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              required
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#23055c]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 block">
              End Date
            </label>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              required
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#23055c]"
            />
          </div>

          <button
            type="submit"
            className="px-4 py-1.5 bg-[#23055c] hover:bg-[#392271] text-white font-bold text-xs rounded-lg transition shadow-xs cursor-pointer"
          >
            Apply Range
          </button>

          <button
            type="button"
            onClick={() => handlePresetSelect("30d")}
            className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-lg transition cursor-pointer"
          >
            Reset
          </button>
        </form>
      )}
    </div>
  );
};
