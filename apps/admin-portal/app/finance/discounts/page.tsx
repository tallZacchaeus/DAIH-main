"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Tag,
  Plus,
  Search,
  RotateCw,
  Percent,
  Check,
  ShieldCheck,
  Building,
  Users,
  Eye,
  Trash2,
  Copy,
  Sparkles,
} from "lucide-react";
import { useToast } from "@daih/ui";
import { api } from "@daih/api-client";
import { DiscountDTO, DiscountType } from "@daih/types";
import { CreateDiscountModal } from "../../../components/finance/discounts/CreateDiscountModal";
import { DiscountDetailModal } from "../../../components/finance/discounts/DiscountDetailModal";

export default function DiscountsPage() {
  const toast = useToast();
  const [discounts, setDiscounts] = useState<DiscountDTO[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "ACTIVE" | "INACTIVE" | "EXPIRED"
  >("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedDiscount, setSelectedDiscount] = useState<DiscountDTO | null>(
    null,
  );
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const isDiscountExpired = (discount: DiscountDTO) => {
    if (!discount.validUntil) return false;
    return new Date(discount.validUntil).getTime() < Date.now();
  };

  const fetchDiscounts = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await api.discounts.list({
        search: searchQuery || undefined,
        type: typeFilter !== "ALL" ? (typeFilter as DiscountType) : undefined,
        limit: 100,
      });

      setDiscounts(res.discounts || []);
      setTotalCount(res.total || 0);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load promotions", {
        title: "Load Error",
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [searchQuery, typeFilter]);

  useEffect(() => {
    fetchDiscounts();
  }, [fetchDiscounts]);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Copied code '${code}' to clipboard`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleToggleStatus = async (discount: DiscountDTO) => {
    try {
      await api.discounts.toggleStatus(discount.id, !discount.isActive);
      toast.success(
        `Promotion '${discount.name}' is now ${
          !discount.isActive ? "Active" : "Inactive"
        }.`,
      );
      fetchDiscounts();
    } catch (err: any) {
      toast.error(err?.message || "Failed to toggle discount status");
    }
  };

  const handleDelete = async (discount: DiscountDTO) => {
    if (
      !confirm(
        `Are you sure you want to delete '${discount.name}'? Existing redemptions and invoices will remain intact.`,
      )
    ) {
      return;
    }
    try {
      await api.discounts.delete(discount.id);
      toast.success(`Discount '${discount.name}' deleted.`);
      fetchDiscounts();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete discount");
    }
  };

  // Filtered list based on status tab
  const displayedDiscounts = discounts.filter((d) => {
    const expired = isDiscountExpired(d);
    if (statusFilter === "ACTIVE") {
      return d.isActive && !expired;
    }
    if (statusFilter === "INACTIVE") {
      return !d.isActive && !expired;
    }
    if (statusFilter === "EXPIRED") {
      return expired;
    }
    return true;
  });

  // Metrics
  const activeCount = discounts.filter(
    (d) => d.isActive && !isDiscountExpired(d),
  ).length;
  const expiredCount = discounts.filter((d) => isDiscountExpired(d)).length;
  const totalRedemptions = discounts.reduce(
    (acc, d) => acc + (d.currentUsageCount || 0),
    0,
  );
  const targetedCount = discounts.filter(
    (d) => !d.appliesToAll || d.customerEligibility !== "ALL",
  ).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Tag className="w-6 h-6 text-[#23055c]" />
            Discounts &amp; Promotions
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Configure coupons, workspace promotions, member perks &amp; courtesy
            overrides
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#23055c] hover:bg-[#392271] text-white font-bold text-xs shadow-sm hover:shadow transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Create Promotion
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-[#EBE7F5] shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-purple-50 text-[#23055c] border border-purple-200">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">
              Active Promotions
            </div>
            <div className="text-2xl font-extrabold text-slate-900 mt-0.5">
              {activeCount}
            </div>
            <div className="text-[11px] text-slate-400">
              {totalCount} total rules ({expiredCount} expired)
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#EBE7F5] shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">
              Total Redemptions
            </div>
            <div className="text-2xl font-extrabold text-slate-900 mt-0.5">
              {totalRedemptions}
            </div>
            <div className="text-[11px] text-slate-400">
              Across all active promos
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#EBE7F5] shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">
              Targeted Rules
            </div>
            <div className="text-2xl font-extrabold text-slate-900 mt-0.5">
              {targetedCount}
            </div>
            <div className="text-[11px] text-slate-400">
              Exclusive to spaces or cohorts
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#EBE7F5] shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">
              Financial Order
            </div>
            <div className="text-sm font-bold text-[#23055c] mt-0.5">
              Pre-Tax Discount
            </div>
            <div className="text-[11px] text-slate-400">
              Applied before VAT calculation
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="p-4 rounded-2xl bg-white border border-[#EBE7F5] shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex flex-1 items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by code, promotion title, or notes..."
              className="w-full bg-[#FAF9FF] border border-[#EBE7F5] rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#23055c] focus:ring-1 focus:ring-[#23055c] transition"
            />
          </div>

          <div className="flex items-center gap-1 border border-[#EBE7F5] rounded-xl p-1 bg-[#FAF9FF]">
            {(["ALL", "ACTIVE", "INACTIVE", "EXPIRED"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  statusFilter === st
                    ? "bg-white text-[#23055c] shadow-xs border border-[#EBE7F5]"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {st === "ALL"
                  ? "All"
                  : st === "ACTIVE"
                    ? "Active"
                    : st === "INACTIVE"
                      ? "Inactive"
                      : "Expired"}
              </button>
            ))}
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-[#FAF9FF] border border-[#EBE7F5] rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:outline-none focus:border-[#23055c] transition cursor-pointer"
          >
            <option value="ALL">All Types</option>
            <option value={DiscountType.PERCENTAGE}>Percentage (%)</option>
            <option value={DiscountType.FIXED_AMOUNT}>Fixed Amount (₦)</option>
            <option value={DiscountType.FIXED_PRICE}>
              Override Flat Rate (₦)
            </option>
          </select>
        </div>

        <button
          onClick={fetchDiscounts}
          disabled={isRefreshing}
          className="p-2 text-slate-500 hover:text-[#23055c] rounded-xl hover:bg-purple-50 transition border border-[#EBE7F5] cursor-pointer"
          title="Refresh promotions table"
        >
          <RotateCw
            className={`w-4 h-4 ${isRefreshing ? "animate-spin text-[#23055c]" : ""}`}
          />
        </button>
      </div>

      {/* Promotions Table */}
      <div className="rounded-2xl bg-white border border-[#EBE7F5] overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-16 text-center text-xs font-semibold text-slate-500">
            Loading promotion rules...
          </div>
        ) : displayedDiscounts.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <Tag className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="text-sm font-bold text-slate-700">
              No promotions found
            </div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {statusFilter === "EXPIRED"
                ? "No expired promotion rules found."
                : statusFilter === "ACTIVE"
                  ? "No active promotion rules currently running."
                  : statusFilter === "INACTIVE"
                    ? "No inactive promotion rules found."
                    : "Create your first promo code or automated discount rule to incentivize workspace bookings."}
            </p>
            {statusFilter === "ALL" && (
              <button
                onClick={() => setIsCreateOpen(true)}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#23055c] hover:bg-[#392271] text-white text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Create Rule
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#F8F9FA] text-slate-500 border-b border-[#EBE7F5] uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Promotion / Code</th>
                  <th className="py-3.5 px-4">Discount Value</th>
                  <th className="py-3.5 px-4">Targeting</th>
                  <th className="py-3.5 px-4">Redemptions</th>
                  <th className="py-3.5 px-4">Valid Window</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBE7F5] text-slate-800">
                {displayedDiscounts.map((discount) => {
                  const isExpired = isDiscountExpired(discount);
                  const usagePercent =
                    discount.maxUsageTotal && discount.maxUsageTotal > 0
                      ? Math.min(
                          100,
                          Math.round(
                            (discount.currentUsageCount /
                              discount.maxUsageTotal) *
                              100,
                          ),
                        )
                      : null;

                  return (
                    <tr
                      key={discount.id}
                      className="hover:bg-[#F8F9FA]/70 transition-colors group"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-purple-50 text-[#23055c] border border-purple-200 shrink-0">
                            <Tag className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-2">
                              <span>{discount.name}</span>
                              {discount.isAutomatic && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                  Auto
                                </span>
                              )}
                            </div>
                            {discount.code ? (
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="font-mono text-[11px] font-bold text-[#23055c] bg-[#FAF9FF] px-1.5 py-0.5 rounded border border-[#EBE7F5]">
                                  {discount.code}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(discount.code!)}
                                  className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
                                  title="Copy code"
                                >
                                  {copiedCode === discount.code ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400">
                                Applied automatically
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-slate-900">
                          {discount.type === DiscountType.PERCENTAGE
                            ? `${discount.value}% Off`
                            : discount.type === DiscountType.FIXED_AMOUNT
                              ? `₦${discount.value.toLocaleString()} Off`
                              : `Flat ₦${discount.value.toLocaleString()}`}
                        </div>
                        {discount.minOrderAmount > 0 && (
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Min: ₦{discount.minOrderAmount.toLocaleString()}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {discount.appliesToAll && (
                            <span className="px-2 py-0.5 rounded-md bg-purple-50 text-[10px] font-semibold text-[#23055c] border border-purple-200">
                              All Workspaces
                            </span>
                          )}
                          {!discount.appliesToAll &&
                            discount.targetCategories?.length > 0 && (
                              <span className="px-2 py-0.5 rounded-md bg-purple-50 text-[10px] font-semibold text-[#23055c] border border-purple-200">
                                {discount.targetCategories.join(", ")}
                              </span>
                            )}
                          {discount.customerEligibility ===
                            "FIRST_TIME_ONLY" && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-50 text-[10px] font-semibold text-amber-700 border border-amber-200">
                              First-Time Only
                            </span>
                          )}
                          {discount.customerEligibility ===
                            "SPECIFIC_CUSTOMERS" && (
                            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-[10px] font-semibold text-blue-700 border border-blue-200">
                              Member Whitelist
                            </span>
                          )}
                          {discount.customerEligibility === "DOMAIN_MATCH" && (
                            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-[10px] font-semibold text-blue-700 border border-blue-200">
                              Domain Whitelist
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono">
                        <div className="text-slate-900 font-bold text-xs">
                          {discount.currentUsageCount}{" "}
                          <span className="text-slate-400 text-[11px] font-sans font-normal">
                            / {discount.maxUsageTotal ?? "∞"}
                          </span>
                        </div>
                        {usagePercent !== null && (
                          <div className="w-20 bg-slate-100 h-1.5 rounded-full mt-1.5 overflow-hidden border border-slate-200">
                            <div
                              className="bg-[#23055c] h-full rounded-full"
                              style={{ width: `${usagePercent}%` }}
                            />
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-[11px] font-medium">
                        {discount.validUntil ? (
                          <span
                            className={
                              isExpired
                                ? "text-rose-600 font-semibold"
                                : "text-slate-500"
                            }
                          >
                            Until{" "}
                            {new Date(discount.validUntil).toLocaleDateString()}
                            {isExpired && " (Expired)"}
                          </span>
                        ) : (
                          <span className="text-slate-500">No expiration</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {isExpired ? (
                          <span
                            className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200"
                            title={`Expired on ${new Date(discount.validUntil!).toLocaleDateString()}`}
                          >
                            Expired
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(discount)}
                            className={`px-3 py-1 rounded-full text-[10px] font-bold transition border cursor-pointer ${
                              discount.isActive
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                            }`}
                          >
                            {discount.isActive ? "Active" : "Inactive"}
                          </button>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Details Eye Action */}
                          <button
                            type="button"
                            onClick={() => setSelectedDiscount(discount)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#23055c] bg-purple-50 hover:bg-[#23055c] hover:text-white border border-purple-200 rounded-lg transition-all cursor-pointer whitespace-nowrap"
                            title="View Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Details</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(discount)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                            title="Delete Discount Rule"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Promotion Rule Modal */}
      <CreateDiscountModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={() => fetchDiscounts()}
      />

      {/* Promotion Details & Redemption Audit Modal */}
      <DiscountDetailModal
        isOpen={Boolean(selectedDiscount)}
        onClose={() => setSelectedDiscount(null)}
        discount={selectedDiscount}
        onStatusChanged={() => fetchDiscounts()}
      />
    </div>
  );
}
