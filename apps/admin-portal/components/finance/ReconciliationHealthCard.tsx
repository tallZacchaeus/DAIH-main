"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  AlertTriangle,
  RotateCw,
  CheckCircle2,
  Clock,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@daih/ui";
import { api } from "@daih/api-client";
import { ReconciliationSummary, ReconciliationDiscrepancy } from "@daih/types";

interface ReconciliationHealthCardProps {
  summary: ReconciliationSummary | null;
  loading: boolean;
  onRefresh: () => Promise<void> | void;
}

export const ReconciliationHealthCard: React.FC<
  ReconciliationHealthCardProps
> = ({ summary, loading, onRefresh }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const toast = useToast();

  const discrepancyCount = summary?.discrepancyCount ?? 0;
  const matchedCount = summary?.matchedCount ?? 0;
  const totalCount = summary?.totalLocalTransactions ?? 0;
  const matchRate =
    totalCount > 0 ? Math.round((matchedCount / totalCount) * 100) : 100;
  const discrepancies: ReconciliationDiscrepancy[] =
    summary?.discrepancies || [];

  const handleSyncSingle = async (item: ReconciliationDiscrepancy) => {
    setSyncingId(item.transactionId);
    try {
      const updatedTx = await api.payments.verifyPayment(item.transactionId);
      toast.success(
        `Synchronized with Paystack. Transaction status is now ${updatedTx.status}.`,
        { title: "Status Reconciled" },
      );
      await onRefresh();
    } catch (err: any) {
      toast.error(err?.message || "Failed to sync transaction with Paystack.", {
        title: "Sync Failed",
      });
    } finally {
      setSyncingId(null);
    }
  };

  const handleSyncAll = async () => {
    if (discrepancies.length === 0) return;
    setIsSyncingAll(true);
    let successCount = 0;
    let failCount = 0;

    for (const d of discrepancies) {
      try {
        await api.payments.verifyPayment(d.transactionId);
        successCount++;
      } catch {
        failCount++;
      }
    }

    setIsSyncingAll(false);
    toast.success(
      `Reconciled ${successCount} transactions (${failCount} errors).`,
      { title: "Batch Sync Completed" },
    );
    await onRefresh();
  };

  if (loading && !summary) {
    return (
      <div className="bg-white/80 backdrop-blur-md border border-[#EBE7F5] rounded-xl p-5 shadow-xs animate-pulse">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-200" />
            <div className="space-y-1.5">
              <div className="h-4 w-40 bg-slate-200 rounded" />
              <div className="h-3 w-64 bg-slate-100 rounded" />
            </div>
          </div>
          <div className="h-8 w-24 bg-slate-200 rounded-lg" />
        </div>
      </div>
    );
  }

  const isHealthy = discrepancyCount === 0;

  return (
    <div
      className={`border rounded-xl shadow-xs transition-all overflow-hidden ${
        isHealthy
          ? "bg-gradient-to-r from-emerald-50/70 via-white to-white border-emerald-200/80"
          : "bg-gradient-to-r from-amber-50/80 via-white to-white border-amber-300"
      }`}
    >
      <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left Status Icon & Header */}
        <div className="flex items-start sm:items-center gap-3.5">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isHealthy
                ? "bg-emerald-100 text-emerald-700 shadow-xs"
                : "bg-amber-100 text-amber-800 shadow-xs"
            }`}
          >
            {isHealthy ? (
              <ShieldCheck className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-extrabold text-slate-900">
                Gateway &amp; Ledger Reconciliation Engine
              </h3>
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                  isHealthy
                    ? "bg-emerald-100/70 text-emerald-800 border-emerald-300"
                    : "bg-amber-100 text-amber-900 border-amber-300 animate-pulse"
                }`}
              >
                {isHealthy ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>
                      100% Reconciled ({matchedCount}/{totalCount} Matched)
                    </span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3 h-3 text-amber-700" />
                    <span>
                      {discrepancyCount}{" "}
                      {discrepancyCount === 1 ? "Discrepancy" : "Discrepancies"}{" "}
                      Flagged
                    </span>
                  </>
                )}
              </span>
            </div>

            <p className="text-xs text-slate-500 mt-0.5">
              {isHealthy
                ? `All ${totalCount} recorded transactions in this period are perfectly synchronized with Paystack settlement states.`
                : `${discrepancyCount} pending transactions have exceeded the 24-hour settlement window without gateway resolution.`}
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
          {!isHealthy && (
            <button
              onClick={handleSyncAll}
              disabled={isSyncingAll}
              className="px-3.5 py-1.5 bg-[#23055c] hover:bg-[#35089e] text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSyncingAll ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              <span>Auto-Sync All</span>
            </button>
          )}

          {!isHealthy && discrepancies.length > 0 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-3 py-1.5 bg-white border border-amber-200 text-slate-700 hover:bg-amber-50/50 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>{isExpanded ? "Hide Details" : "View Discrepancies"}</span>
              {isExpanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          )}

          <button
            onClick={() => onRefresh()}
            className="p-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-lg transition-colors cursor-pointer"
            title="Refresh Telemetry"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expandable Discrepancy Items Drawer */}
      {isExpanded && discrepancies.length > 0 && (
        <div className="border-t border-amber-200 bg-amber-50/30 p-4 space-y-2.5 animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">
              Flagged Unresolved Transactions
            </span>
            <span className="text-[11px] text-amber-700">
              Click &quot;Sync with Paystack&quot; to fetch latest gateway
              response and update DB
            </span>
          </div>

          <div className="space-y-2">
            {discrepancies.map((d) => (
              <div
                key={d.transactionId}
                className="bg-white border border-amber-200/80 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs hover:border-amber-300 transition-colors"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-[#23055c]">
                      {d.reference}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        d.type === "CAPACITY_CONFLICT"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {d.type.replace("_", " ")}
                    </span>
                    <span className="font-bold text-xs text-slate-800">
                      ₦
                      {(d.localAmount || 0).toLocaleString("en-NG", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">{d.details}</p>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  {d.type === "CAPACITY_CONFLICT" ? (
                    <a
                      href="/bookings"
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Reschedule in Bookings</span>
                    </a>
                  ) : (
                    <button
                      onClick={() => handleSyncSingle(d)}
                      disabled={syncingId === d.transactionId}
                      className="px-3 py-1.5 bg-[#23055c] hover:bg-[#392271] text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {syncingId === d.transactionId ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RotateCw className="w-3.5 h-3.5" />
                      )}
                      <span>Sync with Paystack</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
