"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, Button, useToast } from "@daih/ui";
import {
  Download,
  TrendingUp,
  Calendar,
  FileSpreadsheet,
  BarChart3,
  Users,
  Armchair,
  DollarSign,
  Repeat,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";
import {
  RevenueOccupancyChart,
  SubscriptionBarChart,
  SubscriptionBreakdown,
  MostUsedFacilities,
  TimeRangeSelector,
  TimeRangeValue,
  computeTimeRange,
  FacilityUtilization,
  SubscriptionPlanMetric,
} from "../../components/dashboard";
import { api } from "@daih/api-client";
import {
  BookingSummary,
  FacilityResource,
  PaymentTransaction,
  PaymentStatus,
  BookingState,
  CustomerRecord,
  AdminAnalyticsSummaryDTO,
} from "@daih/types";

export default function AnalyticsReportsPage() {
  const [timeRange, setTimeRange] = useState<TimeRangeValue>(() =>
    computeTimeRange("30d"),
  );
  const [summary, setSummary] = useState<AdminAnalyticsSummaryDTO | null>(null);
  const [bookings, setBookings] = useState<BookingSummary[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const toast = useToast();

  const loadReportsTelemetry = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const isAllTime = timeRange.preset === "all_time";
        const dateParams = isAllTime
          ? { preset: "all_time" }
          : {
              startDate: timeRange.startDate.toISOString(),
              endDate: timeRange.endDate.toISOString(),
              preset: timeRange.preset,
            };

        // Single consolidated query against PostgreSQL via API
        const summaryData = await api.bookings.getAnalyticsSummary({
          ...dateParams,
          forceRefresh: isManualRefresh,
        });

        setSummary(summaryData);
        setBookings(summaryData.bookings || []);
        setTransactions(summaryData.transactions || []);

        if (isManualRefresh) {
          toast.success("Live analytics data refreshed from database.", {
            title: "Database Synced",
          });
        }
      } catch (err) {
        console.warn(
          "Could not load analytics reports telemetry from database:",
          err,
        );
        toast.error("Failed to fetch live database analytics.", {
          title: "Query Error",
        });
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [timeRange.preset, timeRange.startDate, timeRange.endDate, toast],
  );

  useEffect(() => {
    loadReportsTelemetry();
  }, [loadReportsTelemetry]);

  // Derive Period KPIs & Analytics from Consolidated Backend Summary
  const periodMetrics = useMemo(() => {
    if (summary?.periodMetrics) {
      return summary.periodMetrics;
    }
    return {
      totalRevenue: "₦0.00",
      rawTotalRevenue: 0,
      totalBookingsCount: 0,
      paidBookingsCount: 0,
      totalCheckIns: 0,
      totalCustomersCount: 0,
      avgDailyFootfall: "0.0",
      spaceOccupancyRate: 0,
      totalCapacity: 104,
      repeatRate: "0%",
      repeatMembersCount: 0,
      avgBookingValue: "₦0.00",
    };
  }, [summary]);

  // Subscription Plan Breakdown from Consolidated Backend Summary
  const periodSubscriptionPlans: SubscriptionPlanMetric[] = useMemo(() => {
    return summary?.subscriptionPlans || [];
  }, [summary]);

  // Facility Utilization Rankings from Consolidated Backend Summary
  const periodFacilityRankings: FacilityUtilization[] = useMemo(() => {
    return (summary?.facilityRankings as any) || [];
  }, [summary]);

  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (
    format: "csv" | "xlsx" | "pdf",
    type: "revenue" | "bookings" | "occupancy" = "revenue",
  ) => {
    setIsExporting(true);
    try {
      await api.reports.downloadExport({
        type,
        format,
        startDate:
          timeRange.preset === "all_time"
            ? undefined
            : timeRange.startDate.toISOString(),
        endDate:
          timeRange.preset === "all_time"
            ? undefined
            : timeRange.endDate.toISOString(),
        preset: timeRange.preset,
      });

      toast.success(
        `Exported ${type.toUpperCase()} report in ${format.toUpperCase()} format.`,
        {
          title: "Download Complete",
        },
      );
    } catch (err: any) {
      toast.error(err?.message || "Failed to download report.", {
        title: "Export Error",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl">
      {/* 1. Header with Title & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#181c20] tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-7 h-7 text-[#23055c]" />
            Analytics &amp; Performance Reports
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Deep-dive multi-period space utilisation, financial trajectories,
            and reconciliation audits.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadReportsTelemetry(true)}
            disabled={isRefreshing || loading}
            className="border-slate-300 hover:bg-white text-slate-700 font-semibold cursor-pointer shadow-xs"
          >
            <TrendingUp
              className={`h-3.5 w-3.5 mr-1.5 ${isRefreshing ? "animate-spin" : ""}`}
            />
            <span>{isRefreshing ? "Syncing DB..." : "Refresh Data"}</span>
          </Button>

          {/* PDF Export Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("pdf", "revenue")}
            disabled={isExporting || loading}
            className="border-[#23055c] text-[#23055c] hover:bg-[#23055c]/5 font-bold cursor-pointer shadow-xs"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            <span>{isExporting ? "Generating..." : "Export PDF"}</span>
          </Button>

          {/* Excel / CSV Export Button */}
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleExport("csv", "revenue")}
            disabled={isExporting || loading}
            className="bg-[#23055c] hover:bg-[#392271] text-white shadow-xs font-bold cursor-pointer"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />
            <span>Export CSV / Excel</span>
          </Button>
        </div>
      </div>

      {/* 2. Interactive Time Range Selector Bar */}
      <TimeRangeSelector
        value={timeRange}
        onChange={(newRange) => setTimeRange(newRange)}
      />

      {/* 3. Detailed Period KPIs Grid (6 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-4">
        {/* Total Period Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-accent-soft shadow-xs hover:shadow-md transition-all">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Period Revenue
            </span>
            <div className="w-7 h-7 bg-emerald-50 text-emerald-700 rounded-lg flex items-center justify-center font-bold text-xs">
              ₦
            </div>
          </div>
          <p
            className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight"
            title={periodMetrics.totalRevenue}
          >
            {loading ? "..." : periodMetrics.totalRevenue}
          </p>
          <p className="text-[11px] text-emerald-700 font-semibold mt-1">
            {periodMetrics.paidBookingsCount} paid bookings
          </p>
        </div>

        {/* Total Paid Reservations */}
        <div className="bg-white p-5 rounded-2xl border border-accent-soft shadow-xs hover:shadow-md transition-all">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Bookings
            </span>
            <div className="w-7 h-7 bg-purple-50 text-[#23055c] rounded-lg flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-slate-900">
            {loading ? "..." : periodMetrics.totalBookingsCount}
          </p>
          <p className="text-[11px] text-slate-500 font-medium mt-1">
            Paid reservations
          </p>
        </div>

        {/* Total Customers */}
        <div className="bg-white p-5 rounded-2xl border border-accent-soft shadow-xs hover:shadow-md transition-all">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Customers
            </span>
            <div className="w-7 h-7 bg-blue-50 text-blue-700 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-slate-900">
            {loading
              ? "..."
              : (periodMetrics.totalCustomersCount ??
                periodMetrics.totalCheckIns)}
          </p>
          <p className="text-[11px] text-slate-500 font-medium mt-1">
            Across selected timeframe
          </p>
        </div>

        {/* Daily Avg Footfall */}
        <div className="bg-white p-5 rounded-2xl border border-accent-soft shadow-xs hover:shadow-md transition-all">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Avg Daily Visitors
            </span>
            <div className="w-7 h-7 bg-indigo-50 text-indigo-700 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-slate-900">
            {loading ? "..." : periodMetrics.avgDailyFootfall}
          </p>
          <p className="text-[11px] text-slate-500 font-medium mt-1">
            Per day average
          </p>
        </div>

        {/* Space Utilisation Yield */}
        <div className="bg-white p-5 rounded-2xl border border-accent-soft shadow-xs hover:shadow-md transition-all">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Utilisation Yield
            </span>
            <div className="w-7 h-7 bg-amber-50 text-amber-700 rounded-lg flex items-center justify-center">
              <Armchair className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-slate-900">
            {loading ? "..." : `${periodMetrics.spaceOccupancyRate}%`}
          </p>
          <p className="text-[11px] text-slate-500 font-medium mt-1">
            {periodMetrics.totalCapacity} total hub capacity
          </p>
        </div>

        {/* Customer Retention / Repeat Rate */}
        <div className="bg-white p-5 rounded-2xl border border-accent-soft shadow-xs hover:shadow-md transition-all">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Repeat Customers
            </span>
            <div className="w-7 h-7 bg-rose-50 text-rose-700 rounded-lg flex items-center justify-center">
              <Repeat className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-slate-900">
            {loading ? "..." : periodMetrics.repeatRate}
          </p>
          <p className="text-[11px] text-slate-500 font-medium mt-1">
            {periodMetrics.repeatMembersCount} returning customers
          </p>
        </div>
      </div>

      {/* 4. Revenue & Space Occupancy Trajectory Trends Chart */}
      <div className="bg-white rounded-2xl border border-accent-soft p-2 sm:p-4 shadow-xs">
        <RevenueOccupancyChart
          loading={loading}
          bookings={bookings}
          transactions={transactions}
          startDate={timeRange.startDate}
          endDate={timeRange.endDate}
          title={`Revenue vs Occupancy Trend (${timeRange.label})`}
          subtitle={`Daily trajectory mapping total collections and seat occupancy across ${timeRange.daysCount} days`}
          hideToggle={true}
        />
      </div>

      {/* 5. Subscription Plan Allocation & Breakdown for this Period */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
        <div className="lg:col-span-2">
          <SubscriptionBarChart
            loading={loading}
            plans={periodSubscriptionPlans}
            totalCount={periodSubscriptionPlans.reduce(
              (sum, p) => sum + p.count,
              0,
            )}
          />
        </div>
        <div>
          <SubscriptionBreakdown
            loading={loading}
            plans={periodSubscriptionPlans}
            totalCount={periodSubscriptionPlans.reduce(
              (sum, p) => sum + p.count,
              0,
            )}
          />
        </div>
      </div>

      {/* 6. Facility & Space Demand Rankings for this Period */}
      <div>
        <MostUsedFacilities
          loading={loading}
          facilities={periodFacilityRankings}
        />
      </div>

      {/* 7. Available Pre-Generated Reports & Audit Downloads */}
      <Card
        id="exports"
        className="p-6 space-y-4 border border-accent-soft bg-white rounded-2xl shadow-xs"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-sm text-slate-900">
              Export Audit Reports for {timeRange.label}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Export structured reconciliations, settlement ledgers, and
              capacity audits for external compliance.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {/* Monthly Financial Reconciliation */}
          <div className="flex items-center justify-between p-4 bg-[#F8F9FA] rounded-xl border border-slate-200">
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 bg-purple-50 text-[#23055c] rounded-xl">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-xs text-slate-900">
                  Financial Reconciliation &amp; Settlements Audit
                </p>
                <p className="text-[11px] text-slate-500">
                  Includes Paystack settlement IDs, customer client references,
                  amounts, and transaction statuses for {timeRange.label}.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("csv", "revenue")}
              className="border-slate-300 hover:bg-white text-slate-700 font-semibold cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
            </Button>
          </div>

          {/* Occupancy Density Audit */}
          <div className="flex items-center justify-between p-4 bg-[#F8F9FA] rounded-xl border border-slate-200">
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 bg-amber-50 text-amber-700 rounded-xl">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-xs text-slate-900">
                  Workspace Occupancy &amp; Density Audit
                </p>
                <p className="text-[11px] text-slate-500">
                  Resource-by-resource utilization breakdown across Hot Desks,
                  Dedicated Wings, Private Suites, and Training Halls.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("csv", "occupancy")}
              className="border-slate-300 hover:bg-white text-slate-700 font-semibold cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
