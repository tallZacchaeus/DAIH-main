"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useToast } from "@daih/ui";
import { api } from "@daih/api-client";
import { BookingSummary, BookingState, FacilityResource } from "@daih/types";
import {
  Calendar,
  Clock,
  Search,
  Filter,
  Plus,
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  User,
  ChevronLeft,
  ChevronRight,
  Ban,
  Eye,
  FileText,
  Tag,
} from "lucide-react";
import { ApplyCourtesyDiscountModal } from "../../components/finance/discounts/ApplyCourtesyDiscountModal";

function formatDate(isoStr: string) {
  if (!isoStr) return "—";
  return new Date(isoStr).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(isoStr: string) {
  if (!isoStr) return "—";
  return new Date(isoStr).toLocaleTimeString("en-NG", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminBookingsPage() {
  const toast = useToast();
  const [bookings, setBookings] = useState<BookingSummary[]>([]);
  const [resources, setResources] = useState<FacilityResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  // Release Hold Modal
  const [holdToRelease, setHoldToRelease] = useState<BookingSummary | null>(
    null,
  );
  const [releaseReason, setReleaseReason] = useState("");
  const [releasingHold, setReleasingHold] = useState(false);

  // Courtesy Discount Modal
  const [courtesyBooking, setCourtesyBooking] = useState<BookingSummary | null>(
    null,
  );

  // Reschedule No-Show Modal
  const [noShowToReschedule, setNoShowToReschedule] =
    useState<BookingSummary | null>(null);
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleForm, setRescheduleForm] = useState({
    startDate: new Date().toISOString().split("T")[0],
    startTime: "09:00",
    endDate: new Date().toISOString().split("T")[0],
    endTime: "17:00",
    reason: "",
  });

  // Override Modal
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [submittingOverride, setSubmittingOverride] = useState(false);
  const [overrideForm, setOverrideForm] = useState({
    resourceId: "",
    customerEmail: "",
    startDate: new Date().toISOString().split("T")[0],
    startTime: "09:00",
    endDate: new Date().toISOString().split("T")[0],
    endTime: "17:00",
    state: "CONFIRMED",
    overrideReason: "",
    waiveFee: true,
    totalAmount: 0,
  });

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.bookings.getAdminBookings({
        state: statusFilter === "ALL" ? undefined : (statusFilter as any),
        search: searchQuery.trim() || undefined,
        page,
        limit,
      });
      const cleanBookings = ((res.bookings || []) as BookingSummary[]).filter(
        (b: BookingSummary) =>
          b.state !== BookingState.EXPIRED &&
          b.state !== BookingState.DRAFT &&
          b.state !== BookingState.HELD &&
          b.state !== BookingState.PENDING_PAYMENT,
      );
      setBookings(cleanBookings);
      setTotalCount(res.total);
    } catch (err: any) {
      toast.error(err?.message || "Failed to fetch bookings list", {
        title: "Error loading bookings",
      });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery, page, limit]);

  const fetchResources = useCallback(async () => {
    try {
      const data = await api.catalogue.getAdminResources();
      setResources(data);
      setOverrideForm((prev) => {
        if (data.length > 0 && !prev.resourceId) {
          return { ...prev, resourceId: data[0].id };
        }
        return prev;
      });
    } catch {}
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  const handleConfirmReleaseHold = async () => {
    if (!holdToRelease) return;
    setReleasingHold(true);
    try {
      await api.bookings.adminReleaseHold(
        holdToRelease.id,
        releaseReason.trim() || undefined,
      );
      toast.success(
        `Hold for reservation ${holdToRelease.reference} on ${holdToRelease.resourceName} was successfully released. Inventory returned to catalogue.`,
        {
          title: "Hold Released",
        },
      );
      setHoldToRelease(null);
      setReleaseReason("");
      await fetchBookings();
    } catch (err: any) {
      toast.error(err?.message || "Failed to release hold reservation", {
        title: "Release Failed",
      });
    } finally {
      setReleasingHold(false);
    }
  };

  const handleRescheduleNoShow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noShowToReschedule) return;

    if (!rescheduleForm.reason || rescheduleForm.reason.trim().length < 10) {
      toast.error(
        "A clear discretionary reason (minimum 10 characters) is mandatory for audit compliance.",
        {
          title: "Audit Reason Required",
        },
      );
      return;
    }

    setRescheduling(true);
    try {
      const startIso = new Date(
        `${rescheduleForm.startDate}T${rescheduleForm.startTime}:00`,
      ).toISOString();
      const endIso = new Date(
        `${rescheduleForm.endDate}T${rescheduleForm.endTime}:00`,
      ).toISOString();

      await api.bookings.rescheduleNoShow(noShowToReschedule.id, {
        newStartTime: startIso,
        newEndTime: endIso,
        reason: rescheduleForm.reason.trim(),
      });

      toast.success(
        `Reservation ${noShowToReschedule.reference} has been rescheduled and restored to CONFIRMED.`,
        {
          title: "No-Show Rescheduled",
        },
      );

      setNoShowToReschedule(null);
      setRescheduleForm({
        startDate: new Date().toISOString().split("T")[0],
        startTime: "09:00",
        endDate: new Date().toISOString().split("T")[0],
        endTime: "17:00",
        reason: "",
      });

      await fetchBookings();
    } catch (err: any) {
      toast.error(err?.message || "Failed to reschedule no-show booking", {
        title: "Reschedule Failed",
      });
    } finally {
      setRescheduling(false);
    }
  };

  const handleCreateOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !overrideForm.overrideReason ||
      overrideForm.overrideReason.trim().length < 5
    ) {
      toast.error(
        "A clear override reason (minimum 5 characters) is mandatory for audit compliance.",
        {
          title: "Reason Required",
        },
      );
      return;
    }

    if (!overrideForm.resourceId) {
      toast.error("Please select a workspace resource.", {
        title: "Resource Required",
      });
      return;
    }

    setSubmittingOverride(true);
    try {
      const startIso = new Date(
        `${overrideForm.startDate}T${overrideForm.startTime}:00`,
      ).toISOString();
      const endIso = new Date(
        `${overrideForm.endDate}T${overrideForm.endTime}:00`,
      ).toISOString();

      await api.bookings.adminOverride({
        resourceId: overrideForm.resourceId,
        customerEmail: overrideForm.customerEmail.trim() || undefined,
        startTime: startIso,
        endTime: endIso,
        state: overrideForm.state as any,
        overrideReason: overrideForm.overrideReason.trim(),
        waiveFee: overrideForm.waiveFee,
        totalAmount: overrideForm.waiveFee
          ? 0
          : Number(overrideForm.totalAmount),
      });

      toast.success(
        "VIP / Manual Reservation created and logged to Audit Trail.",
        {
          title: "Override Created",
        },
      );

      setOverrideModalOpen(false);
      setOverrideForm({
        resourceId: resources[0]?.id || "",
        customerEmail: "",
        startDate: new Date().toISOString().split("T")[0],
        startTime: "09:00",
        endDate: new Date().toISOString().split("T")[0],
        endTime: "17:00",
        state: "CONFIRMED",
        overrideReason: "",
        waiveFee: true,
        totalAmount: 0,
      });

      await fetchBookings();
    } catch (err: any) {
      toast.error(err?.message || "Failed to execute booking override", {
        title: "Override Failed",
      });
    } finally {
      setSubmittingOverride(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Booking Engine Operations
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time reservations console, occupancy tracking, and VIP manual
            overrides.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchBookings}
            className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition-all shadow-2xs cursor-pointer"
            title="Refresh Bookings"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setOverrideModalOpen(true)}
            className="bg-[#23055c] hover:bg-[#392271] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Manual VIP Override</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-4 justify-between items-center">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search reference, customer, or space..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-[#23055c] outline-none transition-all"
          />
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {["ALL", "ACTIVE", "CONFIRMED", "COMPLETED", "NO_SHOW"].map((st) => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === st
                  ? "bg-[#23055c] text-white shadow-2xs"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60"
              }`}
            >
              {st === "ACTIVE" ? "ACTIVE" : st.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-24 text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#23055c] mx-auto" />
            <p className="text-xs text-slate-500 font-semibold">
              Loading booking reservations...
            </p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <FileText className="h-8 w-8 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">
              No bookings match your current filter
            </p>
            <p className="text-xs text-slate-400">
              Try changing status filter or clearing search.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Reference</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Space Resource</th>
                  <th className="py-3.5 px-4">Time Window</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {bookings.map((b) => {
                  const isHeld =
                    b.state === BookingState.HELD ||
                    b.state === BookingState.PENDING_PAYMENT;

                  return (
                    <tr
                      key={b.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-[#23055c]">
                        {b.reference}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">
                          {b.customerName}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {b.customerEmail || "—"}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800">
                          {b.resourceName}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          {b.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div>
                          {formatDate(b.startTime)} &mdash;{" "}
                          {formatDate(b.endTime)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {formatTime(b.startTime)} - {formatTime(b.endTime)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {b.currency} {Number(b.amount).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4">
                        {b.state === BookingState.CONFIRMED &&
                          (() => {
                            const now = new Date();
                            const isPeriodActive =
                              new Date(b.startTime) <= now &&
                              new Date(b.endTime) >= now;
                            if (isPeriodActive) {
                              return (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-md border border-emerald-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  ACTIVE
                                </span>
                              );
                            }
                            return (
                              <span className="px-2 py-0.5 bg-purple-50 text-[#23055c] text-[10px] font-bold rounded-md border border-purple-200">
                                CONFIRMED
                              </span>
                            );
                          })()}
                        {b.state === BookingState.CHECKED_IN && (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-md border border-blue-200">
                            CHECKED IN
                          </span>
                        )}
                        {b.state === BookingState.NO_SHOW && (
                          <span className="px-2 py-0.5 bg-rose-50 text-rose-700 text-[10px] font-bold rounded-md border border-rose-200">
                            NO SHOW
                          </span>
                        )}
                        {b.state === BookingState.CANCELLED && (
                          <span className="px-2 py-0.5 bg-rose-50 text-rose-700 text-[10px] font-bold rounded-md border border-rose-200">
                            CANCELLED
                          </span>
                        )}
                        {b.state === BookingState.COMPLETED && (
                          <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-[10px] font-bold rounded-md border border-purple-200">
                            COMPLETED
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {isHeld && (
                          <>
                            <button
                              onClick={() => setCourtesyBooking(b)}
                              className="px-2.5 py-1 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg text-[11px] font-bold transition-colors cursor-pointer mr-1.5"
                            >
                              Courtesy Discount
                            </button>
                            <button
                              onClick={() => setHoldToRelease(b)}
                              className="px-2.5 py-1 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                            >
                              Release Hold
                            </button>
                          </>
                        )}
                        {b.state === BookingState.NO_SHOW && (
                          <button
                            onClick={() => {
                              setNoShowToReschedule(b);
                              setRescheduleForm({
                                startDate: new Date()
                                  .toISOString()
                                  .split("T")[0],
                                startTime: "09:00",
                                endDate: new Date().toISOString().split("T")[0],
                                endTime: "17:00",
                                reason: "",
                              });
                            }}
                            className="px-2.5 py-1 text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                          >
                            Reschedule
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing{" "}
            <span className="font-bold text-slate-800">{bookings.length}</span>{" "}
            of <span className="font-bold text-slate-800">{totalCount}</span>{" "}
            reservations
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-semibold text-slate-700">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Release Hold Confirmation Modal */}
      {holdToRelease && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <h3 className="text-base font-bold text-slate-900">
                  Force Release Active Hold
                </h3>
                <p className="text-xs text-slate-500">
                  Are you sure you want to release the hold for reservation{" "}
                  <span className="font-mono font-bold text-[#23055c]">
                    {holdToRelease.reference}
                  </span>
                  ?
                </p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span className="text-slate-400">Space Resource:</span>
                <span className="font-semibold text-slate-800">
                  {holdToRelease.resourceName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Customer:</span>
                <span className="font-semibold text-slate-800">
                  {holdToRelease.customerName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Time Window:</span>
                <span className="font-semibold text-slate-800">
                  {formatTime(holdToRelease.startTime)} -{" "}
                  {formatTime(holdToRelease.endTime)}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Release Reason / Audit Note (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Customer cancelled via phone / inventory reallocation"
                value={releaseReason}
                onChange={(e) => setReleaseReason(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-slate-50 font-medium outline-none focus:bg-white focus:border-[#23055c]"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setHoldToRelease(null)}
                disabled={releasingHold}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 text-xs transition-colors cursor-pointer"
              >
                Keep Hold
              </button>
              <button
                type="button"
                onClick={handleConfirmReleaseHold}
                disabled={releasingHold}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                {releasingHold ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                <span>Confirm & Release</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Override Modal */}
      {overrideModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#23055c]/10 flex items-center justify-center text-[#23055c]">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Admin Manual Override
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Force reserve workspace with mandatory audit trail log
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOverrideModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateOverride} className="space-y-4 text-xs">
              {/* Space Selection */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Workspace Resource <span className="text-rose-500">*</span>
                </label>
                <select
                  value={overrideForm.resourceId}
                  onChange={(e) =>
                    setOverrideForm({
                      ...overrideForm,
                      resourceId: e.target.value,
                    })
                  }
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 font-medium outline-none focus:bg-white focus:border-[#23055c]"
                  required
                >
                  {resources.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.category}) &mdash; Cap: {r.capacity}
                    </option>
                  ))}
                </select>
              </div>

              {/* Customer Email */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Customer Email (Optional &mdash; leave empty for Walk-In /
                  VIP)
                </label>
                <input
                  type="email"
                  placeholder="customer@example.com"
                  value={overrideForm.customerEmail}
                  onChange={(e) =>
                    setOverrideForm({
                      ...overrideForm,
                      customerEmail: e.target.value,
                    })
                  }
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 font-medium outline-none focus:bg-white focus:border-[#23055c]"
                />
              </div>

              {/* Start & End Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={overrideForm.startDate}
                    onChange={(e) =>
                      setOverrideForm({
                        ...overrideForm,
                        startDate: e.target.value,
                      })
                    }
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 font-medium outline-none focus:bg-white focus:border-[#23055c]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={overrideForm.endDate}
                    onChange={(e) =>
                      setOverrideForm({
                        ...overrideForm,
                        endDate: e.target.value,
                      })
                    }
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 font-medium outline-none focus:bg-white focus:border-[#23055c]"
                    required
                  />
                </div>
              </div>

              {/* Mandatory Reason */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Mandatory Audit Override Reason{" "}
                  <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. VIP Government Delegation Booking approved by Facilities Director"
                  value={overrideForm.overrideReason}
                  onChange={(e) =>
                    setOverrideForm({
                      ...overrideForm,
                      overrideReason: e.target.value,
                    })
                  }
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 font-medium outline-none focus:bg-white focus:border-[#23055c]"
                  required
                />
                <span className="text-[10px] text-slate-400">
                  This note will be permanently stamped in the database
                  AuditLog.
                </span>
              </div>

              {/* Fee Waiver */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="waiveFee"
                  checked={overrideForm.waiveFee}
                  onChange={(e) =>
                    setOverrideForm({
                      ...overrideForm,
                      waiveFee: e.target.checked,
                    })
                  }
                  className="rounded border-slate-300 text-[#23055c] focus:ring-[#23055c]"
                />
                <label
                  htmlFor="waiveFee"
                  className="text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  Waive fee for this reservation (VIP / Internal Operations)
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setOverrideModalOpen(false)}
                  disabled={submittingOverride}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingOverride}
                  className="flex-1 py-2.5 rounded-xl bg-[#23055c] hover:bg-[#392271] text-white font-bold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  {submittingOverride ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  <span>Execute Override</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Discretionary Reschedule for No-Show Modal */}
      {noShowToReschedule && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-800">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Reschedule Booking
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Reassign unredeemed session to a new slot with mandatory
                    audit log
                  </p>
                </div>
              </div>
              <button
                onClick={() => setNoShowToReschedule(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Booking Summary Box */}
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span className="text-slate-400">Reference:</span>
                <span className="font-mono font-bold text-[#23055c]">
                  {noShowToReschedule.reference}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Space Resource:</span>
                <span className="font-semibold text-slate-800">
                  {noShowToReschedule.resourceName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Customer:</span>
                <span className="font-semibold text-slate-800">
                  {noShowToReschedule.customerName}
                </span>
              </div>
            </div>

            <form
              onSubmit={handleRescheduleNoShow}
              className="space-y-4 text-xs"
            >
              {/* Start & End Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    New Start Date
                  </label>
                  <input
                    type="date"
                    value={rescheduleForm.startDate}
                    onChange={(e) =>
                      setRescheduleForm({
                        ...rescheduleForm,
                        startDate: e.target.value,
                      })
                    }
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 font-medium outline-none focus:bg-white focus:border-[#23055c]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    New End Date
                  </label>
                  <input
                    type="date"
                    value={rescheduleForm.endDate}
                    onChange={(e) =>
                      setRescheduleForm({
                        ...rescheduleForm,
                        endDate: e.target.value,
                      })
                    }
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 font-medium outline-none focus:bg-white focus:border-[#23055c]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={rescheduleForm.startTime}
                    onChange={(e) =>
                      setRescheduleForm({
                        ...rescheduleForm,
                        startTime: e.target.value,
                      })
                    }
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 font-medium outline-none focus:bg-white focus:border-[#23055c]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={rescheduleForm.endTime}
                    onChange={(e) =>
                      setRescheduleForm({
                        ...rescheduleForm,
                        endTime: e.target.value,
                      })
                    }
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 font-medium outline-none focus:bg-white focus:border-[#23055c]"
                    required
                  />
                </div>
              </div>

              {/* Mandatory Reason */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Mandatory Discretionary Reason{" "}
                  <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Courtesy reschedule granted by Operations Manager due to flight delay"
                  value={rescheduleForm.reason}
                  onChange={(e) =>
                    setRescheduleForm({
                      ...rescheduleForm,
                      reason: e.target.value,
                    })
                  }
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 font-medium outline-none focus:bg-white focus:border-[#23055c]"
                  required
                />
                <span className="text-[10px] text-slate-400">
                  Minimum 10 characters. This reason will be stamped in the
                  permanent AuditLog.
                </span>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setNoShowToReschedule(null)}
                  disabled={rescheduling}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rescheduling}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  {rescheduling ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  <span>Confirm Reschedule</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Courtesy Discount Modal */}
      {courtesyBooking && (
        <ApplyCourtesyDiscountModal
          isOpen={Boolean(courtesyBooking)}
          onClose={() => setCourtesyBooking(null)}
          bookingId={courtesyBooking.id}
          bookingReference={courtesyBooking.reference}
          customerName={courtesyBooking.customerName}
          resourceName={courtesyBooking.resourceName}
          baseAmount={courtesyBooking.originalAmount || courtesyBooking.amount}
          bookingState={courtesyBooking.state}
          onSuccess={() => {
            fetchBookings();
            setCourtesyBooking(null);
          }}
        />
      )}
    </div>
  );
}
