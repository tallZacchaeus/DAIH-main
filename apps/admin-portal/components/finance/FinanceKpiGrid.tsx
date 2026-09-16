"use client";

import { AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";

export interface FinanceKpiData {
  totalCollected: string;
  collectedBadge: string;
  isCollectedUp: boolean;
  collectedSubtext?: string;

  avgBookingValue?: string;
  avgBookingBadge?: string;
  avgBookingSubtext?: string;

  netRevenue: string;
  netRevenueBadge: string;
  isNetRevenueUp: boolean;
  netRevenueSubtext?: string;

  outstandingAmount: string;
  pendingCount: number;
  pendingSubtext?: string;

  // Backwards compatibility aliases
  totalRevenue?: string;
  mrr?: string;
  totalRefunded?: string;
  refundedBadge?: string;
  isRefundedUp?: boolean;
  refundedSubtext?: string;
}

interface FinanceKpiGridProps {
  data?: Partial<FinanceKpiData>;
  loading?: boolean;
  onViewPendingInvoices?: () => void;
}

export const FinanceKpiGrid: React.FC<FinanceKpiGridProps> = ({
  data,
  loading = false,
  onViewPendingInvoices,
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white/80 border border-[#EBE7F5] p-6 rounded-xl space-y-4 shadow-xs"
          >
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div className="h-3 w-24 bg-slate-200 rounded" />
                <div className="h-7 w-36 bg-slate-200 rounded" />
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-200" />
            </div>
            <div className="h-4 w-28 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const kpi: FinanceKpiData = {
    totalCollected: data?.totalCollected || data?.totalRevenue || "₦0.00",
    collectedBadge: data?.collectedBadge || "0 paid txs",
    isCollectedUp: data?.isCollectedUp ?? true,
    collectedSubtext: data?.collectedSubtext || "gross settlements",

    avgBookingValue: data?.avgBookingValue || "₦0.00",
    avgBookingBadge: data?.avgBookingBadge || "0 bookings",
    avgBookingSubtext: data?.avgBookingSubtext || "per completed transaction",

    netRevenue: data?.netRevenue || data?.totalRevenue || "₦0.00",
    netRevenueBadge: data?.netRevenueBadge || "100% retained",
    isNetRevenueUp: data?.isNetRevenueUp ?? true,
    netRevenueSubtext: data?.netRevenueSubtext || "100% retained settlements",

    outstandingAmount: data?.outstandingAmount || "₦0.00",
    pendingCount: data?.pendingCount || 0,
    pendingSubtext: data?.pendingSubtext || "pending items",
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Collected */}
      <div className="bg-white/80 backdrop-blur-md border border-[#EBE7F5] p-6 rounded-xl shadow-xs hover:shadow-md transition-shadow">
        <div className="mb-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Collected
          </p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1.5 tracking-tight truncate">
            {kpi.totalCollected}
          </h3>
        </div>

        <div className="flex items-center gap-2 mt-4 text-xs">
          <span
            className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded ${
              kpi.isCollectedUp
                ? "text-emerald-600 bg-emerald-50"
                : "text-rose-600 bg-rose-50"
            }`}
          >
            {kpi.isCollectedUp ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5" />
            )}
            {kpi.collectedBadge}
          </span>
          <span className="text-slate-500 font-medium truncate">
            {kpi.collectedSubtext}
          </span>
        </div>
      </div>

      {/* 2. Average Transaction Value */}
      <div className="bg-white/80 backdrop-blur-md border border-[#EBE7F5] p-6 rounded-xl shadow-xs hover:shadow-md transition-shadow">
        <div className="mb-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Avg Transaction
          </p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1.5 tracking-tight truncate">
            {kpi.avgBookingValue}
          </h3>
        </div>

        <div className="flex items-center gap-2 mt-4 text-xs">
          <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded text-purple-700 bg-purple-50">
            {kpi.avgBookingBadge}
          </span>
          <span className="text-slate-500 font-medium truncate">
            {kpi.avgBookingSubtext}
          </span>
        </div>
      </div>

      {/* 3. Total Revenue (Net = Total Collected - Total Refunded) */}
      <div className="bg-white/80 backdrop-blur-md border border-[#EBE7F5] p-6 rounded-xl shadow-xs hover:shadow-md transition-shadow">
        <div className="mb-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Revenue
          </p>
          <h3 className="text-2xl font-bold text-emerald-700 mt-1.5 tracking-tight truncate">
            {kpi.netRevenue}
          </h3>
        </div>

        <div className="flex items-center gap-2 mt-4 text-xs">
          <span
            className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded ${
              kpi.isNetRevenueUp
                ? "text-emerald-600 bg-emerald-50"
                : "text-rose-600 bg-rose-50"
            }`}
          >
            {kpi.isNetRevenueUp ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5" />
            )}
            {kpi.netRevenueBadge}
          </span>
          <span className="text-slate-500 font-medium truncate">
            {kpi.netRevenueSubtext}
          </span>
        </div>
      </div>

      {/* 4. Outstanding / Pending Invoices */}
      <div className="bg-white/80 backdrop-blur-md border border-[#EBE7F5] p-6 rounded-xl shadow-xs hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Pending Transactions
            </p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1.5 tracking-tight truncate">
              {kpi.outstandingAmount}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 text-xs">
          <span className="text-slate-500 font-medium truncate">
            {kpi.pendingSubtext || `${kpi.pendingCount} pending items`}
          </span>
          {onViewPendingInvoices && (
            <button
              onClick={onViewPendingInvoices}
              className="text-[#23055c] hover:underline font-bold cursor-pointer shrink-0 ml-2"
            >
              Filter Ledger
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
