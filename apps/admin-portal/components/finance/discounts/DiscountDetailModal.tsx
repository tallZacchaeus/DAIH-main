"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Tag,
  Building,
  Users,
  Copy,
  Check,
  RotateCw,
  ShieldCheck,
  Clock,
} from "lucide-react";
import { useToast } from "@daih/ui";
import { api } from "@daih/api-client";
import {
  DiscountDTO,
  DiscountRedemptionDTO,
  DiscountType,
  DiscountSource,
  RedemptionStatus,
} from "@daih/types";

export interface DiscountDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  discount: DiscountDTO | null;
  onStatusChanged?: () => void;
}

export const DiscountDetailModal: React.FC<DiscountDetailModalProps> = ({
  isOpen,
  onClose,
  discount,
  onStatusChanged,
}) => {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [redemptions, setRedemptions] = useState<DiscountRedemptionDTO[]>([]);
  const [totalRedemptions, setTotalRedemptions] = useState(0);
  const [isLoadingRedemptions, setIsLoadingRedemptions] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    if (isOpen && discount) {
      loadRedemptions();
    }
  }, [isOpen, discount?.id]);

  if (!isOpen || !discount) return null;

  const loadRedemptions = async () => {
    setIsLoadingRedemptions(true);
    try {
      const res = await api.discounts.getRedemptions(discount.id);
      setRedemptions(res.redemptions || []);
      setTotalRedemptions(res.total || 0);
    } catch (err: any) {
      console.warn("Could not load redemptions:", err?.message);
    } finally {
      setIsLoadingRedemptions(false);
    }
  };

  const handleCopyCode = () => {
    if (discount.code) {
      navigator.clipboard.writeText(discount.code);
      setCopied(true);
      toast.success(`Copied promo code '${discount.code}' to clipboard`);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleToggleStatus = async () => {
    setIsToggling(true);
    try {
      await api.discounts.toggleStatus(discount.id, !discount.isActive);
      toast.success(
        `Promotion '${discount.name}' is now ${
          !discount.isActive ? "Active" : "Inactive"
        }.`,
      );
      if (onStatusChanged) onStatusChanged();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update status");
    } finally {
      setIsToggling(false);
    }
  };

  const usagePercent =
    discount.maxUsageTotal && discount.maxUsageTotal > 0
      ? Math.min(
          100,
          Math.round(
            (discount.currentUsageCount / discount.maxUsageTotal) * 100,
          ),
        )
      : null;

  const isExpired = Boolean(
    discount.validUntil && new Date(discount.validUntil).getTime() < Date.now(),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-2xl bg-white border border-[#EBE7F5] shadow-xl text-slate-800 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#EBE7F5] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200 text-[#23055c]">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  {discount.name}
                </h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    isExpired
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : discount.isActive
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-slate-100 text-slate-500 border-slate-200"
                  }`}
                >
                  {isExpired
                    ? "Expired"
                    : discount.isActive
                      ? "Active"
                      : "Inactive"}
                </span>
                {discount.isAutomatic && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    Automatic Rule
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                {discount.description || "No description provided"}
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

        {/* Details Grid */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Expired Alert Banner */}
          {isExpired && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5">
              <Clock className="w-4 h-4 shrink-0 text-rose-600" />
              <div>
                <span className="font-bold">Promotion Expired:</span> This
                promotion ended on{" "}
                {new Date(discount.validUntil!).toLocaleDateString()} at{" "}
                {new Date(discount.validUntil!).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                . It can no longer be applied to customer bookings.
              </div>
            </div>
          )}

          {/* Key Metric Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="p-3.5 bg-[#FAF9FF] border border-[#EBE7F5] rounded-xl">
              <div className="text-[11px] font-semibold text-slate-400">
                Promo Code
              </div>
              {discount.code ? (
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="font-mono font-bold text-[#23055c] text-sm">
                    {discount.code}
                  </span>
                  <button
                    onClick={handleCopyCode}
                    className="text-slate-400 hover:text-slate-700 p-1 rounded transition cursor-pointer"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              ) : (
                <span className="text-slate-400 text-xs mt-1 block">
                  None (Auto)
                </span>
              )}
            </div>

            <div className="p-3.5 bg-[#FAF9FF] border border-[#EBE7F5] rounded-xl">
              <div className="text-[11px] font-semibold text-slate-400">
                Discount Value
              </div>
              <div className="text-slate-900 font-extrabold text-sm mt-1">
                {discount.type === DiscountType.PERCENTAGE
                  ? `${discount.value}% Off`
                  : discount.type === DiscountType.FIXED_AMOUNT
                    ? `₦${discount.value.toLocaleString()} Off`
                    : `Flat ₦${discount.value.toLocaleString()}`}
              </div>
              {discount.maxDiscountAmount && (
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Max ₦{discount.maxDiscountAmount.toLocaleString()}
                </div>
              )}
            </div>

            <div className="p-3.5 bg-[#FAF9FF] border border-[#EBE7F5] rounded-xl">
              <div className="text-[11px] font-semibold text-slate-400">
                Redemptions Used
              </div>
              <div className="text-slate-900 font-extrabold text-sm mt-1">
                {discount.currentUsageCount}{" "}
                <span className="text-slate-400 text-xs font-normal">
                  / {discount.maxUsageTotal ? discount.maxUsageTotal : "∞"}
                </span>
              </div>
              {usagePercent !== null && (
                <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-[#23055c] h-full rounded-full"
                    style={{ width: `${usagePercent}%` }}
                  />
                </div>
              )}
            </div>

            <div className="p-3.5 bg-[#FAF9FF] border border-[#EBE7F5] rounded-xl">
              <div className="text-[11px] font-semibold text-slate-400">
                Per-User Limit
              </div>
              <div className="text-slate-900 font-extrabold text-sm mt-1">
                {discount.maxUsagePerUser} per member
              </div>
              {discount.minOrderAmount > 0 && (
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Min ₦{discount.minOrderAmount.toLocaleString()}
                </div>
              )}
            </div>

            <div className="p-3.5 bg-[#FAF9FF] border border-[#EBE7F5] rounded-xl">
              <div className="text-[11px] font-semibold text-slate-400">
                Validity Window
              </div>
              <div
                className={`text-xs font-bold mt-1 ${
                  isExpired ? "text-rose-600" : "text-slate-900"
                }`}
              >
                {discount.validUntil ? (
                  <>
                    Ends {new Date(discount.validUntil).toLocaleDateString()}
                    {isExpired && " (Expired)"}
                  </>
                ) : (
                  "No Expiration"
                )}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                From {new Date(discount.validFrom).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Targeting Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-[#FAF9FF] border border-[#EBE7F5] rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <Building className="w-4 h-4 text-[#23055c]" />
                Workspace Targeting
              </div>
              <div className="text-xs text-slate-700">
                {discount.appliesToAll ? (
                  <span className="text-slate-500 font-medium">
                    Applies to all workspaces &amp; categories
                  </span>
                ) : (
                  <div className="space-y-1.5">
                    {discount.targetCategories &&
                      discount.targetCategories.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {discount.targetCategories.map((c) => (
                            <span
                              key={c}
                              className="px-2 py-0.5 rounded-md bg-white text-[10px] font-semibold text-[#23055c] border border-purple-200"
                            >
                              {c.replace(/_/g, " ")}
                            </span>
                          ))}
                        </div>
                      )}
                    {discount.targetResources &&
                      discount.targetResources.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {discount.targetResources.map((r) => (
                            <span
                              key={r.id}
                              className="px-2 py-0.5 rounded-md bg-white text-[10px] font-semibold text-[#23055c] border border-purple-200"
                            >
                              {r.resourceName || "Specific Space"}
                            </span>
                          ))}
                        </div>
                      )}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-[#FAF9FF] border border-[#EBE7F5] rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <Users className="w-4 h-4 text-[#23055c]" />
                Customer Eligibility
              </div>
              <div className="text-xs text-slate-700">
                {discount.customerEligibility === "ALL" && (
                  <span className="text-slate-500 font-medium">
                    Open to all registered members
                  </span>
                )}
                {discount.customerEligibility === "FIRST_TIME_ONLY" && (
                  <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Strictly first-time bookers only
                  </span>
                )}
                {discount.customerEligibility === "DOMAIN_MATCH" && (
                  <div className="space-y-1">
                    <span className="text-slate-500 block text-[11px]">
                      Restricted to corporate domains:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {discount.targetEmailDomains.map((d) => (
                        <span
                          key={d}
                          className="px-2 py-0.5 rounded-md bg-white text-[10px] text-blue-700 border border-blue-200 font-mono font-semibold"
                        >
                          @{d}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {discount.customerEligibility === "SPECIFIC_CUSTOMERS" && (
                  <div className="space-y-1">
                    <span className="text-slate-500 block text-[11px]">
                      Designated members (
                      {discount.targetCustomers?.length || 0}):
                    </span>
                    <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                      {discount.targetCustomers?.map((c) => (
                        <span
                          key={c.id}
                          className="px-2 py-0.5 rounded-md bg-white text-[10px] text-slate-700 border border-[#EBE7F5] font-medium"
                        >
                          {c.customerName ||
                            c.customerEmail ||
                            "Whitelisted Member"}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Redemption Audit Log Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#23055c]" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Immutable Redemption Audit Trail ({totalRedemptions})
                </h3>
              </div>
              <button
                type="button"
                onClick={loadRedemptions}
                className="text-xs text-slate-500 hover:text-[#23055c] flex items-center gap-1 font-semibold cursor-pointer"
              >
                <RotateCw className="w-3 h-3" /> Refresh
              </button>
            </div>

            {isLoadingRedemptions ? (
              <div className="p-8 text-center text-xs font-semibold text-slate-500 bg-[#FAF9FF] rounded-xl border border-[#EBE7F5]">
                Loading redemption records...
              </div>
            ) : redemptions.length === 0 ? (
              <div className="p-8 text-center text-xs font-medium text-slate-400 bg-[#FAF9FF] rounded-xl border border-[#EBE7F5]">
                No redemptions recorded for this promotion yet.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-[#EBE7F5]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#F8F9FA] text-slate-500 border-b border-[#EBE7F5] text-[11px] font-bold">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Member</th>
                      <th className="py-2.5 px-3">Booking Ref</th>
                      <th className="py-2.5 px-3">Source</th>
                      <th className="py-2.5 px-3">Saved (₦)</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EBE7F5] font-mono text-[11px]">
                    {redemptions.map((r) => (
                      <tr key={r.id} className="hover:bg-[#F8F9FA]/70">
                        <td className="py-2.5 px-3 text-slate-600 font-sans">
                          {new Date(r.heldAt).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 font-sans">
                          <div className="text-slate-900 font-bold">
                            {r.customerName || "Customer"}
                          </div>
                          <div className="text-slate-400 text-[10px]">
                            {r.customerEmail}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-[#23055c] font-bold">
                          {r.bookingReference || "—"}
                        </td>
                        <td className="py-2.5 px-3 font-sans">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              r.source === DiscountSource.STAFF_OVERRIDE
                                ? "bg-amber-50 text-amber-800 border border-amber-200"
                                : r.source === DiscountSource.AUTOMATIC
                                  ? "bg-blue-50 text-blue-800 border border-blue-200"
                                  : "bg-purple-50 text-[#23055c] border border-purple-200"
                            }`}
                          >
                            {r.source === DiscountSource.STAFF_OVERRIDE
                              ? "Staff Override"
                              : r.source}
                          </span>
                          {r.appliedByStaffName && (
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              by {r.appliedByStaffName}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-emerald-700 font-bold">
                          -₦{r.discountAmount.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 font-sans">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              r.status === RedemptionStatus.APPLIED
                                ? "text-emerald-700 bg-emerald-50 border border-emerald-200"
                                : r.status === RedemptionStatus.HELD
                                  ? "text-amber-700 bg-amber-50 border border-amber-200"
                                  : "text-slate-500 bg-slate-100 border border-slate-200"
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-[#EBE7F5] px-6 py-4 bg-[#FAF9FF] rounded-b-2xl">
          {isExpired ? (
            <div className="text-xs text-rose-600 font-semibold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>
                Promotion ended on{" "}
                {new Date(discount.validUntil!).toLocaleDateString()}
              </span>
            </div>
          ) : (
            <button
              type="button"
              disabled={isToggling}
              onClick={handleToggleStatus}
              className={`px-4 py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${
                discount.isActive
                  ? "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100"
                  : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
              }`}
            >
              {discount.isActive
                ? "Deactivate Promotion"
                : "Activate Promotion"}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-[#EBE7F5] rounded-xl hover:bg-slate-50 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
