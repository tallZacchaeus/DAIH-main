"use client";

import React from "react";
import Link from "next/link";
import { CreditCard, ArrowUpRight } from "lucide-react";

interface FinancialOverviewCardProps {
  totalPaid?: string;
  label?: string;
  loading?: boolean;
}

export const FinancialOverviewCard: React.FC<FinancialOverviewCardProps> = ({
  totalPaid = "₦0.00",
  label = "Total Invoices Paid",
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="bg-white border border-purple-100 rounded-2xl shadow-sm p-6 space-y-3 animate-pulse">
        <div className="h-4 w-32 bg-slate-200 rounded" />
        <div className="h-3 w-24 bg-slate-100 rounded" />
        <div className="h-8 w-40 bg-slate-200 rounded" />
      </div>
    );
  }

  return (
    <div className="bg-white border border-purple-100 rounded-2xl shadow-sm p-6 space-y-2 relative overflow-hidden group">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Financial Overview
        </h3>
        <Link
          href="/bookings"
          title="View Invoices in Bookings"
          className="text-slate-400 hover:text-[#23055c] transition-colors"
        >
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-2xl sm:text-3xl font-extrabold text-[#23055c] tracking-tight leading-tight">
        {totalPaid}
      </p>
    </div>
  );
};
