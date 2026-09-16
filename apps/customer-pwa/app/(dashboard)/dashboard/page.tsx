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
  FinancialOverviewCard,
  WifiAccessCard,
  RecentActivityCard,
} from "../../../components/dashboard";
import { ActivityItem } from "../../../components/dashboard/RecentActivityCard";
import { ArrowRight, RefreshCw, Calendar, PlusCircle } from "lucide-react";

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
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchDashboardData = useCallback(async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }

      const [bookingsData, paymentsData] = await Promise.allSettled([
        api.bookings.getMyBookings({ forceRefresh }),
        api.payments.getHistory({ forceRefresh }),
      ]);

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

  // Derive Active Pass / Booking (confirmed/active and not expired)
  const now = new Date();
  const confirmedStates = [
    BookingState.CONFIRMED,
    BookingState.ACTIVE,
    BookingState.CHECKED_IN,
    BookingState.CHECKED_OUT,
  ];

  const activeBooking = bookings.find((b) => {
    const isConfirmed = confirmedStates.includes(b.state as BookingState);
    const end = new Date(b.endTime);
    return isConfirmed && end >= now;
  });

  // Check if member has checked in TODAY for their active pass
  const isCheckedInToday = Boolean(
    activeBooking?.checkedInToday ||
    activeBooking?.wifiCredentials != null ||
    (activeBooking?.state === BookingState.CHECKED_IN &&
      activeBooking.checkedInAt &&
      new Date(activeBooking.checkedInAt).toDateString() ===
        now.toDateString()),
  );

  const wifiStatus = activeBooking
    ? activeBooking.wifiStatus ||
      (isCheckedInToday ? "ACTIVE" : "LOCKED_PENDING_DAILY_CHECKIN")
    : bookings.length > 0 && bookings.every((b) => new Date(b.endTime) < now)
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
  const wifiValidUntil = activeBooking?.wifiCredentials?.validUntil;

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

  // Financial calculations from live transactions or confirmed bookings
  const successfulPayments = transactions.filter(
    (t) =>
      t.status === PaymentStatus.SUCCESSFUL ||
      (t.status as any) === "SUCCESS" ||
      (t.status as any) === "SUCCESSFUL",
  );

  const totalPaidAmount =
    successfulPayments.length > 0
      ? successfulPayments.reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
      : bookings
          .filter((b) => confirmedStates.includes(b.state as BookingState))
          .reduce((sum, b) => sum + (Number(b.amount) || 0), 0);

  const formattedTotalPaid = `₦${totalPaidAmount.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const paymentCount =
    successfulPayments.length > 0
      ? successfulPayments.length
      : bookings.filter((b) =>
          confirmedStates.includes(b.state as BookingState),
        ).length;

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
          <div className="flex items-center gap-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#181c20] tracking-tight">
              {getGreeting()}, {firstName}
            </h2>
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
                activeBooking && new Date(activeBooking.startTime) <= now
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
          {/* Live Financial Overview */}
          <FinancialOverviewCard
            loading={loading}
            totalPaid={formattedTotalPaid}
            label={`${paymentCount} ${paymentCount === 1 ? "Invoice" : "Invoices"} Paid`}
          />

          {/* Member Wi-Fi Access Card (Locked daily until check-in or upon expiry) */}
          <WifiAccessCard
            loading={loading}
            isCheckedIn={isCheckedInToday}
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
    </div>
  );
}
