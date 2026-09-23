"use client";

import React, { useState } from "react";
import { X, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { CampaignDTO } from "@daih/types";

export interface DeleteCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: CampaignDTO | null;
  onConfirm: (campaign: CampaignDTO) => Promise<void>;
}

export const DeleteCampaignModal: React.FC<DeleteCampaignModalProps> = ({
  isOpen,
  onClose,
  campaign,
  onConfirm,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !campaign) return null;

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm(campaign);
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 relative my-auto p-5 sm:p-6 space-y-4">
        {/* Header Icon & Close */}
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
            <Trash2 className="w-5 h-5" />
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-2">
          <h3 className="text-base font-bold text-slate-900">
            Delete Campaign
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Are you sure you want to delete{" "}
            <strong className="text-slate-900 font-semibold">
              "{campaign.name}"
            </strong>
            ? If past executions exist, it will be safely archived to preserve
            metrics.
          </p>
        </div>

        <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3 flex items-start gap-2 text-[11px] text-amber-900 leading-snug">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            Active automations will stop immediately. Historical conversion lift
            and recipient logs will remain preserved.
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {isDeleting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            <span>Confirm Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
};
