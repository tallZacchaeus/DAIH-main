"use client";

import React, { useState } from "react";
import { X, XCircle, Loader2 } from "lucide-react";
import { useToast } from "@daih/ui";
import { api } from "@daih/api-client";

export interface RejectRefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  refundId: string;
  bookingRef?: string;
  onSuccess?: () => void;
}

export const RejectRefundModal: React.FC<RejectRefundModalProps> = ({
  isOpen,
  onClose,
  refundId,
  bookingRef,
  onSuccess,
}) => {
  const toast = useToast();
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const minChars = 10;
  const isValid = rejectionReason.trim().length >= minChars;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) {
      toast.error(`Rejection reason must be at least ${minChars} characters.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await api.payments.rejectRefund(refundId, rejectionReason.trim());
      toast.success("Refund request has been rejected.");
      onSuccess?.();
      onClose();
      setRejectionReason("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to reject refund request");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 relative">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Reject Refund Request
              </h3>
              <p className="text-[11px] text-slate-500">
                Decline request {bookingRef ? `(#${bookingRef})` : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              Rejection Reason & Audit Justification{" "}
              <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="State clear financial or policy reasons why this refund cannot be authorized (minimum 10 characters)..."
              className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 font-normal outline-none focus:bg-white focus:border-[#23055c] resize-none"
              required
            />
            <div className="text-right text-[10px] text-slate-400 mt-1">
              {rejectionReason.trim().length} / {minChars} min chars
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !isValid}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-all flex items-center gap-2 shadow-xs disabled:opacity-40 cursor-pointer"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Confirm Rejection</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
