"use client";

import React, { useState } from "react";
import {
  Search,
  Filter,
  RotateCcw,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Coins,
  ChevronLeft,
  ChevronRight,
  Eye,
  AlertCircle,
  ArrowUpDown,
} from "lucide-react";
import { RefundRequestItemDTO, RefundStatus } from "@daih/types";

export interface RefundsTableProps {
  items: RefundRequestItemDTO[];
  total: number;
  page: number;
  limit: number;
  loading: boolean;
  onPageChange: (newPage: number) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  onSelectRefund: (refund: RefundRequestItemDTO) => void;
}

export const RefundsTable: React.FC<RefundsTableProps> = ({
  items,
  total,
  page,
  limit,
  loading,
  onPageChange,
  statusFilter,
  onStatusFilterChange,
  onSelectRefund,
}) => {
  const [search, setSearch] = useState("");

  const filteredItems = items.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      item.booking?.reference.toLowerCase().includes(q) ||
      item.booking?.user?.email.toLowerCase().includes(q) ||
      item.booking?.user?.firstName?.toLowerCase().includes(q) ||
      item.booking?.user?.lastName?.toLowerCase().includes(q) ||
      item.reason.toLowerCase().includes(q) ||
      item.reasonCode.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const renderStatus = (status: RefundStatus) => {
    switch (status) {
      case RefundStatus.PENDING:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3" />
            Pending Approval
          </span>
        );
      case RefundStatus.INFO_REQUESTED:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <HelpCircle className="w-3 h-3" />
            Clarification Needed
          </span>
        );
      case RefundStatus.APPROVED:
      case RefundStatus.PROCESSED:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            Disbursed
          </span>
        );
      case RefundStatus.REJECTED:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3" />
            Rejected
          </span>
        );
      case RefundStatus.FAILED:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
            <AlertCircle className="w-3 h-3 text-rose-500" />
            Failed
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Search & Filter Toolbar */}
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
          {[
            { label: "All", value: "ALL" },
            { label: "Pending", value: RefundStatus.PENDING },
            { label: "Inquiry", value: RefundStatus.INFO_REQUESTED },
            { label: "Approved", value: RefundStatus.APPROVED },
            { label: "Rejected", value: RefundStatus.REJECTED },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => onStatusFilterChange(tab.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === tab.value
                  ? "bg-white text-[#23055c] shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search reference, customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-[#23055c] font-medium"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto min-h-[300px]">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400 text-xs gap-2">
            <span className="w-4 h-4 border-2 border-[#23055c] border-t-transparent rounded-full animate-spin" />
            Loading refund requests...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-xs">
            <RotateCcw className="w-8 h-8 mx-auto mb-2 opacity-30 text-[#23055c]" />
            <p className="font-semibold text-slate-600">
              No refund requests found
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {statusFilter !== "ALL"
                ? `No requests matching "${statusFilter}" filter.`
                : "No refund requests have been submitted yet."}
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="py-3 px-4">Booking Ref</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Refund Amount</th>
                <th className="py-3 px-4">Coin Impact</th>
                <th className="py-3 px-4">Reason Category</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Requested By</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                  onClick={() => onSelectRefund(item)}
                >
                  {/* Booking Ref */}
                  <td className="py-3.5 px-4 font-mono font-bold text-[#23055c]">
                    #{item.booking?.reference || item.bookingId.slice(0, 8)}
                    <div className="text-[10px] text-slate-400 font-sans font-normal">
                      {new Date(item.requestedAt).toLocaleDateString()}
                    </div>
                  </td>

                  {/* Customer */}
                  <td className="py-3.5 px-4 font-medium text-slate-800">
                    <div>
                      {item.booking?.user
                        ? `${item.booking.user.firstName} ${item.booking.user.lastName}`
                        : "Customer"}
                    </div>
                    <div className="text-[11px] text-slate-400 font-normal">
                      {item.booking?.user?.email}
                    </div>
                  </td>

                  {/* Refund Amount */}
                  <td className="py-3.5 px-4 font-bold text-slate-900">
                    ₦{Number(item.amount).toLocaleString()}
                  </td>

                  {/* Coin Impact */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5 text-[11px]">
                      {item.coinsToReverse > 0 && (
                        <span className="text-purple-700 font-bold bg-purple-50 px-1.5 py-0.5 rounded">
                          +{item.coinsToReverse} PD
                        </span>
                      )}
                      {item.coinsToClawback > 0 && (
                        <span className="text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded">
                          -{item.coinsToClawback} PD
                        </span>
                      )}
                      {item.coinsToReverse === 0 &&
                        item.coinsToClawback === 0 && (
                          <span className="text-slate-400">—</span>
                        )}
                    </div>
                  </td>

                  {/* Reason Code */}
                  <td className="py-3.5 px-4 text-slate-600">
                    <span className="bg-slate-100 px-2 py-0.5 rounded-md font-medium text-[11px]">
                      {item.reasonCode.replace(/_/g, " ")}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4">{renderStatus(item.status)}</td>

                  {/* Requested By */}
                  <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                    {item.requestedBy
                      ? `${item.requestedBy.firstName} ${item.requestedBy.lastName}`
                      : "Staff"}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectRefund(item);
                      }}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 hover:border-[#23055c] hover:bg-purple-50 hover:text-[#23055c] text-slate-600 font-bold text-[11px] transition-all flex items-center gap-1 ml-auto cursor-pointer"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Review</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Footer */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
        <div>
          Showing <strong>{filteredItems.length}</strong> of{" "}
          <strong>{total}</strong> requests
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1 || loading}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-semibold text-slate-700">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages || loading}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
