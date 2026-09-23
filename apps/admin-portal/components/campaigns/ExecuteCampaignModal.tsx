"use client";

import React, { useState } from "react";
import {
  X,
  Play,
  CheckCircle2,
  ShieldAlert,
  Moon,
  Clock,
  Coins,
  Loader2,
  AlertTriangle,
  UserCheck,
} from "lucide-react";
import { useToast } from "@daih/ui";
import { api } from "@daih/api-client";
import { CampaignDTO, CampaignType, CampaignStatus } from "@daih/types";

export interface ExecuteCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: CampaignDTO | null;
  onSuccess?: () => void;
}

export const ExecuteCampaignModal: React.FC<ExecuteCampaignModalProps> = ({
  isOpen,
  onClose,
  campaign,
  onSuccess,
}) => {
  const toast = useToast();
  const [isExecuting, setIsExecuting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [executionResult, setExecutionResult] = useState<{
    targeted: number;
    sent: number;
    holdout: number;
    deferredQuietHours: number;
    suppressedFrequencyCap: number;
    suppressedBudget: number;
  } | null>(null);

  if (!isOpen || !campaign) return null;

  const isAutomated = campaign.type !== CampaignType.CUSTOM_BROADCAST;
  const needsHumanApproval =
    campaign.aiGenerated && !campaign.aiApprovedByUserId;

  const handleApproveCopy = async () => {
    setIsApproving(true);
    try {
      await api.campaigns.approveAi(campaign.id);
      toast.success("AI copy approved! Campaign is now unlocked.");
      campaign.aiApprovedByUserId = "approved"; // local update
      onSuccess?.();
    } catch (err: any) {
      toast.error(err?.message || "Failed to approve copy");
    } finally {
      setIsApproving(false);
    }
  };

  const handleExecute = async () => {
    setIsExecuting(true);
    try {
      const res = await api.campaigns.execute(campaign.id);
      const result = (
        (res as any)?.data !== undefined ? (res as any).data : res
      ) as {
        targeted: number;
        sent: number;
        holdout: number;
        deferredQuietHours: number;
        suppressedFrequencyCap: number;
        suppressedBudget: number;
      };
      if (result) {
        setExecutionResult(result);
        toast.success(
          isAutomated
            ? "Automated preset evaluation cycle completed!"
            : "Campaign broadcast dispatched!",
        );
        onSuccess?.();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to process campaign");
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 relative my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-5 sm:p-6 pb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#23055c] flex items-center justify-center font-bold">
              <Play className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isAutomated
                  ? "Automated Preset Manual Sweep"
                  : "Send Custom Broadcast"}
              </h3>
              <p className="text-[11px] text-slate-500">
                {campaign.name} &mdash;{" "}
                {isAutomated
                  ? "Runs automatically in background"
                  : "Audience Broadcast"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs">
          {/* Human Gate Warning */}
          {needsHumanApproval && !executionResult && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 space-y-2 text-xs text-rose-900">
              <div className="flex items-center gap-2 font-bold">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>Human Approval Gate Enforced</span>
              </div>
              <p className="text-[11px] text-rose-700">
                This campaign contains AI-generated copy and has not yet
                received staff approval. Under DAIH policy, an authorized staff
                member must inspect and approve the copy before dispatch.
              </p>
              <button
                type="button"
                onClick={handleApproveCopy}
                disabled={isApproving}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {isApproving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <UserCheck className="w-3.5 h-3.5" />
                )}
                <span>Approve AI Copy Now</span>
              </button>
            </div>
          )}

          {/* Pre-Dispatch Inspection */}
          {!executionResult && (
            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5">
                <div className="font-semibold text-slate-800">
                  Campaign Preview:
                </div>
                {campaign.subject && (
                  <div className="text-slate-700">
                    <strong>Subject:</strong> {campaign.subject}
                  </div>
                )}
                <div className="text-slate-600 text-[11px] bg-white p-2.5 rounded-lg border border-slate-200 italic max-h-24 overflow-y-auto">
                  "{campaign.body}"
                </div>
              </div>

              {/* Active Guardrails */}
              <div className="bg-purple-50/70 border border-purple-100 rounded-xl p-3 space-y-1 text-[11px] text-purple-900">
                <span className="font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#23055c]" />
                  Guardrails Active on Dispatch:
                </span>
                <ul className="list-disc pl-4 space-y-0.5 text-purple-800 text-[10px]">
                  <li>
                    <strong>Quiet Hours:</strong> Messages evaluated between
                    21:00 and 08:00 WAT will be deferred to 08:05 WAT.
                  </li>
                  <li>
                    <strong>Frequency Cap:</strong> Recipients contacted within
                    the last {campaign.frequencyCapDays} days are suppressed.
                  </li>
                  <li>
                    <strong>Holdout Group:</strong> Exactly{" "}
                    {campaign.holdoutPercentage}% of recipients are isolated as
                    an uncontacted control group for lift analytics.
                  </li>
                </ul>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isExecuting}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecute}
                  disabled={isExecuting || needsHumanApproval}
                  className="px-5 py-2 rounded-xl bg-[#23055c] hover:bg-[#392271] text-white font-bold transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isExecuting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  <span>
                    {isAutomated
                      ? "Run Manual Sweep Now"
                      : "Send Broadcast Now"}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Post-Dispatch Results */}
          {executionResult && (
            <div className="space-y-4 text-xs animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <div>Campaign Dispatched Successfully!</div>
                  <div className="text-[10px] font-normal text-emerald-600">
                    Evaluation across audience completed adhering to all
                    guardrails.
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500">
                    Audience Targeted
                  </div>
                  <div className="font-bold text-slate-900 text-lg">
                    {executionResult.targeted}
                  </div>
                </div>

                <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                  <div className="text-[10px] text-emerald-700">
                    Sent Immediately
                  </div>
                  <div className="font-bold text-emerald-700 text-lg">
                    {executionResult.sent}
                  </div>
                </div>

                <div className="bg-purple-50 p-2.5 rounded-xl border border-purple-200">
                  <div className="text-[10px] text-purple-800">
                    Holdout Control
                  </div>
                  <div className="font-bold text-[#23055c] text-lg">
                    {executionResult.holdout}
                  </div>
                </div>

                <div className="bg-blue-50 p-2.5 rounded-xl border border-blue-200">
                  <div className="text-[10px] text-blue-700">
                    Quiet Hours Deferred
                  </div>
                  <div className="font-bold text-blue-700 text-lg">
                    {executionResult.deferredQuietHours}
                  </div>
                  <div className="text-[9px] text-blue-600 mt-0.5">
                    Queued for 08:05 WAT
                  </div>
                </div>

                <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                  <div className="text-[10px] text-amber-800">
                    Suppressed (Freq Cap)
                  </div>
                  <div className="font-bold text-amber-800 text-lg">
                    {executionResult.suppressedFrequencyCap}
                  </div>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500">
                    Suppressed (Budget)
                  </div>
                  <div className="font-bold text-slate-700 text-lg">
                    {executionResult.suppressedBudget}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 rounded-xl bg-[#23055c] text-white font-bold text-xs hover:bg-[#392271] transition-all cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
