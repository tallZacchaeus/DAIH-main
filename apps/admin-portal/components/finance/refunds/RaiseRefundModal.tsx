"use client";

import React, { useState, useMemo } from "react";
import {
  X,
  AlertTriangle,
  RotateCcw,
  Coins,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  FileText,
  User,
  CreditCard,
} from "lucide-react";
import { useToast } from "@daih/ui";
import { api } from "@daih/api-client";
import { RefundReasonCode, RaiseRefundRequestDTO } from "@daih/types";

export interface RaiseRefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  preselectedBooking?: {
    id: string;
    reference: string;
    customerName?: string;
    customerEmail?: string;
    totalAmount?: number;
    coinsRedeemed?: number;
    coinsEarned?: number;
    referrerBonus?: number;
  };
}

export const RaiseRefundModal: React.FC<RaiseRefundModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  preselectedBooking,
}) => {
  const toast = useToast();
  const [bookingId, setBookingId] = useState(preselectedBooking?.id || "");
  const [reasonCode, setReasonCode] = useState<RefundReasonCode>(
    RefundReasonCode.FACILITY_ISSUE,
  );
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (preselectedBooking?.id) {
      setBookingId(preselectedBooking.id);
    }
  }, [preselectedBooking]);

  const minChars = 20;
  const charsCount = reason.trim().length;
  const isReasonValid = charsCount >= minChars;

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingId.trim()) {
      toast.error("Please provide a valid Booking ID");
      return;
    }
    if (!isReasonValid) {
      toast.error(`Justification must be at least ${minChars} characters.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: RaiseRefundRequestDTO = {
        bookingId: bookingId.trim(),
        reasonCode,
        reason: reason.trim(),
      };
      await api.payments.raiseRefund(payload);
      toast.success(
        "Refund request submitted successfully! Awaiting Finance Officer review.",
      );
      onSuccess?.();
      onClose();
      // Reset
      setReason("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit refund request");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 relative my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#23055c] flex items-center justify-center font-bold">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Raise Refund Request
              </h3>
              <p className="text-[11px] text-slate-500">
                Operations Manager Initiation &mdash; Finance Dual-Authorization
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

        {/* Dual-Authorization Info Banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-800">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold">
              Dual-Authorization & Segregation of Duties
            </p>
            <p className="text-[11px] text-amber-700">
              Only the Finance Officer or Super Admin can approve and disburse
              this refund. You cannot approve a request you raise.
            </p>
          </div>
        </div>

        {/* Preselected Booking Details Card */}
        {preselectedBooking && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs space-y-2">
            <div className="flex items-center justify-between font-mono font-bold text-slate-800">
              <span>Booking #{preselectedBooking.reference}</span>
              <span className="text-[#23055c] font-sans font-bold">
                ₦{Number(preselectedBooking.totalAmount || 0).toLocaleString()}
              </span>
            </div>
            {preselectedBooking.customerName && (
              <div className="flex items-center gap-1.5 text-slate-600 text-[11px]">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {preselectedBooking.customerName} (
                  {preselectedBooking.customerEmail})
                </span>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Booking ID (if not preselected) */}
          {!preselectedBooking && (
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Booking ID <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={bookingId}
                onChange={(e) => setBookingId(e.target.value)}
                placeholder="UUID of confirmed booking"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 font-mono outline-none focus:bg-white focus:border-[#23055c]"
                required
              />
            </div>
          )}

          {/* Reason Code */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              Reason Category <span className="text-rose-500">*</span>
            </label>
            <select
              value={reasonCode}
              onChange={(e) =>
                setReasonCode(e.target.value as RefundReasonCode)
              }
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 font-medium outline-none focus:bg-white focus:border-[#23055c]"
              required
            >
              <option value={RefundReasonCode.FACILITY_ISSUE}>
                Facility Issue (AC failure, power outage, maintenance)
              </option>
              <option value={RefundReasonCode.SERVICE_FAILURE}>
                Service Failure (unmet booking expectations)
              </option>
              <option value={RefundReasonCode.DUPLICATE_PAYMENT}>
                Duplicate Payment (customer charged twice)
              </option>
              <option value={RefundReasonCode.UNAVAILABLE_RESOURCE}>
                Unavailable Resource (double-booked / emergency maintenance)
              </option>
              <option value={RefundReasonCode.CUSTOMER_DISPUTE}>
                Customer Dispute (grace period exception)
              </option>
              <option value={RefundReasonCode.OTHER}>
                Other (exceptional management approval)
              </option>
            </select>
          </div>

          {/* Staff Justification / Reason */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold text-slate-700 uppercase">
                Staff Justification & Audit Note{" "}
                <span className="text-rose-500">*</span>
              </label>
              <span
                className={`text-[10px] font-mono font-bold ${
                  isReasonValid ? "text-emerald-600" : "text-rose-500"
                }`}
              >
                {charsCount} / {minChars} min chars
              </span>
            </div>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide a thorough justification explaining why this booking qualifies for an exceptional refund (minimum 20 characters)..."
              className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 font-normal outline-none focus:bg-white focus:border-[#23055c] resize-none"
              required
            />
          </div>

          {/* Automated Loyalty & Paystack Impact Notice */}
          <div className="bg-purple-50/70 border border-purple-100 rounded-xl p-3.5 space-y-2 text-[11px]">
            <div className="font-bold text-[#23055c] flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5" />
              <span>Automated Reversal & Clawback Actions Upon Approval:</span>
            </div>
            <ul className="list-disc pl-4 space-y-1 text-slate-600">
              <li>
                <strong>Paystack Gateway:</strong> Direct fiat refund credited
                to customer's source account.
              </li>
              <li>
                <strong>Redeemed Coins Reversal:</strong> Any PeeDee Coins spent
                by the customer on this booking will be refunded back to their
                coin wallet.
              </li>
              <li>
                <strong>Loyalty Coin Clawback:</strong> Any PeeDee Coins awarded
                for this booking will be deducted from the customer's wallet.
              </li>
              <li>
                <strong>Referral Bonus Clawback:</strong> Any referral bonus
                coins awarded to the referrer will be clawed back automatically.
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
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
              disabled={isSubmitting || !isReasonValid}
              className="px-5 py-2.5 rounded-xl bg-[#23055c] hover:bg-[#392271] text-white font-bold transition-all flex items-center gap-2 shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Submit Refund Request</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
