"use client";

import React, { useState } from "react";
import { LoyaltyTransactionDTO, LoyaltyTransactionType } from "@daih/types";
import {
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  Coins,
  ChevronLeft,
  ChevronRight,
  User,
  Clock,
  Tag,
} from "lucide-react";

interface LoyaltyLedgerTableProps {
  items: LoyaltyTransactionDTO[];
  total: number;
  page: number;
  limit: number;
  loading?: boolean;
  onPageChange: (newPage: number) => void;
  onFilterChange: (type?: string, search?: string) => void;
}

export const LoyaltyLedgerTable: React.FC<LoyaltyLedgerTableProps> = ({
  items,
  total,
  page,
  limit,
  loading = false,
  onPageChange,
  onFilterChange,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("ALL");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterChange(
      selectedType === "ALL" ? undefined : selectedType,
      searchTerm.trim() || undefined,
    );
  };

  const handleTypeSelect = (type: string) => {
    setSelectedType(type);
    onFilterChange(
      type === "ALL" ? undefined : type,
      searchTerm.trim() || undefined,
    );
  };

  const totalPages = Math.ceil(total / limit) || 1;

  const getTypeBadge = (type: LoyaltyTransactionType) => {
    switch (type) {
      case "TRANSACTION_REWARD":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
            <ArrowUpRight className="w-3 h-3 text-emerald-600" />
            Booking Reward
          </span>
        );
      case "ACTIVE_REFERRAL_BONUS":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-[#23055c] border border-purple-200/60">
            <Coins className="w-3 h-3 text-[#23055c]" />
            Referral Bonus
          </span>
        );
      case "REFEREE_WELCOME_BONUS":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60">
            Welcome Gift
          </span>
        );
      case "REDEMPTION_BOOKING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/60">
            <ArrowDownLeft className="w-3 h-3 text-amber-600" />
            Redeemed at Checkout
          </span>
        );
      case "ADMIN_ADJUSTMENT":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            Manual Adjustment
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
            {type}
          </span>
        );
    }
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(d);
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#EBE7F5] shadow-xs overflow-hidden">
      {/* Search & Filter Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <form
          onSubmit={handleSearchSubmit}
          className="relative flex-1 max-w-md"
        >
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search member, email, or reference ID..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#23055c]/20 focus:border-[#23055c] transition-all"
          />
        </form>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
          {[
            { label: "All", value: "ALL" },
            { label: "Rewards", value: "TRANSACTION_REWARD" },
            { label: "Referrals", value: "ACTIVE_REFERRAL_BONUS" },
            { label: "Redeemed", value: "REDEMPTION_BOOKING" },
            { label: "Adjustments", value: "ADMIN_ADJUSTMENT" },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => handleTypeSelect(tab.value)}
              className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-all whitespace-nowrap cursor-pointer ${
                selectedType === tab.value
                  ? "bg-[#23055c] text-white shadow-xs"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-600"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ledger Table */}
      <div className="overflow-x-auto min-h-[300px]">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <th className="py-3 px-4">Member</th>
              <th className="py-3 px-4">Type &amp; Description</th>
              <th className="py-3 px-4">Reference ID</th>
              <th className="py-3 px-4 text-right">Amount (PDC)</th>
              <th className="py-3 px-4 text-right">Balance After</th>
              <th className="py-3 px-4 text-right">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-16 text-center text-slate-400">
                  <div className="inline-block w-6 h-6 border-2 border-[#23055c] border-t-transparent rounded-full animate-spin mb-2"></div>
                  <p>Loading loyalty ledger records...</p>
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16 text-center text-slate-400">
                  <Coins className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="font-semibold text-slate-700">
                    No loyalty transactions found
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Transactions will appear as customers earn or redeem coins.
                  </p>
                </td>
              </tr>
            ) : (
              items.map((tx) => {
                const isCredit = tx.amount > 0;
                return (
                  <tr
                    key={tx.id}
                    className="hover:bg-purple-50/20 transition-colors"
                  >
                    {/* Member */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">
                        {tx.userName || "Customer Member"}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {tx.userEmail ||
                          tx.userClientId ||
                          tx.userId.slice(0, 8)}
                      </div>
                    </td>

                    {/* Type & Description */}
                    <td className="py-3 px-4 max-w-xs">
                      <div className="mb-1">{getTypeBadge(tx.type)}</div>
                      <p className="text-slate-600 text-xs truncate">
                        {tx.description}
                      </p>
                    </td>

                    {/* Reference ID */}
                    <td className="py-3 px-4">
                      <span className="font-mono text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                        {tx.referenceId.length > 18
                          ? `${tx.referenceId.slice(0, 10)}...${tx.referenceId.slice(-6)}`
                          : tx.referenceId}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`font-extrabold text-sm font-mono ${
                          isCredit ? "text-emerald-600" : "text-amber-600"
                        }`}
                      >
                        {isCredit ? `+${tx.amount}` : tx.amount}
                      </span>
                    </td>

                    {/* Balance After */}
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-700">
                      {tx.balanceAfter} PDC
                    </td>

                    {/* Date */}
                    <td className="py-3 px-4 text-right text-slate-500 whitespace-nowrap">
                      {formatDate(tx.createdAt)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span>
          Showing {(page - 1) * limit + (items.length ? 1 : 0)} -{" "}
          {Math.min(page * limit, total)} of {total} operations
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => onPageChange(page - 1)}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-bold text-slate-700">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => onPageChange(page + 1)}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
