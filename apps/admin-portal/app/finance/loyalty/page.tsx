"use client";

import React, { useState, useEffect, useCallback } from "react";
import { api, useAuth } from "@daih/api-client";
import { useToast } from "@daih/ui";
import {
  LoyaltySettingsRecord,
  AdminLoyaltyStatsDTO,
  LoyaltyTransactionDTO,
  UpdateLoyaltySettingsDTO,
  AdminManualAdjustmentDTO,
  LoyaltySettingsAuditDTO,
  UserRole,
} from "@daih/types";
import {
  Coins,
  Sliders,
  History,
  ShieldCheck,
  PlusCircle,
  RefreshCw,
  Clock,
  User,
  ArrowRight,
  Lock,
} from "lucide-react";
import {
  LoyaltyStatsCards,
  LoyaltyFormulaBuilder,
  LoyaltyLedgerTable,
  ManualAdjustmentModal,
} from "../../../components/loyalty";

export default function LoyaltyAdminPage() {
  const toast = useToast();
  const { user } = useAuth();
  const canWrite =
    user?.role === UserRole.SUPER_ADMIN ||
    user?.role === UserRole.OPERATIONS_ADMIN;

  const [activeTab, setActiveTab] = useState<
    "FORMULA" | "STATS" | "LEDGER" | "AUDIT"
  >("FORMULA");

  const [settings, setSettings] = useState<LoyaltySettingsRecord | null>(null);
  const [stats, setStats] = useState<AdminLoyaltyStatsDTO | null>(null);
  const [ledgerItems, setLedgerItems] = useState<LoyaltyTransactionDTO[]>([]);
  const [ledgerTotal, setLedgerTotal] = useState(0);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerLimit] = useState(20);
  const [ledgerFilterType, setLedgerFilterType] = useState<
    string | undefined
  >();
  const [ledgerSearch, setLedgerSearch] = useState<string | undefined>();
  const [auditLogs, setAuditLogs] = useState<LoyaltySettingsAuditDTO[]>([]);

  const [loadingSettings, setLoadingSettings] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);

  // Load Settings & Stats
  const fetchSettingsAndStats = useCallback(async () => {
    setLoadingSettings(true);
    setLoadingStats(true);
    try {
      const [settRes, statRes] = await Promise.all([
        api.loyalty.getSettings(),
        api.loyalty.getAdminStats(),
      ]);
      setSettings(settRes);
      setStats(statRes);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load loyalty configuration.");
    } finally {
      setLoadingSettings(false);
      setLoadingStats(false);
    }
  }, [toast]);

  // Load Ledger
  const fetchLedger = useCallback(async () => {
    setLoadingLedger(true);
    try {
      const res = await api.loyalty.getAdminLedger({
        page: ledgerPage,
        limit: ledgerLimit,
        type: ledgerFilterType || undefined,
        search: ledgerSearch || undefined,
      });
      setLedgerItems(res?.items || []);
      setLedgerTotal(res?.total ?? 0);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load loyalty ledger.");
    } finally {
      setLoadingLedger(false);
    }
  }, [ledgerPage, ledgerLimit, ledgerFilterType, ledgerSearch, toast]);

  // Load Audit History
  const fetchAuditLogs = useCallback(async () => {
    setLoadingAudit(true);
    try {
      const res = await api.loyalty.getSettingsAuditHistory();
      setAuditLogs(res || []);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load settings audit history.");
    } finally {
      setLoadingAudit(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSettingsAndStats();
  }, [fetchSettingsAndStats]);

  useEffect(() => {
    if (activeTab === "LEDGER") {
      fetchLedger();
    } else if (activeTab === "AUDIT") {
      fetchAuditLogs();
    }
  }, [activeTab, fetchLedger, fetchAuditLogs]);

  const handleSaveSettings = async (dto: UpdateLoyaltySettingsDTO) => {
    const updated = await api.loyalty.updateSettings(dto);
    setSettings(updated);
    // Refresh stats in background
    api.loyalty
      .getAdminStats()
      .then(setStats)
      .catch(() => {});
  };

  const handleManualAdjustment = async (dto: AdminManualAdjustmentDTO) => {
    await api.loyalty.adminAdjustCoins(dto);
    // Refresh stats and ledger
    fetchSettingsAndStats();
    if (activeTab === "LEDGER") {
      fetchLedger();
    }
  };

  const formatDate = (isoStr: string) => {
    try {
      return new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(isoStr));
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-[#23055c] px-2.5 py-0.5 rounded-full">
              Rewards &amp; Tokenomics
            </span>
            <span className="text-xs text-slate-500 font-medium">
              DAIH Loyalty Bonus System
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Coins className="w-8 h-8 text-[#23055c]" />
            PD Coin Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Configure transaction earning formulas, referral bonuses, checkout
            redemption rates, and monitor total token circulation.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {canWrite ? (
            <button
              onClick={() => setIsAdjustModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-[#23055c]" />
              <span>Manual Adjustment</span>
            </button>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 border border-slate-200 text-slate-500 text-xs font-semibold rounded-xl">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Finance Read-Only</span>
            </div>
          )}

          <button
            onClick={() => {
              fetchSettingsAndStats();
              if (activeTab === "LEDGER") fetchLedger();
              if (activeTab === "AUDIT") fetchAuditLogs();
            }}
            className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition-all shadow-xs cursor-pointer"
            title="Refresh All Data"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                loadingSettings || loadingStats
                  ? "animate-spin text-[#23055c]"
                  : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* KPI Stats Overview */}
      <LoyaltyStatsCards stats={stats} loading={loadingStats} />

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1 text-xs">
        <button
          onClick={() => setActiveTab("FORMULA")}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold rounded-t-xl transition-all cursor-pointer ${
            activeTab === "FORMULA"
              ? "bg-white text-[#23055c] border-b-2 border-[#23055c] shadow-xs"
              : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Formula &amp; Policies</span>
        </button>

        <button
          onClick={() => setActiveTab("LEDGER")}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold rounded-t-xl transition-all cursor-pointer ${
            activeTab === "LEDGER"
              ? "bg-white text-[#23055c] border-b-2 border-[#23055c] shadow-xs"
              : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <History className="w-4 h-4" />
          <span>Global Coin Ledger</span>
        </button>

        <button
          onClick={() => setActiveTab("AUDIT")}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold rounded-t-xl transition-all cursor-pointer ${
            activeTab === "AUDIT"
              ? "bg-white text-[#23055c] border-b-2 border-[#23055c] shadow-xs"
              : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Settings Audit Trail</span>
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "FORMULA" && (
          <LoyaltyFormulaBuilder
            settings={settings}
            onSave={handleSaveSettings}
            loading={loadingSettings}
            readOnly={!canWrite}
          />
        )}

        {activeTab === "LEDGER" && (
          <LoyaltyLedgerTable
            items={ledgerItems}
            total={ledgerTotal}
            page={ledgerPage}
            limit={ledgerLimit}
            loading={loadingLedger}
            onPageChange={(p) => setLedgerPage(p)}
            onFilterChange={(type, search) => {
              setLedgerFilterType(type);
              setLedgerSearch(search);
              setLedgerPage(1);
            }}
          />
        )}

        {activeTab === "AUDIT" && (
          <div className="bg-white rounded-2xl border border-[#EBE7F5] shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                Formula Configuration Changelog
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Audit trail of changes made to payout rates, formulas, and coin
                valuation.
              </p>
            </div>

            {loadingAudit ? (
              <div className="py-16 text-center text-slate-400">
                <div className="inline-block w-6 h-6 border-2 border-[#23055c] border-t-transparent rounded-full animate-spin mb-2"></div>
                <p>Loading audit trail...</p>
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                No configuration modifications logged yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-4 sm:p-5 hover:bg-slate-50/50">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-[#23055c] px-2 py-0.5 rounded border border-purple-100">
                          {log.action}
                        </span>
                        <span className="text-xs font-bold text-slate-800">
                          by {log.userName || log.userId || "Administrator"}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDate(log.createdAt)}
                      </span>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-3 text-xs font-mono text-slate-700 border border-slate-200/80 overflow-x-auto">
                      <pre className="text-[11px] whitespace-pre-wrap">
                        {JSON.stringify(
                          log.metadata?.updated || log.metadata,
                          null,
                          2,
                        )}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Manual Adjustment Modal */}
      <ManualAdjustmentModal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        onSubmit={handleManualAdjustment}
      />
    </div>
  );
}
