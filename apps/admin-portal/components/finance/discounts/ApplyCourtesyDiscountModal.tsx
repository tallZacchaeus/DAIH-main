"use client";

import React, { useState, useMemo } from "react";
import {
  X,
  ShieldCheck,
  AlertTriangle,
  Percent,
  CheckCircle2,
  Loader2,
  FileText,
} from "lucide-react";
import { useToast } from "@daih/ui";
import { api } from "@daih/api-client";
import { DiscountType, BookingState } from "@daih/types";

export interface ApplyCourtesyDiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  bookingReference: string;
  customerName: string;
  resourceName: string;
  baseAmount: number;
  bookingState: BookingState | string;
  onSuccess?: () => void;
}

export const ApplyCourtesyDiscountModal: React.FC<
  ApplyCourtesyDiscountModalProps
> = ({
  isOpen,
  onClose,
  bookingId,
  bookingReference,
  customerName,
  resourceName,
  baseAmount,
  bookingState,
  onSuccess,
}) => {
  const toast = useToast();
  const [type, setType] = useState<DiscountType>(DiscountType.PERCENTAGE);
  const [value, setValue] = useState<number | "">(20);
  const [waiveFee, setWaiveFee] = useState(false);
  const [justificationNote, setJustificationNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // STRICT GUARDRAIL CHECK
  const isPaymentPending =
    bookingState === BookingState.PENDING_PAYMENT ||
    bookingState === "PENDING_PAYMENT";
  const isEligibleState =
    bookingState === BookingState.DRAFT ||
    bookingState === BookingState.HELD ||
    bookingState === "DRAFT" ||
    bookingState === "HELD";

  // Pre-tax live calculation preview
  const calculation = useMemo(() => {
    if (waiveFee) {
      return {
        discountAmount: baseAmount,
        finalTotal: 0,
      };
    }

    const val = Number(value) || 0;
    let discount = 0;

    if (type === DiscountType.PERCENTAGE) {
      discount = (baseAmount * val) / 100;
    } else if (type === DiscountType.FIXED_AMOUNT) {
      discount = Math.min(baseAmount, val);
    } else if (type === DiscountType.FIXED_PRICE) {
      discount = Math.max(0, baseAmount - val);
    }

    discount = Math.min(baseAmount, Math.max(0, discount));
    discount = Math.round(discount * 100) / 100;
    const finalTotal = Math.max(0, baseAmount - discount);

    return {
      discountAmount: discount,
      finalTotal,
    };
  }, [baseAmount, type, value, waiveFee]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isPaymentPending) {
      toast.error(
        "Cannot apply courtesy discount while an active Paystack payment is pending.",
        { title: "Payment Pending Locked" },
      );
      return;
    }

    if (!isEligibleState) {
      toast.error(
        `Cannot apply courtesy discount to booking in state '${bookingState}'.`,
        { title: "Invalid Booking State" },
      );
      return;
    }

    if (!justificationNote.trim() || justificationNote.trim().length < 10) {
      toast.warning(
        "A detailed justification note of at least 10 characters is mandatory for staff audit logging.",
        { title: "Justification Required" },
      );
      return;
    }

    if (!waiveFee && (value === "" || Number(value) <= 0)) {
      toast.warning(
        "Please enter a valid discount rate or amount greater than 0.",
        {
          title: "Value Required",
        },
      );
      return;
    }

    if (!waiveFee && type === DiscountType.PERCENTAGE && Number(value) > 100) {
      toast.warning("Percentage discount cannot exceed 100%.", {
        title: "Invalid Rate",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await api.discounts.applyCourtesyDiscount(bookingId, {
        type,
        value: waiveFee ? 100 : Number(value),
        justificationNote: justificationNote.trim(),
        waiveFee,
      });

      toast.success(
        `Courtesy discount applied to booking ${bookingReference}. Saved to immutable audit log.`,
        { title: "Courtesy Override Applied" },
      );

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to apply courtesy override.", {
        title: "Override Error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl bg-white border border-[#EBE7F5] shadow-xl text-slate-900 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#EBE7F5] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200 text-[#23055c]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Staff Courtesy Override
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                Booking: {bookingReference}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Booking Summary Box */}
        <div className="p-5 bg-[#FAF9FF] border-b border-[#EBE7F5] space-y-2">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-slate-400 font-medium">Customer</div>
              <div className="font-semibold text-slate-900 truncate">
                {customerName}
              </div>
            </div>
            <div>
              <div className="text-slate-400 font-medium">Reserved Space</div>
              <div className="font-semibold text-slate-900 truncate">
                {resourceName}
              </div>
            </div>
            <div>
              <div className="text-slate-400 font-medium">
                Standard Base Rate
              </div>
              <div className="font-mono font-bold text-[#23055c]">
                ₦{baseAmount.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-slate-400 font-medium">Booking Status</div>
              <div className="font-semibold text-xs mt-0.5">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    isPaymentPending
                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                      : isEligibleState
                        ? "bg-purple-50 text-[#23055c] border border-purple-200"
                        : "bg-slate-100 text-slate-600 border border-slate-200"
                  }`}
                >
                  {bookingState}
                </span>
              </div>
            </div>
          </div>

          {/* Hard Guardrail Alert if Payment Pending */}
          {isPaymentPending && (
            <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <span className="font-bold">Payment Pending Locked:</span>{" "}
                Cannot modify discount while an active Paystack payment session
                is pending. Wait for the customer to complete checkout or for
                the payment session to expire.
              </div>
            </div>
          )}

          {!isPaymentPending && !isEligibleState && (
            <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <div>
                <span className="font-bold">Cannot Override:</span> Only
                bookings in DRAFT or initial HELD status can receive courtesy
                discounts.
              </div>
            </div>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Adjustment Type
              </label>
              <select
                disabled={isPaymentPending || !isEligibleState || waiveFee}
                value={type}
                onChange={(e) => setType(e.target.value as DiscountType)}
                className="w-full bg-white border border-[#EBE7F5] rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#23055c] transition disabled:opacity-50"
              >
                <option value={DiscountType.PERCENTAGE}>
                  Percentage (% Off)
                </option>
                <option value={DiscountType.FIXED_AMOUNT}>
                  Fixed Deduction (₦)
                </option>
                <option value={DiscountType.FIXED_PRICE}>
                  Override Flat Rate (₦)
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {type === DiscountType.PERCENTAGE
                  ? "Rate (%)"
                  : type === DiscountType.FIXED_AMOUNT
                    ? "Deduction (₦)"
                    : "New Rate (₦)"}
              </label>
              <div className="relative">
                <input
                  type="number"
                  disabled={isPaymentPending || !isEligibleState || waiveFee}
                  min={0.01}
                  max={type === DiscountType.PERCENTAGE ? 100 : undefined}
                  step={type === DiscountType.PERCENTAGE ? "0.1" : "100"}
                  value={waiveFee ? 100 : value}
                  onChange={(e) =>
                    setValue(
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                  className="w-full bg-white border border-[#EBE7F5] rounded-xl pl-8 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#23055c] transition disabled:opacity-50"
                />
                <div className="absolute left-2.5 top-2.5 text-slate-400">
                  {type === DiscountType.PERCENTAGE ? (
                    <Percent className="w-3.5 h-3.5" />
                  ) : (
                    <span className="text-[10px] font-bold">₦</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2.5 p-3 bg-[#FAF9FF] border border-[#EBE7F5] rounded-xl cursor-pointer hover:bg-purple-50/40 transition">
              <input
                type="checkbox"
                disabled={isPaymentPending || !isEligibleState}
                checked={waiveFee}
                onChange={(e) => setWaiveFee(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-[#23055c] focus:ring-[#23055c] focus:ring-offset-0 disabled:opacity-50 cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-900">
                  Full Fee Waiver (100% Courtesy)
                </span>
                <span className="text-slate-500 text-[11px] block">
                  Completely waives reservation fee (₦0 final amount)
                </span>
              </div>
            </label>
          </div>

          {/* Pre-tax Calculation Live Preview */}
          <div className="p-3.5 bg-[#FAF9FF] border border-[#EBE7F5] rounded-xl space-y-1.5 text-xs font-mono">
            <div className="flex justify-between text-slate-500">
              <span>Standard Base Rate:</span>
              <span className="text-slate-800 font-semibold">
                ₦{baseAmount.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-emerald-700">
              <span>Pre-tax Discount:</span>
              <span className="font-semibold">
                -₦{calculation.discountAmount.toLocaleString()}
              </span>
            </div>
            <div className="border-t border-[#EBE7F5] pt-1.5 flex justify-between font-bold text-slate-900 text-sm">
              <span>Adjusted Total Due:</span>
              <span className="text-[#23055c]">
                ₦{calculation.finalTotal.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Mandatory Justification Note */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Mandatory Justification Reason{" "}
                <span className="text-rose-500">*</span>
              </label>
              <span
                className={`text-[10px] ${
                  justificationNote.trim().length >= 10
                    ? "text-emerald-600 font-medium"
                    : "text-slate-400"
                }`}
              >
                {justificationNote.trim().length}/10 characters min
              </span>
            </div>
            <textarea
              disabled={isPaymentPending || !isEligibleState}
              rows={3}
              value={justificationNote}
              onChange={(e) => setJustificationNote(e.target.value)}
              placeholder="Provide clear rationale (e.g. VIP speaker courtesy approved by Facility Director; Partner executive agreement)"
              className="w-full bg-white border border-[#EBE7F5] rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#23055c] transition disabled:opacity-50"
            />
            <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
              <FileText className="w-3 h-3" />
              Recorded permanently in the immutable audit log with your Staff ID
              and timestamp.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EBE7F5]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                isSubmitting ||
                isPaymentPending ||
                !isEligibleState ||
                justificationNote.trim().length < 10
              }
              className="px-5 py-2 text-xs font-semibold text-white bg-[#23055c] hover:bg-[#392271] rounded-xl transition flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Applying Override...
                </>
              ) : (
                "Confirm Courtesy Override"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
