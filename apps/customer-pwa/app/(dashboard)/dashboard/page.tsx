"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { api, useAuth } from "@daih/api-client";
import {
  BookingSummary,
  BookingState,
  PaymentTransaction,
  PaymentStatus,
} from "@daih/types";
import {
  ActiveSubscriptionCard,
  UpcomingBookingCard,
  WifiAccessCard,
  RecentActivityCard,
} from "../../../components/dashboard";
import { ActivityItem } from "../../../components/dashboard/RecentActivityCard";
import { ReviewModal } from "../../../components/reviews/ReviewModal";
import { MemberTierBadge } from "../../../components/loyalty/MemberTierBadge";
import {
  ArrowRight,
  RefreshCw,
  Calendar,
  PlusCircle,
  Star,
  Loader2,
  X,
} from "lucide-react";
import { ReviewDTO } from "@daih/types";

function formatDate(isoStr?: string) {
  if (!isoStr) return "";
  return new Date(isoStr).toLocaleDateString("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(isoStr?: string) {
  if (!isoStr) return "";
  return new Date(isoStr).toLocaleTimeString("en-NG", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelativeTime(isoStr?: string) {
  if (!isoStr) return "";
  const date = new Date(isoStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const timeStr = date.toLocaleTimeString("en-NG", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (isToday) return `Today, ${timeStr}`;
  if (isYesterday) return `Yesterday, ${timeStr}`;
  return `${date.toLocaleDateString("en-NG", { day: "numeric", month: "short" })}, ${timeStr}`;
}

export default function MemberDashboardPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<BookingSummary[]>([]);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [wallet, setWallet] = useState<{
    tier?: string;
    tierMultiplier?: number;
    lifetimeEarned?: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Review Modal State for Completed/Ended Stay Prompt
  const [reviewBooking, setReviewBooking] = useState<BookingSummary | null>(
    null,
  );
  const [existingReview, setExistingReview] = useState<ReviewDTO | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [checkingReviewId, setCheckingReviewId] = useState<string | null>(null);
  const [dismissedReviewIds, setDismissedReviewIds] = useState<Set<string>>(
    new Set(),
  );
  const [isDismissedLoaded, setIsDismissedLoaded] = useState(false);

  // Load dismissed review IDs from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("daih_dismissed_reviews");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setDismissedReviewIds(new Set(parsed));
        }
      }
    } catch {
      // Ignore localStorage read errors
    } finally {
      setIsDismissedLoaded(true);
    }
  }, []);

  const handleDismissReview = useCallback((bookingId: string) => {
    setDismissedReviewIds((prev) => {
      const updated = new Set([...prev, bookingId]);
      try {
        localStorage.setItem(
          "daih_dismissed_reviews",
          JSON.stringify([...updated]),
        );
      } catch {
        // Ignore localStorage write errors
      }
      return updated;
    });
  }, []);

  const handleOpenReview = async (b: BookingSummary) => {
    try {
      setCheckingReviewId(b.id);
      const res = await api.reviews.checkEligibility(b.id);
      if (res.eligible) {
        setReviewBooking(b);
        setExistingReview(null);
        setShowReviewModal(true);
      } else if (res.hasReviewed && res.existingReview) {
        setReviewBooking(b);
        setExistingReview(res.existingReview);
        setShowReviewModal(true);
      } else {
        alert(res.reason || "This booking is not eligible for review.");
        handleDismissReview(b.id);
      }
    } catch (err: any) {
      alert(err?.message || "Could not check review eligibility.");
    } finally {
      setCheckingReviewId(null);
    }
  };

  const fetchDashboardData = useCallback(async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }

      const [bookingsData, paymentsData, walletData] = await Promise.allSettled(
        [
          api.bookings.getMyBookings({ forceRefresh }),
          api.payments.getHistory({ forceRefresh }),
          api.loyalty.getMyWallet(forceRefresh),
        ],
      );

      if (
        bookingsData.status === "fulfilled" &&
        Array.isArray(bookingsData.value)
      ) {
        setBookings(bookingsData.value);
      }

      if (
        paymentsData.status === "fulfilled" &&
        Array.isArray(paymentsData.value)
      ) {
        setTransactions(paymentsData.value);
      }

      if (walletData.status === "fulfilled" && walletData.value) {
        setWallet({
          tier: walletData.value.tier,
          tierMultiplier: walletData.value.tierMultiplier,
          lifetimeEarned: walletData.value.lifetimeEarned,
        });
      }
    } catch (err) {
      console.warn("Failed to load dashboard live data:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const firstName = user?.firstName || (user as any)?.name || "Member";

  // Derive Active Pass / Booking (confirmed/active/checked-in and not expired)
  const now = new Date();
  const confirmedStates = [
    BookingState.CONFIRMED,
    BookingState.ACTIVE,
    BookingState.CHECKED_IN,
    BookingState.CHECKED_OUT,
  ];

  // An active pass must be within its booked window
  const activeBooking = bookings.find((b) => {
    const isConfirmed = confirmedStates.includes(b.state as BookingState);
    const end = new Date(b.endTime);
    return isConfirmed && end >= now;
  });

  // Resolve today's scheduled slot end time for active booking
  const todaySlotEnd = (() => {
    if (!activeBooking) return null;
    const bStart = new Date(activeBooking.startTime);
    const bEnd = new Date(activeBooking.endTime);
    if (bEnd.toDateString() === now.toDateString()) {
      return bEnd;
    }
    if (
      bEnd.getHours() !== bStart.getHours() ||
      bEnd.getMinutes() !== bStart.getMinutes()
    ) {
      const slot = new Date(now);
      slot.setHours(bEnd.getHours(), bEnd.getMinutes(), bEnd.getSeconds(), 0);
      return slot;
    }
    return bEnd;
  })();

  const isSlotConcludedToday = Boolean(todaySlotEnd && now >= todaySlotEnd);

  // Mid-day Break: Member is currently in CHECKED_OUT state while today's scheduled slot is still in progress!
  const isOnBreak = Boolean(
    activeBooking &&
    activeBooking.state === BookingState.CHECKED_OUT &&
    !isSlotConcludedToday &&
    new Date(activeBooking.endTime) >= now,
  );

  // Checked in and currently on-site:
  const isCheckedInToday = Boolean(
    activeBooking && activeBooking.state === BookingState.CHECKED_IN,
  );

  // Identify most recent ended/completed booking for review prompt and clean expired status
  const mostRecentEndedBooking = bookings.find((b) => {
    const end = new Date(b.endTime);
    const isPastState = [
      BookingState.COMPLETED,
      BookingState.CHECKED_OUT,
      BookingState.CONFIRMED,
      BookingState.CHECKED_IN,
    ].includes(b.state as BookingState);
    return isPastState && (end < now || b.state === BookingState.COMPLETED);
  });

  // Resolve Wi-Fi status cleanly:
  // 1. If currently on-site or on mid-day break -> "ACTIVE" (credentials stay active until endTime)
  // 2. If pass active but daily check-in needed -> "LOCKED_PENDING_DAILY_CHECKIN"
  // 3. If session has ended / expired -> "EXPIRED" (cleanly removes Active Today badge)
  // 4. Otherwise -> "LOCKED_NO_PASS"
  const wifiStatus = activeBooking
    ? isCheckedInToday || isOnBreak
      ? "ACTIVE"
      : "LOCKED_PENDING_DAILY_CHECKIN"
    : mostRecentEndedBooking
      ? "EXPIRED"
      : "LOCKED_NO_PASS";

  const wifiNetworkName =
    activeBooking?.wifiCredentials?.ssid || "DAIH-Member-HighSpeed";
  const wifiUsername =
    activeBooking?.wifiCredentials?.username ||
    (activeBooking
      ? `daih_${activeBooking.reference.toLowerCase()}`
      : undefined);
  const wifiPassword =
    activeBooking?.wifiCredentials?.pin ||
    (activeBooking ? activeBooking.reference.slice(-6).toUpperCase() : "N/A");
  const wifiValidUntil =
    activeBooking?.wifiCredentials?.validUntil || activeBooking?.endTime;

  const upcomingBookings = bookings
    .filter((b) => {
      const isRelevant = [
        BookingState.CONFIRMED,
        BookingState.HELD,
        BookingState.PENDING_PAYMENT,
        BookingState.ACTIVE,
        BookingState.CHECKED_IN,
      ].includes(b.state as BookingState);
      return isRelevant && new Date(b.endTime) >= now;
    })
    .sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );

  // Build unified live activities timeline
  const liveActivities: ActivityItem[] = [
    ...transactions.map((t) => ({
      id: `tx-${t.id}`,
      title: t.paystackReference
        ? `Payment: ${t.paystackReference}`
        : `Payment: ${t.reference}`,
      time: formatRelativeTime(t.createdAt),
      timestamp: new Date(t.createdAt).getTime(),
      iconType: "payment" as const,
      amount:
        t.status === PaymentStatus.SUCCESSFUL || (t.status as any) === "SUCCESS"
          ? `-₦${Number(t.amount).toLocaleString("en-NG", {
              minimumFractionDigits: 2,
            })}`
          : null,
      status: t.status,
    })),
    ...bookings.map((b) => ({
      id: `bk-${b.id}`,
      title: `Reserved ${b.resourceName}`,
      time: formatRelativeTime(b.createdAt),
      timestamp: new Date(b.createdAt).getTime(),
      iconType: "booking" as const,
      amount: null,
      status: b.state,
    })),
  ]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Welcome & Quick Action Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-purple-50 via-white to-slate-50 p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#181c20] tracking-tight">
              {getGreeting()}, {firstName}
            </h2>
            <MemberTierBadge
              variant="pill"
              tier={wallet?.tier}
              lifetimeEarned={wallet?.lifetimeEarned || 0}
              multiplier={wallet?.tierMultiplier}
              href="/loyalty"
            />
            <button
              onClick={() => fetchDashboardData(true)}
              disabled={isRefreshing || loading}
              title="Refresh live data"
              className="text-slate-400 hover:text-[#23055c] p-1.5 rounded-lg hover:bg-purple-100/50 transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing ? "animate-spin text-[#23055c]" : ""}`}
              />
            </button>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-normal">
            Welcome to your DAIH workspace overview.
          </p>
        </div>

        <Link
          href="/book"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#23055c] hover:bg-[#35089e] text-white text-xs font-bold transition-colors shadow-sm self-start sm:self-auto"
        >
          Book a Workspace
          <ArrowRight className="w-3.5 h-3.5 ml-1" />
        </Link>
      </div>

      {/* Review Prompt Banner for recently completed/ended stay */}
      {isDismissedLoaded &&
        mostRecentEndedBooking &&
        (mostRecentEndedBooking.checkedInAt != null ||
          mostRecentEndedBooking.state === BookingState.CHECKED_OUT ||
          mostRecentEndedBooking.state === BookingState.COMPLETED) &&
        !dismissedReviewIds.has(mostRecentEndedBooking.id) && (
          <div className="bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-transparent p-4 sm:p-5 rounded-2xl border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Star className="w-5 h-5 fill-current" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  How was your stay at {mostRecentEndedBooking.resourceName}?
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  Your session has ended. Share your verified feedback to help
                  other members and rate the workspace.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
              <button
                onClick={() => handleDismissReview(mostRecentEndedBooking.id)}
                className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100/60 rounded-xl transition-colors cursor-pointer"
              >
                Dismiss
              </button>
              <button
                onClick={() => handleOpenReview(mostRecentEndedBooking)}
                disabled={checkingReviewId === mostRecentEndedBooking.id}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {checkingReviewId === mostRecentEndedBooking.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Star className="w-3.5 h-3.5 fill-current" />
                )}
                <span>Leave a Review</span>
              </button>
            </div>
          </div>
        )}

      {/* Main Grid: 8-Column Main Content & 4-Column Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left / Main Content Column */}
        <div className="col-span-1 md:col-span-8 space-y-8">
          {/* Active Subscription / Access Pass Section */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Active Pass & Subscription
              </h3>
            </div>
            <ActiveSubscriptionCard
              loading={loading}
              hasActivePass={!!activeBooking}
              planName={activeBooking?.resourceName}
              billingCycle={
                activeBooking
                  ? `Valid: ${formatDate(activeBooking.startTime)} - ${formatDate(activeBooking.endTime)}`
                  : undefined
              }
              statusBadge={
                isOnBreak
                  ? "On Break"
                  : activeBooking?.state === BookingState.CHECKED_IN
                    ? "Checked In"
                    : activeBooking && new Date(activeBooking.startTime) <= now
                      ? "Active"
                      : "Confirmed"
              }
              qrHref={
                activeBooking ? `/qr?bookingId=${activeBooking.id}` : "/qr"
              }
            />
          </section>

          {/* Upcoming Reservations Section */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Upcoming Reservations
              </h3>
              <span className="text-xs font-semibold text-[#23055c]">
                {upcomingBookings.length}{" "}
                {upcomingBookings.length === 1 ? "Scheduled" : "Scheduled"}
              </span>
            </div>

            {loading ? (
              <div className="space-y-3">
                <UpcomingBookingCard loading={true} />
              </div>
            ) : upcomingBookings.length === 0 ? (
              <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center space-y-3 shadow-xs">
                <div className="w-12 h-12 rounded-full bg-purple-50 text-[#23055c] flex items-center justify-center mx-auto">
                  <Calendar className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-800">
                    No Upcoming Reservations
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    You have no active or scheduled workspace sessions. Book a
                    space to reserve your spot.
                  </p>
                </div>
                <Link
                  href="/book"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#23055c] hover:bg-[#35089e] text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Reserve a Space</span>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingBookings.slice(0, 3).map((booking) => {
                  const isHold =
                    booking.state === BookingState.HELD ||
                    booking.state === BookingState.PENDING_PAYMENT;
                  const isConfirmed = booking.state === BookingState.CONFIRMED;
                  const badgeText = isHold
                    ? "Hold Pending"
                    : isConfirmed
                      ? "Confirmed"
                      : "Active";
                  const badgeColor = isHold
                    ? "amber"
                    : isConfirmed
                      ? "emerald"
                      : "purple";

                  const timeDisplay = `${formatDate(booking.startTime)}, ${formatTime(booking.startTime)} - ${formatTime(booking.endTime)}`;
                  const locationDisplay = booking.category
                    ? `${booking.category} • DAIH Innovation Hub`
                    : "DAIH Innovation Hub";

                  return (
                    <UpcomingBookingCard
                      key={booking.id}
                      title={booking.resourceName}
                      time={timeDisplay}
                      location={locationDisplay}
                      detailsHref="/bookings"
                      badge={badgeText}
                      badgeColor={badgeColor}
                    />
                  );
                })}
              </div>
            )}
          </section>

          {/* Quick Hub Navigation Links if user has more bookings */}
          {upcomingBookings.length > 3 && (
            <div className="text-center pt-2">
              <Link
                href="/bookings"
                className="text-xs font-bold text-[#23055c] hover:underline inline-flex items-center gap-1"
              >
                <span>View all {upcomingBookings.length} bookings</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>

        {/* Right / Sidebar Widgets Column */}
        <div className="col-span-1 md:col-span-4 space-y-6">
          {/* Wi-Fi Details Access Card (Locked daily until check-in or upon expiry) */}
          <WifiAccessCard
            loading={loading}
            isCheckedIn={isCheckedInToday}
            isOnBreak={isOnBreak}
            status={wifiStatus}
            networkName={wifiNetworkName}
            username={wifiUsername}
            password={wifiPassword}
            validUntil={wifiValidUntil}
          />

          {/* Live Recent Activity */}
          <RecentActivityCard loading={loading} activities={liveActivities} />
        </div>
      </div>

      {/* Review Modal Dialog for Prompt */}
      {showReviewModal && reviewBooking && (
        <ReviewModal
          isOpen={showReviewModal}
          booking={reviewBooking}
          existingReview={existingReview}
          onClose={() => {
            setShowReviewModal(false);
            setReviewBooking(null);
          }}
          onSuccess={() => {
            setShowReviewModal(false);
            if (reviewBooking) {
              handleDismissReview(reviewBooking.id);
            }
            fetchDashboardData(true);
          }}
        />
      )}
    </div>
  );
}
