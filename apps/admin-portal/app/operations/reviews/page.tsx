"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Star,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  RefreshCw,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  Building2,
  Calendar,
  Loader2,
  X,
  Sliders,
  AlertCircle,
} from "lucide-react";
import { api } from "@daih/api-client";
import { ReviewDTO, ReviewSettingDTO, ReviewStatus } from "@daih/types";

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<ReviewDTO[]>([]);
  const [settings, setSettings] = useState<ReviewSettingDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [updatingSettings, setUpdatingSettings] = useState<boolean>(false);

  // Filters
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedRating, setSelectedRating] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // KPIs
  const [kpis, setKpis] = useState({
    averageRating: 5.0,
    totalReviews: 0,
    pendingCount: 0,
    featuredCount: 0,
  });

  // Reply Modal State
  const [replyingReview, setReplyingReview] = useState<ReviewDTO | null>(null);
  const [replyText, setReplyText] = useState<string>("");
  const [replySubmitting, setReplySubmitting] = useState<boolean>(false);

  // Toast / Status message
  const [feedbackMessage, setFeedbackMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setFeedbackMessage({ text, type });
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  const loadData = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      else setIsRefreshing(true);

      try {
        const [settingsRes, reviewsRes] = await Promise.all([
          api.reviews.adminGetSettings(),
          api.reviews.adminList({
            status: selectedStatus as any,
            rating:
              selectedRating !== "ALL" ? Number(selectedRating) : undefined,
            search: searchQuery.trim() || undefined,
            limit: 50,
          }),
        ]);

        setSettings(settingsRes);
        setReviews(reviewsRes.reviews);
        setKpis(reviewsRes.kpis);
      } catch (err: any) {
        showToast(err?.message || "Failed to load review data", "error");
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [selectedStatus, selectedRating, searchQuery],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Toggle Auto-Publish / Pre-Approval Setting
  const handleToggleAutoPublish = async () => {
    if (!settings || updatingSettings) return;
    const newRequireApproval = !settings.requireApproval;
    setUpdatingSettings(true);

    try {
      const updated = await api.reviews.adminUpdateSettings({
        requireApproval: newRequireApproval,
      });
      setSettings(updated);
      showToast(
        newRequireApproval
          ? "Pre-approval enabled: New reviews will require admin approval before publishing."
          : "Auto-publish enabled: New verified reviews will publish immediately without prior approval.",
      );
    } catch (err: any) {
      showToast(
        err?.message || "Failed to update review approval settings",
        "error",
      );
    } finally {
      setUpdatingSettings(false);
    }
  };

  // Toggle Featured on Homepage
  const handleToggleFeatured = async (review: ReviewDTO) => {
    if (review.status !== ReviewStatus.APPROVED) {
      showToast(
        "Only approved reviews can be featured on the public homepage.",
        "error",
      );
      return;
    }

    const newFeatured = !review.isFeaturedOnHome;
    try {
      await api.reviews.adminUpdateStatus(review.id, {
        status: ReviewStatus.APPROVED,
        isFeaturedOnHome: newFeatured,
      });
      setReviews((prev) =>
        prev.map((r) =>
          r.id === review.id ? { ...r, isFeaturedOnHome: newFeatured } : r,
        ),
      );
      setKpis((prev) => ({
        ...prev,
        featuredCount: Math.max(
          0,
          newFeatured ? prev.featuredCount + 1 : prev.featuredCount - 1,
        ),
      }));
      // Fetch fresh KPIs quietly from backend
      loadData(true);
      showToast(
        newFeatured
          ? `Review by ${review.user?.firstName || "Customer"} featured on homepage!`
          : `Review by ${review.user?.firstName || "Customer"} removed from homepage spotlight.`,
      );
    } catch (err: any) {
      showToast(err?.message || "Failed to update homepage spotlight", "error");
    }
  };

  // Approve / Reject status update
  const handleUpdateStatus = async (
    review: ReviewDTO,
    newStatus: ReviewStatus,
  ) => {
    try {
      const updated = await api.reviews.adminUpdateStatus(review.id, {
        status: newStatus,
        isFeaturedOnHome:
          newStatus === ReviewStatus.APPROVED ? review.isFeaturedOnHome : false,
      });

      setReviews((prev) =>
        prev.map((r) =>
          r.id === review.id
            ? {
                ...r,
                status: updated.status,
                isFeaturedOnHome: updated.isFeaturedOnHome,
              }
            : r,
        ),
      );

      // Refresh KPIs quietly
      loadData(true);

      showToast(`Review marked as ${newStatus}`);
    } catch (err: any) {
      showToast(err?.message || "Failed to update review status", "error");
    }
  };

  // Submit official reply
  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyingReview || !replyText.trim()) return;

    setReplySubmitting(true);
    try {
      const updated = await api.reviews.adminReply(
        replyingReview.id,
        replyText.trim(),
      );
      setReviews((prev) =>
        prev.map((r) =>
          r.id === replyingReview.id
            ? {
                ...r,
                adminReply: updated.adminReply,
                adminRepliedAt: updated.adminRepliedAt,
              }
            : r,
        ),
      );
      showToast("Management response posted successfully.");
      setReplyingReview(null);
      setReplyText("");
    } catch (err: any) {
      showToast(err?.message || "Failed to post management response", "error");
    } finally {
      setReplySubmitting(false);
    }
  };

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {feedbackMessage && (
        <div
          className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-2 text-xs font-bold transition-all animate-in slide-in-from-top-3 ${
            feedbackMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          {feedbackMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600" />
          )}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Customer Reviews &amp; Testimonials
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-[#23055c]">
              Verified Feedback
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Moderate verified workspace reviews, curate homepage spotlight
            testimonials, and configure auto-publishing.
          </p>
        </div>

        <button
          onClick={() => loadData(true)}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`}
          />
          <span>Refresh</span>
        </button>
      </div>

      {/* Auto-Publish Setting Control Card */}
      <div className="bg-white rounded-3xl p-6 border border-[#ebe7f5] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-[#23055c] shrink-0">
            <Sliders className="w-6 h-6 text-[#23055c]" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                Publishing Approval Mode
              </h2>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                  settings?.requireApproval
                    ? "bg-amber-100 text-amber-800"
                    : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {settings?.requireApproval
                  ? "Pre-Approval Required"
                  : "Auto-Publish Enabled"}
              </span>
            </div>
            <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
              {settings?.requireApproval
                ? "Reviews from verified members enter a Pending queue and must be approved by Operations before appearing publicly."
                : "Verified reviews publish immediately on workspace pages upon submission. You can still unpublish, reject, or feature them at any time."}
            </p>
          </div>
        </div>

        {/* Toggle Switch */}
        <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
          <span className="text-xs font-bold text-slate-700">
            Require Approval
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={Boolean(settings?.requireApproval)}
            onClick={handleToggleAutoPublish}
            disabled={updatingSettings || !settings}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden disabled:opacity-50 ${
              settings?.requireApproval ? "bg-[#23055c]" : "bg-slate-300"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                settings?.requireApproval ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Average Rating */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Hub Average Rating
            </span>
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900">
              {kpis.averageRating}
            </span>
            <span className="text-xs text-slate-400">/ 5.0</span>
          </div>
        </div>

        {/* Total Reviews */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Total Reviews
            </span>
            <MessageSquare className="w-4 h-4 text-[#23055c]" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-slate-900">
              {kpis.totalReviews}
            </span>
          </div>
        </div>

        {/* Pending Approval */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Pending Moderation
            </span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-2xl font-black text-slate-900">
              {kpis.pendingCount}
            </span>
            {kpis.pendingCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                Action needed
              </span>
            )}
          </div>
        </div>

        {/* Featured on Homepage */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Homepage Spotlight
            </span>
            <Sparkles className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-slate-900">
              {Math.max(0, kpis.featuredCount || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {["ALL", "PENDING", "APPROVED", "REJECTED"].map((status) => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                selectedStatus === status
                  ? "bg-[#23055c] text-white shadow-2xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {status === "ALL" ? "All Reviews" : status}
            </button>
          ))}
        </div>

        {/* Rating & Search Inputs */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Star Filter */}
          <select
            value={selectedRating}
            onChange={(e) => setSelectedRating(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl border border-slate-200 text-slate-700 bg-white focus:outline-hidden focus:border-[#23055c]"
          >
            <option value="ALL">All Stars</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>

          {/* Search Box */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search member, quote, ref..."
              className="w-full text-xs pl-8 pr-3.5 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#23055c]"
            />
          </div>
        </div>
      </div>

      {/* Reviews List */}
      {loading ? (
        <div className="py-20 text-center space-y-3 bg-white rounded-3xl border border-slate-100">
          <Loader2 className="w-8 h-8 animate-spin text-[#23055c] mx-auto" />
          <p className="text-xs text-slate-500 font-semibold">
            Loading review records...
          </p>
        </div>
      ) : reviews.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-white rounded-3xl border border-slate-100">
          <MessageSquare className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">
            No Reviews Found
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No customer reviews match your active filter criteria. Try changing
            your status or search query.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => {
            const isApproved = r.status === ReviewStatus.APPROVED;
            const isPending = r.status === ReviewStatus.PENDING;
            const isRejected = r.status === ReviewStatus.REJECTED;

            return (
              <div
                key={r.id}
                className="bg-white rounded-2xl p-6 border border-slate-100 shadow-2xs hover:border-[#23055c]/20 transition-all flex flex-col space-y-4"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-900 to-slate-700 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                      {r.user?.firstName?.[0] || "U"}
                      {r.user?.lastName?.[0] || ""}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">
                          {r.user?.firstName} {r.user?.lastName}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center gap-0.5">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          <span>Verified Stay</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        <span className="font-mono text-[11px] text-slate-400">
                          Ref: {r.booking?.reference || r.bookingId.slice(0, 8)}
                        </span>
                        {r.resource?.name && (
                          <span className="flex items-center gap-1 font-semibold text-slate-600">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            <span>{r.resource.name}</span>
                          </span>
                        )}
                        <span>&bull;</span>
                        <span>
                          {new Date(r.createdAt).toLocaleDateString("en-NG", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status & Homepage Badge */}
                  <div className="flex items-center gap-2">
                    {r.isFeaturedOnHome && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        <span>Homepage Spotlight</span>
                      </span>
                    )}
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                        isApproved
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : isPending
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>
                </div>

                {/* Rating & Content */}
                <div className="bg-[#faf9fe] rounded-xl p-4 border border-[#ebe7f5]/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex text-amber-400 gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-4 h-4 ${s <= r.rating ? "fill-amber-400 text-amber-400" : "text-slate-200"}`}
                        />
                      ))}
                    </div>

                    {/* Sub-ratings */}
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium">
                      {r.powerRating && (
                        <span>
                          Power: <strong>{r.powerRating}/5</strong>
                        </span>
                      )}
                      {r.wifiRating && (
                        <span>
                          Wi-Fi: <strong>{r.wifiRating}/5</strong>
                        </span>
                      )}
                      {r.comfortRating && (
                        <span>
                          Comfort: <strong>{r.comfortRating}/5</strong>
                        </span>
                      )}
                      {r.staffRating && (
                        <span>
                          Staff: <strong>{r.staffRating}/5</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  {r.title && (
                    <h4 className="text-sm font-bold text-slate-900">
                      "{r.title}"
                    </h4>
                  )}
                  <p className="text-xs text-slate-700 leading-relaxed">
                    "{r.comment}"
                  </p>
                </div>

                {/* Admin Management Reply (if already posted) */}
                {r.adminReply && (
                  <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 text-xs space-y-1">
                    <div className="flex items-center justify-between text-slate-900 font-bold text-[11px]">
                      <span className="flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>DAIH Hub Management Response</span>
                      </span>
                      {r.adminRepliedAt && (
                        <span className="text-[10px] text-slate-400 font-normal">
                          {new Date(r.adminRepliedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-600 text-xs italic">
                      "{r.adminReply}"
                    </p>
                  </div>
                )}

                {/* Actions Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
                  {/* Homepage Feature Toggle */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={!isApproved}
                      onClick={() => handleToggleFeatured(r)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                        r.isFeaturedOnHome
                          ? "bg-purple-100 text-purple-800 hover:bg-purple-200"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                      title={
                        !isApproved
                          ? "Approve review first before featuring"
                          : ""
                      }
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>
                        {r.isFeaturedOnHome
                          ? "Featured on Home ✓"
                          : "Feature on Home"}
                      </span>
                    </button>
                  </div>

                  {/* Moderation Controls & Reply */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setReplyingReview(r);
                        setReplyText(r.adminReply || "");
                      }}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                      <span>{r.adminReply ? "Edit Reply" : "Reply"}</span>
                    </button>

                    {!isApproved && (
                      <button
                        onClick={() =>
                          handleUpdateStatus(r, ReviewStatus.APPROVED)
                        }
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                    )}

                    {!isRejected && (
                      <button
                        onClick={() =>
                          handleUpdateStatus(r, ReviewStatus.REJECTED)
                        }
                        className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold transition-colors flex items-center gap-1 cursor-pointer border border-rose-200"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reply Modal */}
      {replyingReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Official Management Response
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Replying to {replyingReview.user?.firstName}'s review for{" "}
                  {replyingReview.resource?.name}
                </p>
              </div>
              <button
                onClick={() => setReplyingReview(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReply} className="space-y-4">
              <div>
                <textarea
                  rows={4}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Thank you for sharing your feedback with DAIH! We are thrilled to hear..."
                  required
                  maxLength={1500}
                  className="w-full text-xs p-3.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#23055c] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setReplyingReview(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={replySubmitting || !replyText.trim()}
                  className="px-5 py-2 bg-[#23055c] hover:bg-[#392271] text-white text-xs font-bold rounded-xl transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {replySubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Posting...</span>
                    </>
                  ) : (
                    <span>Post Response</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
