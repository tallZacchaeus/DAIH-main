"use client";

import React, { useState } from "react";
import {
  AdminManualAdjustmentDTO,
  CoinAdjustmentReasonCode,
} from "@daih/types";
import {
  X,
  Coins,
  PlusCircle,
  MinusCircle,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useToast } from "@daih/ui";

interface ManualAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (dto: AdminManualAdjustmentDTO) => Promise<void>;
  preselectedUserId?: string;
  preselectedUserName?: string;
}

export const ManualAdjustmentModal: React.FC<ManualAdjustmentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  preselectedUserId,
  preselectedUserName,
}) => {
  const toast = useToast();
  const [targetUserId, setTargetUserId] = useState(preselectedUserId || "");
  const [adjustmentType, setAdjustmentType] = useState<"CREDIT" | "DEBIT">(
    "CREDIT",
  );
  const [amount, setAmount] = useState<number | "">("");
  const [reasonCode, setReasonCode] = useState<CoinAdjustmentReasonCode>(
    CoinAdjustmentReasonCode.GOODWILL,
  );
  const [justification, setJustification] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    if (preselectedUserId) {
      setTargetUserId(preselectedUserId);
    }
  }, [preselectedUserId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserId.trim()) {
      toast.error("Please enter a valid target User ID");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      toast.error("Please enter an amount greater than 0");
      return;
    }
    const cleanJustification = justification.trim();
    if (cleanJustification.length < 20) {
      toast.error(
        "Justification must be at least 20 characters explaining the operational reason.",
      );
      return;
    }

    setSubmitting(true);
    try {
      const finalAmount =
        adjustmentType === "CREDIT" ? Number(amount) : -Number(amount);

      await onSubmit({
        targetUserId: targetUserId.trim(),
        amount: finalAmount,
        reasonCode,
        justification: cleanJustification,
        reason: cleanJustification,
        note: note.trim() || undefined,
      });

      toast.success(
        `Successfully ${adjustmentType === "CREDIT" ? "credited" : "deducted"} ${amount} PD Coins!`,
      );
      onClose();
      // Reset form
      setAmount("");
      setJustification("");
      setNote("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to execute manual adjustment");
    } finally {
      setSubmitting(false);
    }
  };

  const justificationLen = justification.trim().length;

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-200 my-auto">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#23055c] flex items-center justify-center">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Manual Coin Adjustment
              </h3>
              <p className="text-xs text-slate-500">
                Finance discretionary credit or debit with 6 mandatory
                guardrails
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col flex-1 min-h-0 overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
            {/* Target Customer */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Target Customer User ID <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                className="w-full px-3.5 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#23055c]/20 focus:border-[#23055c]"
              />
              {preselectedUserName && (
                <span className="text-[11px] text-purple-700 font-semibold mt-1 block">
                  Adjusting for: {preselectedUserName}
                </span>
              )}
            </div>

            {/* Action Type: Credit vs Debit */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Adjustment Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAdjustmentType("CREDIT")}
                  className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs transition-all cursor-pointer ${
                    adjustmentType === "CREDIT"
                      ? "border-emerald-500 bg-emerald-50/50 text-emerald-800 ring-1 ring-emerald-500"
                      : "border-slate-200 hover:bg-slate-50 text-slate-600"
                  }`}
                >
                  <PlusCircle className="w-4 h-4 text-emerald-600" />
                  <span>Credit (+) Coins</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAdjustmentType("DEBIT")}
                  className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs transition-all cursor-pointer ${
                    adjustmentType === "DEBIT"
                      ? "border-amber-500 bg-amber-50/50 text-amber-800 ring-1 ring-amber-500"
                      : "border-slate-200 hover:bg-slate-50 text-slate-600"
                  }`}
                >
                  <MinusCircle className="w-4 h-4 text-amber-600" />
                  <span>Debit (-) Coins</span>
                </button>
              </div>
            </div>

            {/* Coin Amount */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Amount (PD Coins) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  required
                  min="1"
                  step="1"
                  value={amount}
                  onChange={(e) =>
                    setAmount(e.target.value ? Number(e.target.value) : "")
                  }
                  placeholder="e.g. 500"
                  className="w-full px-3.5 py-2 text-sm font-bold bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#23055c]/20 focus:border-[#23055c]"
                />
                <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs font-bold text-slate-400">
                  PDC
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Per-tx limit: 5,000 PD (SUPER_ADMIN required above). Daily
                limit: 20,000 PD.
              </p>
            </div>

            {/* Reason Code (Enum) */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Reason Code <span className="text-rose-500">*</span>
              </label>
              <select
                value={reasonCode}
                onChange={(e) =>
                  setReasonCode(e.target.value as CoinAdjustmentReasonCode)
                }
                className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#23055c]/20 focus:border-[#23055c]"
              >
                <option value={CoinAdjustmentReasonCode.GOODWILL}>
                  GOODWILL &mdash; Customer Goodwill & Retention
                </option>
                <option value={CoinAdjustmentReasonCode.SYSTEM_ERROR}>
                  SYSTEM_ERROR &mdash; System / Billing Error Compensation
                </option>
                <option value={CoinAdjustmentReasonCode.DISPUTE_RESOLUTION}>
                  DISPUTE_RESOLUTION &mdash; Coin Balance Dispute Resolution
                </option>
                <option value={CoinAdjustmentReasonCode.PROMOTIONAL}>
                  PROMOTIONAL &mdash; Approved Promotional Grant
                </option>
                <option value={CoinAdjustmentReasonCode.CORRECTION}>
                  CORRECTION &mdash; Ledger Correction
                </option>
              </select>
            </div>

            {/* Justification (Min 20 Chars) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Justification <span className="text-rose-500">*</span>
                </label>
                <span
                  className={`text-[10px] font-mono font-bold ${
                    justificationLen >= 20
                      ? "text-emerald-600"
                      : "text-rose-500"
                  }`}
                >
                  {justificationLen}/20 min chars
                </span>
              </div>
              <textarea
                rows={2}
                required
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="e.g. Courtesy compensation for meeting room AC downtime during client workshop..."
                className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#23055c]/20 focus:border-[#23055c]"
              />
            </div>

            {/* Staff Note */}
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Internal Staff Note (Optional)
              </label>
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Additional internal audit details..."
                className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#23055c]/20 focus:border-[#23055c]"
              />
            </div>

            <div className="p-3 bg-purple-50 rounded-xl border border-purple-200/60 flex items-start gap-2 text-[11px] text-purple-900">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-[#23055c]" />
              <span>
                All 6 guardrails enforced: Min 20-char justification, standard
                reason code, AuditLog capture, 5k tx ceiling, 20k WAT daily
                ceiling, and self-adjustment prohibition.
              </span>
            </div>
          </div>

          {/* Sticky Footer Actions */}
          <div className="flex items-center justify-end gap-3 p-4 px-6 border-t border-slate-100 bg-slate-50/70 rounded-b-3xl shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting || justificationLen < 20}
              className="px-5 py-2 bg-[#23055c] hover:bg-[#2f136d] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>Execute Adjustment</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
