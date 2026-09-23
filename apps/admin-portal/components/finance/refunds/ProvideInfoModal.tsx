"use client";

import React, { useState } from "react";
import { X, MessageSquare, Loader2, HelpCircle } from "lucide-react";
import { useToast } from "@daih/ui";
import { api } from "@daih/api-client";

export interface ProvideInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  refundId: string;
  questionPrompt?: string;
  bookingRef?: string;
  onSuccess?: () => void;
}

export const ProvideInfoModal: React.FC<ProvideInfoModalProps> = ({
  isOpen,
  onClose,
  refundId,
  questionPrompt,
  bookingRef,
  onSuccess,
}) => {
  const toast = useToast();
  const [response, setResponse] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const minChars = 5;
  const isResponseValid = response.trim().length >= minChars;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isResponseValid) {
      toast.error(`Response must be at least ${minChars} characters.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await api.payments.provideRefundInfo(refundId, response.trim());
      toast.success("Clarification provided. Finance Officer notified.");
      onSuccess?.();
      onClose();
      setResponse("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit clarification");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 relative">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Provide Clarification
              </h3>
              <p className="text-[11px] text-slate-500">
                Respond to Finance inquiry{" "}
                {bookingRef ? `(#${bookingRef})` : ""}
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

        {questionPrompt && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs space-y-1">
            <span className="font-bold text-amber-900 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-amber-700" />
              Finance Inquiry:
            </span>
            <p className="text-amber-800 italic">"{questionPrompt}"</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              Your Detailed Response <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Provide the additional facts or documentation requested by Finance..."
              className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 font-normal outline-none focus:bg-white focus:border-[#23055c] resize-none"
              required
            />
            <div className="text-right text-[10px] text-slate-400 mt-1">
              {response.trim().length} / {minChars} min chars
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
              disabled={isSubmitting || !isResponseValid}
              className="px-5 py-2.5 rounded-xl bg-[#23055c] hover:bg-[#392271] text-white font-bold transition-all flex items-center gap-2 shadow-xs disabled:opacity-40 cursor-pointer"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Submit Response</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
