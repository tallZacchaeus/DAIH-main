"use client";

import React from "react";
import { TrendingUp, Users, Target, DollarSign, Award } from "lucide-react";
import { CampaignMetricDTO } from "@daih/types";

export interface CampaignLiftStatsProps {
  metrics?: CampaignMetricDTO;
}

export const CampaignLiftStats: React.FC<CampaignLiftStatsProps> = ({
  metrics,
}) => {
  if (!metrics) {
    return (
      <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-4 text-center text-xs text-slate-400">
        No lift metrics collected yet. Execute the campaign to measure
        conversion lift against the holdout group.
      </div>
    );
  }

  const treatmentPct = (metrics.treatmentConversionRate * 100).toFixed(1);
  const holdoutPct = (metrics.holdoutConversionRate * 100).toFixed(1);
  const liftPct = (metrics.incrementalLift * 100).toFixed(1);
  const isPositiveLift = metrics.incrementalLift > 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">
              Holdout Lift Analytics
            </h4>
            <p className="text-[10px] text-slate-500">
              Treatment (contacted) vs. Control (10% holdout)
            </p>
          </div>
        </div>
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            isPositiveLift
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {isPositiveLift
            ? `+${liftPct}% Incremental Lift`
            : `${liftPct}% Lift`}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        {/* Treatment Group */}
        <div className="bg-purple-50/60 p-2.5 rounded-xl border border-purple-100">
          <div className="text-[10px] text-purple-700 font-semibold">
            Treatment Conv.
          </div>
          <div className="font-extrabold text-[#23055c] text-base mt-0.5">
            {treatmentPct}%
          </div>
          <div className="text-[9px] text-slate-400 mt-0.5">
            {metrics.treatmentConversions} / {metrics.treatmentSent} contacted
          </div>
        </div>

        {/* Holdout Group */}
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          <div className="text-[10px] text-slate-500 font-semibold">
            Holdout Conv.
          </div>
          <div className="font-extrabold text-slate-700 text-base mt-0.5">
            {holdoutPct}%
          </div>
          <div className="text-[9px] text-slate-400 mt-0.5">
            {metrics.holdoutConversions} / {metrics.holdoutCount} control
          </div>
        </div>

        {/* Incremental Lift */}
        <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100">
          <div className="text-[10px] text-emerald-700 font-semibold">
            Incremental Lift
          </div>
          <div className="font-extrabold text-emerald-700 text-base mt-0.5">
            {isPositiveLift ? `+${liftPct}%` : `${liftPct}%`}
          </div>
          <div className="text-[9px] text-emerald-600 mt-0.5">
            Attributed to campaign
          </div>
        </div>

        {/* Revenue Lift */}
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          <div className="text-[10px] text-slate-500 font-semibold">
            Revenue Lift
          </div>
          <div className="font-extrabold text-slate-900 text-base mt-0.5">
            ₦{Number(metrics.revenueLiftNgn || 0).toLocaleString()}
          </div>
          <div className="text-[9px] text-slate-400 mt-0.5">
            Net incremental fiat
          </div>
        </div>
      </div>
    </div>
  );
};
