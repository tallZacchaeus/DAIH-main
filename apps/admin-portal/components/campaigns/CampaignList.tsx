"use client";

import React, { useState } from "react";
import {
  Megaphone,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Play,
  Pause,
  Trash2,
  Clock,
  Coins,
  Percent,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Sliders,
  TrendingUp,
} from "lucide-react";
import {
  CampaignDTO,
  CampaignStatus,
  CampaignChannel,
  CampaignType,
} from "@daih/types";
import { CampaignLiftStats } from "./CampaignLiftStats";

export interface CampaignListProps {
  campaigns: CampaignDTO[];
  loading: boolean;
  onSelectCampaign: (campaign: CampaignDTO) => void;
  onExecuteCampaign: (campaign: CampaignDTO) => void;
  onApproveAiCopy: (campaign: CampaignDTO) => void;
  onToggleStatus?: (campaign: CampaignDTO, newStatus: CampaignStatus) => void;
  onDeleteCampaign?: (campaign: CampaignDTO) => void;
}

export const CampaignList: React.FC<CampaignListProps> = ({
  campaigns,
  loading,
  onSelectCampaign,
  onExecuteCampaign,
  onApproveAiCopy,
  onToggleStatus,
  onDeleteCampaign,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [expandedMetricsId, setExpandedMetricsId] = useState<string | null>(
    null,
  );

  const filtered = campaigns.filter((c) => {
    if (c.status === CampaignStatus.ARCHIVED) return false;
    if (filterStatus === "ALL") return true;
    return c.status === filterStatus;
  });

  const getStatusBadge = (status: CampaignStatus) => {
    switch (status) {
      case CampaignStatus.ACTIVE:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Active
          </span>
        );
      case CampaignStatus.DRAFT:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
            Draft
          </span>
        );
      case CampaignStatus.COMPLETED:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            Completed
          </span>
        );
      case CampaignStatus.PAUSED:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            Paused
          </span>
        );
      default:
        return null;
    }
  };

  const getChannelBadge = (channel: CampaignChannel) => {
    switch (channel) {
      case CampaignChannel.EMAIL:
        return (
          <span className="bg-blue-50 text-blue-700 text-[10px] font-semibold px-2 py-0.5 rounded-md">
            Email
          </span>
        );
      case CampaignChannel.IN_APP:
        return (
          <span className="bg-purple-50 text-purple-700 text-[10px] font-semibold px-2 py-0.5 rounded-md">
            In-App
          </span>
        );
      case CampaignChannel.BOTH:
        return (
          <span className="bg-emerald-50 text-emerald-700 text-[10px] font-semibold px-2 py-0.5 rounded-md">
            Email + In-App
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl w-fit">
        {[
          { label: "All Campaigns", value: "ALL" },
          { label: "Active", value: CampaignStatus.ACTIVE },
          { label: "Draft", value: CampaignStatus.DRAFT },
          { label: "Completed", value: CampaignStatus.COMPLETED },
          { label: "Paused", value: CampaignStatus.PAUSED },
        ].map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setFilterStatus(tab.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterStatus === tab.value
                ? "bg-white text-[#23055c] shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400 text-xs gap-2">
          <span className="w-4 h-4 border-2 border-[#23055c] border-t-transparent rounded-full animate-spin" />
          Loading campaigns...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 text-center py-16 p-4 text-xs">
          <Megaphone className="w-8 h-8 mx-auto mb-2 opacity-25 text-[#23055c]" />
          <p className="font-semibold text-slate-700">No campaigns found</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {filterStatus !== "ALL"
              ? `No campaigns with status "${filterStatus}".`
              : "Create your first rule-based or AI campaign to start engaging members."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filtered.map((campaign) => {
            const needsHumanApproval =
              campaign.aiGenerated && !campaign.aiApprovedByUserId;
            const hasMetrics = campaign.metrics && campaign.metrics.length > 0;
            const isMetricsExpanded = expandedMetricsId === campaign.id;

            return (
              <div
                key={campaign.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-xs hover:border-slate-300 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">
                        {campaign.name}
                      </h3>
                      {getStatusBadge(campaign.status)}
                      {getChannelBadge(campaign.channel)}
                      {campaign.aiGenerated && (
                        <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-purple-200">
                          <Sparkles className="w-3 h-3 text-purple-600" />
                          AI Generated
                        </span>
                      )}
                    </div>
                    {campaign.description && (
                      <p className="text-xs text-slate-500">
                        {campaign.description}
                      </p>
                    )}
                  </div>

                  {/* Top Right Action Buttons */}
                  <div className="flex items-center gap-2">
                    {/* Human Approval Gate Action */}
                    {needsHumanApproval ? (
                      <button
                        type="button"
                        onClick={() => onApproveAiCopy(campaign)}
                        className="px-3 py-1.5 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                        <span>Approve Copy</span>
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Staff Approved</span>
                      </span>
                    )}

                    {/* Campaign Action Button: Automated vs Custom Broadcast */}
                    {campaign.type !== CampaignType.CUSTOM_BROADCAST ? (
                      campaign.status === CampaignStatus.ACTIVE ? (
                        <div className="flex items-center gap-2">
                          <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-200">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Auto-Running
                          </span>
                          <button
                            type="button"
                            onClick={() => onExecuteCampaign(campaign)}
                            title="Run an on-demand evaluation cycle immediately"
                            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <Play className="w-3 h-3 text-[#23055c]" />
                            <span>Run Sweep</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onExecuteCampaign(campaign)}
                          className="px-3.5 py-1.5 rounded-xl bg-[#23055c] hover:bg-[#392271] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Activate Preset</span>
                        </button>
                      )
                    ) : (
                      <button
                        type="button"
                        onClick={() => onExecuteCampaign(campaign)}
                        className="px-3.5 py-1.5 rounded-xl bg-[#23055c] hover:bg-[#392271] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Send Broadcast</span>
                      </button>
                    )}

                    {/* Pause / Resume Action */}
                    {onToggleStatus &&
                      campaign.status === CampaignStatus.ACTIVE && (
                        <button
                          type="button"
                          onClick={() =>
                            onToggleStatus(campaign, CampaignStatus.PAUSED)
                          }
                          title="Pause Campaign"
                          className="p-1.5 rounded-xl border border-slate-200 text-slate-500 hover:text-amber-600 hover:bg-amber-50 hover:border-amber-200 transition-colors cursor-pointer"
                        >
                          <Pause className="w-3.5 h-3.5" />
                        </button>
                      )}
                    {onToggleStatus &&
                      campaign.status === CampaignStatus.PAUSED && (
                        <button
                          type="button"
                          onClick={() =>
                            onToggleStatus(campaign, CampaignStatus.ACTIVE)
                          }
                          title="Resume Campaign"
                          className="p-1.5 rounded-xl border border-slate-200 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 transition-colors cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 text-emerald-600" />
                        </button>
                      )}

                    {/* Delete / Archive Action */}
                    {onDeleteCampaign && (
                      <button
                        type="button"
                        onClick={() => onDeleteCampaign(campaign)}
                        title="Delete / Archive Campaign"
                        className="p-1.5 rounded-xl border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Message Body Excerpt */}
                <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-700 font-normal leading-relaxed border border-slate-100">
                  {campaign.subject && (
                    <div className="font-semibold text-slate-900 mb-1">
                      Subject: {campaign.subject}
                    </div>
                  )}
                  <p className="line-clamp-2 italic text-slate-600">
                    "{campaign.body}"
                  </p>
                </div>

                {/* Guardrails & Lift Snapshot Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-500 border-t border-slate-100">
                  <div className="flex flex-wrap items-center gap-3">
                    <span>
                      Type: <strong>{campaign.type.replace(/_/g, " ")}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Freq Cap: <strong>{campaign.frequencyCapDays}d</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Holdout: <strong>{campaign.holdoutPercentage}%</strong>
                    </span>
                    {campaign.coinReward && (
                      <>
                        <span>•</span>
                        <span className="text-purple-700 font-bold">
                          +{campaign.coinReward} PD
                        </span>
                      </>
                    )}
                    {campaign.discountPercentage && (
                      <>
                        <span>•</span>
                        <span className="text-emerald-700 font-bold">
                          {campaign.discountPercentage}% OFF
                        </span>
                      </>
                    )}
                  </div>

                  {/* Toggle Lift Metrics Drawer */}
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedMetricsId(
                        isMetricsExpanded ? null : campaign.id,
                      )
                    }
                    className="text-xs font-bold text-[#23055c] hover:text-purple-800 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>
                      {isMetricsExpanded
                        ? "Hide Lift Analytics"
                        : "View Lift Analytics"}
                    </span>
                  </button>
                </div>

                {/* Expanded Lift Analytics Section */}
                {isMetricsExpanded && (
                  <div className="pt-2 animate-in fade-in duration-150">
                    <CampaignLiftStats metrics={campaign.metrics?.[0]} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
