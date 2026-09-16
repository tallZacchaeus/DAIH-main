"use client";

import React, { useState, useEffect, useCallback } from "react";
import { api } from "@daih/api-client";
import { VisitLogItemDTO, VisitActivityResponse } from "@daih/types";

type VisitStatusFilter = "ALL" | "ON_SITE" | "CHECKED_OUT";
type DatePreset = "today" | "yesterday" | "last7days" | "thisMonth" | "all";

export default function VisitsLogPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<VisitActivityResponse>({
    items: [],
    total: 0,
    currentlyOnSiteCount: 0,
    todayTotalCount: 0,
  });

  // Filters
  const [statusFilter, setStatusFilter] = useState<VisitStatusFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [datePreset, setDatePreset] = useState<DatePreset>("today");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Compute start/end dates from preset
  const getDateRange = useCallback((): {
    startDate?: string;
    endDate?: string;
  } => {
    const now = new Date();
    if (datePreset === "today") {
      const start = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0,
        0,
        0,
      );
      const end = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
        999,
      );
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }
    if (datePreset === "yesterday") {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const start = new Date(
        yesterday.getFullYear(),
        yesterday.getMonth(),
        yesterday.getDate(),
        0,
        0,
        0,
      );
      const end = new Date(
        yesterday.getFullYear(),
        yesterday.getMonth(),
        yesterday.getDate(),
        23,
        59,
        59,
        999,
      );
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }
    if (datePreset === "last7days") {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      return { startDate: start.toISOString(), endDate: now.toISOString() };
    }
    if (datePreset === "thisMonth") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      return { startDate: start.toISOString(), endDate: now.toISOString() };
    }
    if (datePreset === "all") {
      if (customStartDate || customEndDate) {
        return {
          startDate: customStartDate
            ? new Date(customStartDate).toISOString()
            : undefined,
          endDate: customEndDate
            ? new Date(customEndDate + "T23:59:59.999Z").toISOString()
            : undefined,
        };
      }
      return {};
    }
    return {};
  }, [datePreset, customStartDate, customEndDate]);

  // Fetch visit logs
  const fetchVisits = useCallback(async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange();
      const res = await api.access.getVisitsActivity({
        status: statusFilter,
        search: debouncedSearch || undefined,
        startDate,
        endDate,
        limit: 150,
      });

      const payload = (res as any)?.data || res;
      setData(payload);
    } catch (err) {
      console.error("Failed to load visits activity:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, debouncedSearch, getDateRange]);

  useEffect(() => {
    fetchVisits();
  }, [fetchVisits]);

  // CSV Export Handler
  const handleExportCSV = () => {
    if (data.items.length === 0) return;
    setIsExporting(true);

    try {
      const headers = [
        "Booking Reference",
        "Client ID",
        "Customer Name",
        "Customer Email",
        "Phone",
        "Resource Name",
        "Resource Category",
        "Check-In Time",
        "Check-Out Time",
        "Duration (Minutes)",
        "Status",
        "Terminal ID",
        "Notes",
      ];

      const rows = data.items.map((item) => [
        `"${item.bookingReference || ""}"`,
        `"${item.clientId || ""}"`,
        `"${item.customerName || ""}"`,
        `"${item.customerEmail || ""}"`,
        `"${item.customerPhone || ""}"`,
        `"${item.resourceName || ""}"`,
        `"${item.resourceCategory || ""}"`,
        `"${item.checkInTime ? new Date(item.checkInTime).toLocaleString() : ""}"`,
        `"${item.checkOutTime ? new Date(item.checkOutTime).toLocaleString() : "Still On-Site"}"`,
        item.durationMinutes !== undefined && item.durationMinutes !== null
          ? item.durationMinutes
          : "",
        item.isOnSite ? "ON_SITE" : "CHECKED_OUT",
        `"${item.terminalId || ""}"`,
        `"${(item.notes || "").replace(/"/g, '""')}"`,
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((r) => r.join(",")),
      ].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const filename = `DAIH_Visits_Log_${new Date().toISOString().split("T")[0]}.csv`;
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const formatDuration = (mins?: number | null) => {
    if (mins === undefined || mins === null) return "—";
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    const remainder = mins % 60;
    return remainder > 0 ? `${hours}h ${remainder}m` : `${hours}h`;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Check-In & Check-Out Logs
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Real-time physical facility presence, roll-call audit, and shift
            logs.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchVisits}
            disabled={loading}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={isExporting || data.items.length === 0}
            className="px-4 py-2 rounded-xl bg-[#23055c] hover:bg-[#34117c] text-white text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            {isExporting ? "Exporting..." : "Export CSV"}
          </button>
        </div>
      </div>

      {/* Metrics Row (Clean No-Icon Typography) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Currently On-Site */}
        <div className="bg-white rounded-2xl border border-emerald-100 p-4 sm:p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
              Currently On-Site
            </span>
            <p className="text-3xl font-black text-slate-900">
              {data.currentlyOnSiteCount}
            </p>
            <p className="text-[11px] text-slate-400">
              Members physically in the hub right now
            </p>
          </div>
        </div>

        {/* Total Today */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Visits Today
            </span>
            <p className="text-3xl font-black text-slate-900">
              {data.todayTotalCount}
            </p>
            <p className="text-[11px] text-slate-400">
              Check-in scans recorded since midnight
            </p>
          </div>
        </div>

        {/* Filtered Total */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Matching Logs
            </span>
            <p className="text-3xl font-black text-slate-900">{data.total}</p>
            <p className="text-[11px] text-slate-400">
              Sessions matching active filters
            </p>
          </div>
        </div>
      </div>

      {/* Filter & Control Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-4">
        {/* Top Row: Search & Status Tabs */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by customer, email, Client ID, booking ref..."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#23055c] focus:bg-white transition-all"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
            {(
              [
                { id: "ALL", label: "All Visits" },
                { id: "ON_SITE", label: "Currently On-Site" },
                { id: "CHECKED_OUT", label: "Checked Out" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === tab.id
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date Filter Row */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <div className="text-xs font-bold text-slate-500 mr-2">
            Date Window:
          </div>

          {(
            [
              { id: "today", label: "Today" },
              { id: "yesterday", label: "Yesterday" },
              { id: "last7days", label: "Last 7 Days" },
              { id: "thisMonth", label: "This Month" },
              { id: "all", label: "Custom / All" },
            ] as const
          ).map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => {
                setDatePreset(preset.id);
                if (preset.id !== "all") {
                  setCustomStartDate("");
                  setCustomEndDate("");
                }
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                datePreset === preset.id
                  ? "bg-purple-50 text-[#23055c] border-purple-200"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {preset.label}
            </button>
          ))}

          {/* Custom Date Pickers */}
          {datePreset === "all" && (
            <div className="flex items-center gap-2 ml-auto flex-wrap">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-[#23055c]"
                placeholder="Start Date"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-[#23055c]"
                placeholder="End Date"
              />
            </div>
          )}
        </div>
      </div>

      {/* Visits Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 sm:px-6">Member</th>
                <th className="py-3 px-4">Resource & Ref</th>
                <th className="py-3 px-4">Check-In</th>
                <th className="py-3 px-4">Check-Out</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 sm:px-6">Gate / Staff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <p className="text-xs font-semibold">
                      Loading access activity...
                    </p>
                  </td>
                </tr>
              ) : data.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <p className="text-sm font-bold text-slate-700">
                      No visit sessions found
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Try adjusting your search query or selecting a different
                      date window.
                    </p>
                  </td>
                </tr>
              ) : (
                data.items.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    {/* Member */}
                    <td className="py-3.5 px-4 sm:px-6">
                      <div>
                        <p className="font-bold text-slate-900 truncate">
                          {item.customerName}
                        </p>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                          {item.clientId && (
                            <span className="font-mono bg-slate-100 px-1 py-0.2 rounded text-slate-600">
                              {item.clientId}
                            </span>
                          )}
                          <span className="truncate">{item.customerEmail}</span>
                        </div>
                      </div>
                    </td>

                    {/* Resource & Ref */}
                    <td className="py-3.5 px-4">
                      <div>
                        <p className="font-semibold text-slate-800">
                          {item.resourceName}
                        </p>
                        <p className="font-mono text-[11px] text-slate-400">
                          {item.bookingReference}
                        </p>
                      </div>
                    </td>

                    {/* Check-In */}
                    <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                      <div className="font-medium">
                        {new Date(item.checkInTime).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                      <p className="text-[10px] text-slate-400">
                        {new Date(item.checkInTime).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </td>

                    {/* Check-Out */}
                    <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                      {item.checkOutTime ? (
                        <div>
                          <div className="font-medium">
                            {new Date(item.checkOutTime).toLocaleTimeString(
                              [],
                              { hour: "2-digit", minute: "2-digit" },
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400">
                            {new Date(item.checkOutTime).toLocaleDateString(
                              [],
                              { month: "short", day: "numeric" },
                            )}
                          </p>
                        </div>
                      ) : (
                        <span className="text-[11px] font-semibold text-emerald-600">
                          Still Active
                        </span>
                      )}
                    </td>

                    {/* Duration */}
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                      {formatDuration(item.durationMinutes)}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {item.isOnSite ? (
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          ON-SITE
                        </span>
                      ) : (
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
                          CHECKED OUT
                        </span>
                      )}
                    </td>

                    {/* Gate / Staff */}
                    <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap text-slate-600 text-[11px]">
                      <p className="font-mono font-medium text-slate-800">
                        {item.terminalId || "REC-GATE-01"}
                      </p>
                      {item.notes && (
                        <p
                          className="text-[10px] text-slate-400 truncate max-w-[120px]"
                          title={item.notes}
                        >
                          {item.notes}
                        </p>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <p>
            Showing{" "}
            <strong className="text-slate-800">{data.items.length}</strong> of{" "}
            <strong className="text-slate-800">{data.total}</strong> total
            visits
          </p>
          <p className="text-[11px] text-slate-400">
            Records update as reception and QR turnstiles verify entry passes.
          </p>
        </div>
      </div>
    </div>
  );
}
