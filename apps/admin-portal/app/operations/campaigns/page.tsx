"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Megaphone,
  Sparkles,
  ShieldCheck,
  PlusCircle,
  RefreshCw,
  TrendingUp,
  Moon,
  Clock,
  Coins,
  Sliders,
  BarChart3,
  Loader2,
  Users,
} from "lucide-react";
import { useToast } from "@daih/ui";
import { api } from "@daih/api-client";
import { CampaignDTO, CampaignStatus } from "@daih/types";
import {
  CampaignList,
  CreateCampaignModal,
  ExecuteCampaignModal,
  DeleteCampaignModal,
} from "../../../components/campaigns";

export default function CampaignsAdminPage() {
  const toast = useToast();
  const [campaigns, setCampaigns] = useState<CampaignDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [isScoringRfm, setIsScoringRfm] = useState(false);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [executeModalOpen, setExecuteModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignDTO | null>(
    null,
  );
  const [campaignToDelete, setCampaignToDelete] = useState<CampaignDTO | null>(
    null,
  );

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.campaigns.list({ limit: 100 });
      setCampaigns(res.items || []);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleRunRfm = async () => {
    setIsScoringRfm(true);
    try {
      const res = await api.campaigns.calculateRfm();
      const count =
        (res as any)?.processedCount ?? (res as any)?.data?.processedCount ?? 0;
      toast.success(
        `RFM scoring completed! Processed ${count} members into quintile tiers.`,
      );
    } catch (err: any) {
      toast.error(err?.message || "Failed to calculate RFM scores");
    } finally {
      setIsScoringRfm(false);
    }
  };

  const handleApproveCopy = async (campaign: CampaignDTO) => {
    try {
      await api.campaigns.approveAi(campaign.id);
      toast.success(
        `AI copy approved for "${campaign.name}"! Campaign is now unlocked.`,
      );
      fetchCampaigns();
    } catch (err: any) {
      toast.error(err?.message || "Failed to approve AI copy");
    }
  };

  const handleOpenExecute = (campaign: CampaignDTO) => {
    setSelectedCampaign(campaign);
    setExecuteModalOpen(true);
  };

  const handleToggleStatus = async (
    campaign: CampaignDTO,
    newStatus: CampaignStatus,
  ) => {
    try {
      await api.campaigns.update(campaign.id, { status: newStatus });
      toast.success(
        newStatus === CampaignStatus.PAUSED
          ? `Campaign "${campaign.name}" has been paused.`
          : `Campaign "${campaign.name}" is now active.`,
      );
      fetchCampaigns();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update campaign status");
    }
  };

  const handleDeleteCampaign = (campaign: CampaignDTO) => {
    setCampaignToDelete(campaign);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async (campaign: CampaignDTO) => {
    try {
      await api.campaigns.delete(campaign.id);
      toast.success(`Campaign "${campaign.name}" has been deleted.`);
      fetchCampaigns();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete campaign");
    }
  };

  // KPIs
  const kpiStats = useMemo(() => {
    const total = campaigns.length;
    const active = campaigns.filter(
      (c) => c.status === CampaignStatus.ACTIVE,
    ).length;
    let totalTargeted = 0;
    let totalTreatmentSent = 0;
    let totalRevenueLift = 0;

    campaigns.forEach((c) => {
      if (c.metrics && c.metrics.length > 0) {
        c.metrics.forEach((m) => {
          totalTargeted += m.totalTargeted || 0;
          totalTreatmentSent += m.treatmentSent || 0;
          totalRevenueLift += Number(m.revenueLiftNgn || 0);
        });
      }
    });

    return {
      total,
      active,
      totalTargeted,
      totalTreatmentSent,
      totalRevenueLift,
    };
  }, [campaigns]);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Campaigns & Growth AI
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-[#23055c] border border-purple-200 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#23055c]" />6 Guardrails Active
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Automate member journeys with rule-based templates, AI copy
            drafting, 10% holdout lift measurement, and quiet hours deferrals.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Run RFM Scoring Button */}
          <button
            type="button"
            onClick={handleRunRfm}
            disabled={isScoringRfm}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
            title="Recalculate member recency, frequency & monetary quintiles"
          >
            {isScoringRfm ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Users className="w-3.5 h-3.5 text-[#23055c]" />
            )}
            <span>Run RFM Scoring</span>
          </button>

          {/* Refresh */}
          <button
            type="button"
            onClick={fetchCampaigns}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold transition-all cursor-pointer"
            title="Refresh List"
          >
            <RefreshCw
              className={`w-4 h-4 ${loading ? "animate-spin text-[#23055c]" : ""}`}
            />
          </button>

          {/* Create Campaign */}
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#23055c] hover:bg-[#392271] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Campaign</span>
          </button>
        </div>
      </div>

      {/* 6 Guardrails Status Banner */}
      <div className="bg-gradient-to-r from-purple-900 to-[#23055c] text-white rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-200">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Automated Protection Guardrails</span>
          </div>
          <span className="text-[10px] bg-white/15 px-2 py-0.5 rounded-full font-mono text-purple-100">
            Enforced 24/7
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-white/10 rounded-xl p-2.5 backdrop-blur-xs">
            <div className="text-[10px] text-purple-200 flex items-center gap-1 font-semibold">
              <Moon className="w-3 h-3 text-purple-300" />
              Quiet Hours
            </div>
            <div className="font-bold text-white mt-1">
              21:00 &mdash; 08:00 WAT
            </div>
            <div className="text-[9px] text-purple-300 mt-0.5">
              Auto-deferred to 08:05 WAT
            </div>
          </div>

          <div className="bg-white/10 rounded-xl p-2.5 backdrop-blur-xs">
            <div className="text-[10px] text-purple-200 flex items-center gap-1 font-semibold">
              <Clock className="w-3 h-3 text-amber-300" />
              Frequency Cap
            </div>
            <div className="font-bold text-white mt-1">7 Days Cooldown</div>
            <div className="text-[9px] text-purple-300 mt-0.5">
              Prevents member fatigue
            </div>
          </div>

          <div className="bg-white/10 rounded-xl p-2.5 backdrop-blur-xs">
            <div className="text-[10px] text-purple-200 flex items-center gap-1 font-semibold">
              <BarChart3 className="w-3 h-3 text-emerald-300" />
              Holdout Control
            </div>
            <div className="font-bold text-white mt-1">10% Control Group</div>
            <div className="text-[9px] text-purple-300 mt-0.5">
              Deterministic lift baseline
            </div>
          </div>

          <div className="bg-white/10 rounded-xl p-2.5 backdrop-blur-xs">
            <div className="text-[10px] text-purple-200 flex items-center gap-1 font-semibold">
              <Sparkles className="w-3 h-3 text-purple-300" />
              Human Approval Gate
            </div>
            <div className="font-bold text-white mt-1">Staff Signoff</div>
            <div className="text-[9px] text-purple-300 mt-0.5">
              AI copy locked until reviewed
            </div>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Campaigns */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="text-slate-500 text-xs font-bold mb-1">
            Total Campaigns
          </div>
          <div className="text-2xl font-black text-slate-900">
            {kpiStats.total}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Rule-based & AI templates
          </div>
        </div>

        {/* Active Campaigns */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="text-slate-500 text-xs font-bold mb-1">
            Active Running
          </div>
          <div className="text-2xl font-black text-emerald-600">
            {kpiStats.active}
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1">
            Evaluating triggers
          </div>
        </div>

        {/* Total Reached */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="text-slate-500 text-xs font-bold mb-1">
            Members Contacted
          </div>
          <div className="text-2xl font-black text-[#23055c]">
            {kpiStats.totalTreatmentSent.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Adhering to frequency caps
          </div>
        </div>

        {/* Total Incremental Revenue Lift */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="text-slate-500 text-xs font-bold mb-1">
            Incremental Revenue Lift
          </div>
          <div className="text-2xl font-black text-emerald-600">
            ₦{kpiStats.totalRevenueLift.toLocaleString()}
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1">
            Attributed above holdout
          </div>
        </div>
      </div>

      {/* Campaign List */}
      <CampaignList
        campaigns={campaigns}
        loading={loading}
        onSelectCampaign={(c) => {
          setSelectedCampaign(c);
        }}
        onExecuteCampaign={handleOpenExecute}
        onApproveAiCopy={handleApproveCopy}
        onToggleStatus={handleToggleStatus}
        onDeleteCampaign={handleDeleteCampaign}
      />

      {/* Create Campaign Modal */}
      <CreateCampaignModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={fetchCampaigns}
      />

      {/* Execute Campaign Modal */}
      <ExecuteCampaignModal
        isOpen={executeModalOpen}
        onClose={() => setExecuteModalOpen(false)}
        campaign={selectedCampaign}
        onSuccess={fetchCampaigns}
      />

      {/* Delete Campaign Modal */}
      <DeleteCampaignModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setCampaignToDelete(null);
        }}
        campaign={campaignToDelete}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
