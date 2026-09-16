"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { QRDisplay } from "@daih/ui";
import { api, useAuth } from "@daih/api-client";
import { BookingSummary, BookingState } from "@daih/types";
import {
  ShieldAlert,
  Loader2,
  Calendar,
  ArrowRight,
  Wifi,
  Clock,
  CheckCircle2,
  Info,
} from "lucide-react";
import Link from "next/link";

function QRContent() {
  const searchParams = useSearchParams();
  const requestedBookingId = searchParams.get("bookingId");
  const { user } = useAuth();
  const [confirmedBooking, setConfirmedBooking] =
    useState<BookingSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const now = new Date();

    api.bookings
      .getMyBookings()
      .then((bookings) => {
        if (!isMounted) return;
        const validPasses = (bookings || []).filter(
          (b) =>
            [
              BookingState.CONFIRMED,
              BookingState.ACTIVE,
              BookingState.CHECKED_IN,
              BookingState.CHECKED_OUT,
            ].includes(b.state) &&
            Boolean(b.qrToken) &&
            new Date(b.endTime) >= now,
        );

        if (requestedBookingId) {
          const specific = validPasses.find((b) => b.id === requestedBookingId);
          setConfirmedBooking(specific || validPasses[0] || null);
        } else {
          setConfirmedBooking(validPasses[0] || null);
        }
      })
      .catch((err) => {
        console.warn(
          "Could not fetch active bookings for QR pass:",
          err?.message,
        );
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [requestedBookingId]);

  return (
    <div className="max-w-md mx-auto py-6 space-y-6">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Digital Access Pass
        </h1>
        <p className="text-xs text-slate-500">
          Present this QR code at DAIH Reception or Security Gate
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white border border-slate-200 rounded-2xl shadow-sm text-slate-400 space-y-3">
          <Loader2 className="h-6 w-6 animate-spin text-[#23055c]" />
          <span className="text-xs font-semibold">Loading access pass...</span>
        </div>
      ) : confirmedBooking && confirmedBooking.qrToken ? (
        <div className="space-y-4">
          <QRDisplay
            token={confirmedBooking.qrToken}
            bookingRef={confirmedBooking.reference}
            customerName={`${confirmedBooking.customerName}${user?.clientId ? ` (${user.clientId})` : ""}`}
            validUntil={new Date(confirmedBooking.endTime).toLocaleString(
              "en-NG",
              {
                dateStyle: "medium",
                timeStyle: "short",
              },
            )}
          />

          {/* Wi-Fi & Continuous Access Card (When Checked In Today) */}
          {(() => {
            const now = new Date();
            const isCheckedInToday = Boolean(
              confirmedBooking.checkedInToday ||
              confirmedBooking.wifiCredentials != null ||
              (confirmedBooking.state === BookingState.CHECKED_IN &&
                confirmedBooking.checkedInAt &&
                new Date(confirmedBooking.checkedInAt).toDateString() ===
                  now.toDateString()),
            );

            if (isCheckedInToday) {
              const ssid =
                confirmedBooking.wifiCredentials?.ssid ||
                "DAIH-Member-HighSpeed";
              const pin =
                confirmedBooking.wifiCredentials?.pin ||
                confirmedBooking.reference.slice(-6);

              return (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                      <Wifi className="w-4 h-4 text-emerald-600" />
                      <span>High-Speed Workspace Wi-Fi</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                      {confirmedBooking.state === BookingState.CHECKED_IN
                        ? "Checked In Today"
                        : "Midday Break (Connected)"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs bg-white/80 p-2.5 rounded-xl border border-emerald-100 font-mono">
                    <div>
                      <span className="text-[10px] text-slate-500 block font-sans">
                        Network (SSID)
                      </span>
                      <span className="font-bold text-slate-800">{ssid}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block font-sans">
                        Password / PIN
                      </span>
                      <span className="font-bold text-emerald-700">{pin}</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-emerald-700 leading-tight">
                    {confirmedBooking.state === BookingState.CHECKED_OUT
                      ? "✓ Your Wi-Fi remains active during your break. Scan your pass again at reception when you return."
                      : "✓ Active until end of today. Scan at reception upon arrival each day."}
                  </p>
                </div>
              );
            }

            return (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <Wifi className="w-4 h-4 text-slate-400" />
                    <span>Member Wi-Fi (Locked)</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200/70 text-slate-600">
                    Check-in Required Today
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Wi-Fi credentials reset at the end of each day and unlock
                  automatically once you scan your digital pass at reception
                  each day.
                </p>
              </div>
            );
          })()}

          {/* Scheduled Window Policy Note */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-600 flex items-start gap-2">
            <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
            <p>
              Check-in opens at{" "}
              <strong>
                {new Date(confirmedBooking.startTime).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </strong>
              . Early check-in is not permitted. Access concludes at{" "}
              <strong>
                {new Date(confirmedBooking.endTime).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </strong>
              .
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900">
              No Active Access Pass
            </h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              You do not have a currently active workspace reservation. Past or
              missed bookings cannot be used for access.
            </p>
          </div>
          <div className="flex gap-2 justify-center pt-2">
            <Link
              href="/bookings"
              className="inline-flex items-center justify-center gap-1.5 border border-slate-200 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-slate-50 transition-all"
            >
              <span>View History</span>
            </Link>
            <Link
              href="/book"
              className="inline-flex items-center justify-center gap-1.5 bg-[#23055c] hover:bg-[#392271] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all"
            >
              <span>Book Space</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function QRPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-md mx-auto py-12 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="h-6 w-6 animate-spin text-[#23055c]" />
          <span className="text-xs font-semibold text-slate-400">
            Loading access pass...
          </span>
        </div>
      }
    >
      <QRContent />
    </Suspense>
  );
}
