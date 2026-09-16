"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api, useAuth } from "@daih/api-client";
import { BookingSummary, BookingState, InvoiceDTO } from "@daih/types";
import {
  Calendar,
  Clock,
  QrCode,
  XCircle,
  AlertCircle,
  CheckCircle2,
  Building2,
  MapPin,
  ArrowRight,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Receipt,
  CreditCard,
  Download,
  X,
  Sparkles,
} from "lucide-react";
import { downloadReceiptPdf } from "../../../lib/receiptPdf";

function formatDate(isoStr: string) {
  if (!isoStr) return "";
  return new Date(isoStr).toLocaleDateString("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(isoStr: string) {
  if (!isoStr) return "";
  return new Date(isoStr).toLocaleTimeString("en-NG", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function BookingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [bookings, setBookings] = useState<BookingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [payingBookingId, setPayingBookingId] = useState<string | null>(null);
  const [checkingBookingId, setCheckingBookingId] = useState<string | null>(
    null,
  );
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDTO | null>(
    null,
  );
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");
  const [isVerifyingReturn, setIsVerifyingReturn] = useState(false);
  const [verifiedSuccessMessage, setVerifiedSuccessMessage] = useState<
    string | null
  >(null);
  const verifiedRefTracker = React.useRef<string | null>(null);

  const fetchBookings = useCallback(
    async (forceRefresh = false, options: { silent?: boolean } = {}) => {
      const isSilent = options.silent ?? (bookings.length > 0 && forceRefresh);
      if (isSilent) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      try {
        const data = await api.bookings.getMyBookings({ forceRefresh });
        setBookings(data);
      } catch (err) {
        console.warn("Could not load bookings:", err);
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [bookings.length],
  );

  // Handle return redirect from Paystack (?reference=... or ?trxref=...)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    const reference = urlParams.get("reference") || urlParams.get("trxref");

    if (!reference) {
      // Normal initial load without return callback
      fetchBookings();
      return;
    }

    if (verifiedRefTracker.current === reference) return;
    verifiedRefTracker.current = reference;

    // Clean query parameters from address bar immediately without unmounting component
    window.history.replaceState({}, document.title, window.location.pathname);

    setIsVerifyingReturn(true);
    setLoading(true);

    api.payments
      .verifyPayment(reference)
      .then(async (res) => {
        setVerifiedSuccessMessage(
          "Payment successfully confirmed! Your access pass is active.",
        );
        await fetchBookings(true, { silent: false });
      })
      .catch((err) => {
        console.warn("Notice verifying payment on return:", err?.message);
        fetchBookings(true, { silent: false });
      })
      .finally(() => {
        setIsVerifyingReturn(false);
      });
  }, [fetchBookings]);

  // Auto-dismiss success message after 8 seconds
  useEffect(() => {
    if (!verifiedSuccessMessage) return;
    const timer = setTimeout(() => {
      setVerifiedSuccessMessage(null);
    }, 8000);
    return () => clearTimeout(timer);
  }, [verifiedSuccessMessage]);

  // Silent refresh on tab switch / window focus
  useEffect(() => {
    const handleFocus = () => {
      fetchBookings(true, { silent: true });
    };

    if (typeof window !== "undefined") {
      window.addEventListener("focus", handleFocus);
      return () => window.removeEventListener("focus", handleFocus);
    }
  }, [fetchBookings]);

  const handlePayNow = async (bookingId: string) => {
    setPayingBookingId(bookingId);
    try {
      const callbackUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/bookings`
          : undefined;
      const res = await api.payments.initializePayment(bookingId, callbackUrl);
      if (res.authorization_url) {
        window.location.href = res.authorization_url;
      }
    } catch (err: any) {
      if (err?.code === "BOOKING_ALREADY_PAID") {
        setVerifiedSuccessMessage(
          "This booking is already paid and confirmed!",
        );
        await fetchBookings(true, { silent: true });
      } else {
        alert(err?.message || "Failed to initialize payment gateway");
      }
      setPayingBookingId(null);
    }
  };

  const handleCheckStatus = async (booking: BookingSummary) => {
    setCheckingBookingId(booking.id);
    try {
      // Find latest transaction reference for this booking or verify by booking id
      const res = await api.payments.verifyPayment(booking.id);
      if (
        res.status === "SUCCESSFUL" ||
        res.booking?.state === BookingState.CONFIRMED
      ) {
        setVerifiedSuccessMessage("Payment confirmed! Your booking is active.");
      }
      await fetchBookings(true, { silent: true });
    } catch (err: any) {
      console.warn("Check status notice:", err?.message);
      await fetchBookings(true, { silent: true });
    } finally {
      setCheckingBookingId(null);
    }
  };

  const handleViewInvoice = async (booking: BookingSummary) => {
    setLoadingInvoice(true);
    try {
      const invoice = await api.payments.getInvoice(booking.id);
      setSelectedInvoice(invoice);
    } catch (err: any) {
      alert(
        err?.message ||
          "Invoice is being generated. Please check back shortly.",
      );
    } finally {
      setLoadingInvoice(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    setActionLoading(true);
    try {
      await api.bookings.cancelBooking(
        bookingId,
        cancelReason || "Customer requested cancellation",
      );
      setCancellingId(null);
      setCancelReason("");
      await fetchBookings(true);
    } catch (err: any) {
      alert(err?.message || "Failed to cancel booking");
    } finally {
      setActionLoading(false);
    }
  };

  const now = new Date();

  const activeBookings = bookings.filter((b) => {
    const isStateActive = [
      BookingState.CONFIRMED,
      BookingState.ACTIVE,
      BookingState.CHECKED_IN,
    ].includes(b.state as BookingState);
    const notEnded = new Date(b.endTime) >= now;
    return isStateActive && notEnded;
  });

  const historicalBookings = bookings.filter((b) => {
    const isStateActive = [
      BookingState.CONFIRMED,
      BookingState.ACTIVE,
      BookingState.CHECKED_IN,
    ].includes(b.state as BookingState);
    const isEnded = new Date(b.endTime) < now;
    const isLegitHistoricalState = [
      BookingState.COMPLETED,
      BookingState.NO_SHOW,
      BookingState.CANCELLED,
    ].includes(b.state as BookingState);
    return (isStateActive && isEnded) || isLegitHistoricalState;
  });

  const displayedBookings =
    activeTab === "active" ? activeBookings : historicalBookings;

  return (
    <div className="space-y-8">
      {/* Verification In-Progress Banner */}
      {isVerifyingReturn && !verifiedSuccessMessage && (
        <div className="bg-[#23055c] text-white p-4 rounded-2xl flex items-center justify-between shadow-md animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-amber-300 shrink-0" />
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                Processing Payment
              </h4>
              <p className="text-xs text-white/90">
                Verifying your transaction and issuing your pass...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Verified Success Banner */}
      {verifiedSuccessMessage && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-3 text-emerald-800">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                Payment Confirmed
              </h4>
              <p className="text-xs text-emerald-700">
                {verifiedSuccessMessage}
              </p>
            </div>
          </div>
          <button
            onClick={() => setVerifiedSuccessMessage(null)}
            className="text-emerald-500 hover:text-emerald-800 text-xs font-bold cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EBE7F5] pb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            My Bookings &amp; Passes
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage your active workspace reservations, payments, and access
            passes.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fetchBookings(true, { silent: true })}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Refresh Bookings"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing || loading ? "animate-spin" : ""}`}
            />
          </button>
          <Link
            href="/book"
            className="bg-[#23055c] hover:bg-[#392271] text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
          >
            <span>Book New Space</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab("active")}
          className={`pb-3 text-xs font-bold transition-all relative cursor-pointer ${
            activeTab === "active"
              ? "text-[#23055c]"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Active Passes ({activeBookings.length})
          {activeTab === "active" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#23055c]" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`pb-3 text-xs font-bold transition-all relative cursor-pointer ${
            activeTab === "history"
              ? "text-[#23055c]"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Past &amp; Cancelled ({historicalBookings.length})
          {activeTab === "history" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#23055c]" />
          )}
        </button>
      </div>

      {/* Content */}
      {loading && !isVerifyingReturn ? (
        <div className="py-20 text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#23055c] mx-auto" />
          <p className="text-xs text-slate-500 font-semibold">
            Loading your reservations...
          </p>
        </div>
      ) : displayedBookings.length === 0 ? (
        <div className="py-20 text-center max-w-sm mx-auto space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <Building2 className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">
              {activeTab === "active"
                ? "No Active Bookings"
                : "No Past Bookings"}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {activeTab === "active"
                ? "You do not have any active space reservations. Reserve your spot today!"
                : "No past booking records found."}
            </p>
          </div>
          {activeTab === "active" && (
            <Link
              href="/book"
              className="inline-block bg-[#23055c] text-white text-xs font-bold px-5 py-2.5 rounded-xl hover:bg-[#392271] transition-all"
            >
              Explore Spaces
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {displayedBookings.map((b) => {
            const isNoShow =
              b.state === BookingState.NO_SHOW ||
              (!b.checkedInAt &&
                b.state === BookingState.CONFIRMED &&
                new Date(b.endTime) < now);
            const isCompleted =
              b.state === BookingState.COMPLETED ||
              ((b.state === BookingState.CHECKED_IN ||
                b.state === BookingState.ACTIVE) &&
                new Date(b.endTime) < now);
            const isConfirmed =
              (b.state === BookingState.CONFIRMED ||
                b.state === BookingState.CHECKED_IN) &&
              !isNoShow &&
              !isCompleted;
            const isHeld = b.state === BookingState.HELD;
            const isPendingPayment = b.state === BookingState.PENDING_PAYMENT;
            const isCancelled = b.state === BookingState.CANCELLED;
            const isExpired = b.state === BookingState.EXPIRED;

            return (
              <div
                key={b.id}
                className="bg-white rounded-2xl p-6 border border-[#EBE7F5] shadow-xs flex flex-col justify-between space-y-5 hover:border-[#23055c]/30 transition-all"
              >
                <div className="space-y-4">
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 block">
                        {b.reference}
                      </span>
                      <h3 className="text-base font-bold text-slate-900">
                        {b.resourceName}
                      </h3>
                    </div>
                    <div>
                      {isConfirmed && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Active / Confirmed</span>
                        </span>
                      )}
                      {isPendingPayment && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200/60 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          <span>Processing Payment</span>
                        </span>
                      )}
                      {isHeld && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-purple-50 text-purple-700 border border-purple-200/60 flex items-center gap-1">
                          <Clock className="h-3 w-3 animate-pulse" />
                          <span>Held &bull; Pay to Confirm</span>
                        </span>
                      )}
                      {isNoShow && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200/60 flex items-center gap-1">
                          <XCircle className="h-3 w-3 text-rose-600" />
                          <span>No-Show &bull; Missed Date</span>
                        </span>
                      )}
                      {isCompleted && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-slate-500" />
                          <span>Completed</span>
                        </span>
                      )}
                      {isExpired && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-500 border border-slate-200 flex items-center gap-1">
                          <Clock className="h-3 w-3 text-slate-400" />
                          <span>Hold Expired</span>
                        </span>
                      )}
                      {isCancelled && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200/60 flex items-center gap-1">
                          <span>Cancelled</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Dates & Location */}
                  <div className="bg-[#faf9ff] rounded-xl p-3.5 border border-[#EBE7F5] space-y-2 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-[#23055c] shrink-0" />
                      <span>
                        {formatDate(b.startTime)} &mdash;{" "}
                        {formatDate(b.endTime)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-[#23055c] shrink-0" />
                      <span>
                        {formatTime(b.startTime)} &mdash;{" "}
                        {formatTime(b.endTime)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-[#EBE7F5]/70 font-semibold">
                      <span className="text-slate-500">Amount</span>
                      <span className="text-[#23055c] font-bold">
                        {b.currency} {Number(b.amount).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                  {isConfirmed && (
                    <>
                      <Link
                        href={`/qr?bookingId=${b.id}`}
                        className="flex-1 bg-[#23055c] hover:bg-[#392271] text-white text-xs font-bold py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5"
                      >
                        <QrCode className="h-3.5 w-3.5" />
                        <span>View QR Pass</span>
                      </Link>
                      <button
                        onClick={() => handleViewInvoice(b)}
                        disabled={loadingInvoice}
                        className="px-3 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                        title="View Official Receipt"
                      >
                        <Receipt className="h-3.5 w-3.5" />
                        <span>Receipt</span>
                      </button>
                    </>
                  )}

                  {(isNoShow || isCompleted) && (
                    <>
                      <button
                        onClick={() => handleViewInvoice(b)}
                        disabled={loadingInvoice}
                        className="flex-1 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        title="View Official Receipt"
                      >
                        <Receipt className="h-3.5 w-3.5" />
                        <span>Receipt</span>
                      </button>
                      <Link
                        href="/book"
                        className="px-3.5 py-2.5 bg-[#23055c] hover:bg-[#392271] text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1 shadow-2xs"
                      >
                        <span>Book Again</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </>
                  )}

                  {/* Processing State */}
                  {isPendingPayment && (
                    <>
                      <button
                        disabled
                        className="flex-1 bg-amber-50 text-amber-800 border border-amber-200/80 text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 cursor-not-allowed opacity-90 shadow-2xs"
                      >
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-600" />
                        <span>Processing...</span>
                      </button>
                      <button
                        onClick={() => handleCheckStatus(b)}
                        disabled={checkingBookingId === b.id}
                        className="px-3 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                        title="Check Payment Status"
                      >
                        <RefreshCw
                          className={`h-3.5 w-3.5 ${checkingBookingId === b.id ? "animate-spin" : ""}`}
                        />
                        <span>Check Status</span>
                      </button>
                    </>
                  )}

                  {isHeld && (
                    <button
                      onClick={() => handlePayNow(b.id)}
                      disabled={payingBookingId === b.id}
                      className="flex-1 bg-[#23055c] hover:bg-[#392271] text-white text-xs font-bold py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      {payingBookingId === b.id ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Connecting...</span>
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-3.5 w-3.5" />
                          <span>Pay Now</span>
                        </>
                      )}
                    </button>
                  )}

                  {(isConfirmed || isHeld || isPendingPayment) && (
                    <button
                      onClick={() => setCancellingId(b.id)}
                      className="px-3 py-2.5 border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                      title="Cancel Booking"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Invoice & Receipt Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 print:p-0 print:bg-white print:static print:z-auto">
          <div className="printable-receipt-container bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <img
                  src="/images/logo.png"
                  alt="DAIH Hub"
                  className="h-7 w-auto object-contain"
                />
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                    Payment Receipt
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium">
                    DAIH Hub Innovation &amp; Workspace Center
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="no-print p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
                title="Close receipt"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex justify-between items-center bg-[#faf9ff] p-3.5 rounded-xl border border-[#EBE7F5]">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">
                    Invoice Number
                  </span>
                  <span className="font-extrabold text-[#23055c] text-sm">
                    {selectedInvoice.invoiceNumber}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">
                    Issued Date
                  </span>
                  <span className="text-slate-700 font-semibold">
                    {formatDate(selectedInvoice.issuedAt)}
                  </span>
                </div>
              </div>

              <div className="space-y-2 py-1">
                <div className="flex justify-between text-slate-600">
                  <span className="text-slate-500">Customer:</span>
                  <span className="font-bold text-slate-900">
                    {selectedInvoice.customerName} (
                    {selectedInvoice.customerClientId})
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span className="text-slate-500">Workspace / Space:</span>
                  <span className="font-semibold text-slate-900">
                    {selectedInvoice.resourceName}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span className="text-slate-500">Booking Reference:</span>
                  <span className="font-mono font-bold text-[#23055c]">
                    {selectedInvoice.bookingReference}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span className="text-slate-500">Payment Status:</span>
                  <span className="font-bold text-emerald-600 uppercase tracking-wider text-[11px]">
                    PAID / CONFIRMED
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 space-y-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase block">
                  Line Items
                </span>
                {selectedInvoice.lineItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between text-slate-700 py-0.5"
                  >
                    <span>
                      {item.description} (x{item.quantity})
                    </span>
                    <span className="font-semibold">
                      {selectedInvoice.currency}{" "}
                      {Number(item.amount).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-200 pt-3 flex justify-between items-center text-sm font-extrabold text-[#23055c]">
                <span>Total Paid:</span>
                <span className="text-base">
                  {selectedInvoice.currency}{" "}
                  {Number(selectedInvoice.total).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="no-print flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => downloadReceiptPdf(selectedInvoice)}
                className="flex-1 py-2.5 border border-[#23055c]/20 bg-[#faf9ff] hover:bg-[#23055c]/5 rounded-xl text-xs font-bold text-[#23055c] transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                title="Download PDF Receipt"
              >
                <Download className="h-3.5 w-3.5 text-[#23055c]" />
                <span>Download Receipt</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="flex-1 py-2.5 bg-[#23055c] hover:bg-[#392271] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancellingId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="h-6 w-6 shrink-0" />
              <h3 className="text-lg font-bold text-slate-900">
                Cancel Booking
              </h3>
            </div>
            <p className="text-xs text-slate-600">
              Are you sure you want to cancel this reservation? The slot will
              immediately be released for other members.
            </p>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Reason for Cancellation (Optional)
              </label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Change of schedule, emergency"
                className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-[#23055c]"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setCancellingId(null);
                  setCancelReason("");
                }}
                disabled={actionLoading}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Keep Booking
              </button>
              <button
                onClick={() => handleCancelBooking(cancellingId)}
                disabled={actionLoading}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {actionLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : null}
                <span>Confirm Cancel</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CustomerBookingsPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#23055c] mx-auto" />
          <p className="text-xs text-slate-500 font-semibold">
            Loading reservations...
          </p>
        </div>
      }
    >
      <BookingsContent />
    </Suspense>
  );
}
