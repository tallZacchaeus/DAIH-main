"use client";

import React, { useState } from "react";
import {
  Wifi,
  WifiOff,
  Copy,
  Check,
  Lock,
  QrCode,
  ArrowRight,
  ShieldCheck,
  Clock,
} from "lucide-react";
import { useToast } from "@daih/ui";
import Link from "next/link";
import { WifiAccessStatus, WifiLockReason } from "@daih/types";

interface WifiAccessCardProps {
  isCheckedIn?: boolean;
  isOnBreak?: boolean;
  status?: WifiAccessStatus;
  lockReason?: WifiLockReason;
  networkName?: string;
  username?: string;
  password?: string;
  validUntil?: string;
  loading?: boolean;
}

export const WifiAccessCard: React.FC<WifiAccessCardProps> = ({
  isCheckedIn = false,
  isOnBreak = false,
  status,
  lockReason,
  networkName = "DAIH-Member-HighSpeed",
  username,
  password = "N/A",
  validUntil,
  loading = false,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const toast = useToast();

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(label);
      toast.success(`${label} copied to clipboard!`, {
        title: "Wi-Fi Connected",
      });
      setTimeout(() => setCopiedKey(null), 2500);
    } catch {
      toast.info(`${label}: ${text}`, { title: "Wi-Fi Details" });
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-slate-100 rounded-2xl shadow-xs p-5 animate-pulse">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-slate-100" />
          <div className="space-y-1.5 flex-1">
            <div className="h-3 w-20 bg-slate-100 rounded" />
            <div className="h-4 w-32 bg-slate-100 rounded" />
          </div>
        </div>
      </div>
    );
  }

  // Derive resolved status
  const effectiveStatus: WifiAccessStatus =
    status ||
    (isCheckedIn || isOnBreak
      ? "ACTIVE"
      : lockReason === "SUBSCRIPTION_EXPIRED"
        ? "EXPIRED"
        : "LOCKED_PENDING_DAILY_CHECKIN");

  const formattedValidUntil = validUntil
    ? new Date(validUntil).toLocaleTimeString("en-NG", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : "11:59 PM";

  // 1. ACTIVE STATE: Checked in or mid-day break within valid window
  if (effectiveStatus === "ACTIVE") {
    return (
      <div className="bg-white border border-purple-100 rounded-2xl shadow-xs p-5 space-y-3.5 animate-in fade-in duration-200">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-purple-50 text-[#23055c] flex items-center justify-center shrink-0 border border-purple-100/60 shadow-xs">
              <Wifi className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Wi-Fi Details
                </h3>
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    isOnBreak
                      ? "bg-amber-500 ring-2 ring-amber-100"
                      : "bg-emerald-500 ring-2 ring-emerald-100 animate-pulse"
                  }`}
                  title={
                    isOnBreak ? "On Break (Wi-Fi Connected)" : "Wi-Fi Connected"
                  }
                />
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
              <Clock className="w-2.5 h-2.5 text-slate-400" />
              Until {formattedValidUntil}
            </span>
          </div>
        </div>

        {isOnBreak && (
          <p className="text-[11px] text-amber-700 bg-amber-50/50 p-2.5 rounded-xl border border-amber-200/60 leading-relaxed">
            Stepped out &bull; Credentials remain active until{" "}
            {formattedValidUntil}.
          </p>
        )}

        {/* Credentials Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {username && (
            <div className="p-2.5 bg-purple-50/50 rounded-xl border border-purple-100 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                  Username
                </span>
                <span className="font-mono text-xs font-bold text-[#23055c] truncate block">
                  {username}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(username, "Username")}
                className="text-slate-400 hover:text-[#23055c] p-1 rounded-lg hover:bg-purple-100/50 transition cursor-pointer"
                title="Copy Username"
              >
                {copiedKey === "Username" ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          )}

          <div
            className={`p-2.5 bg-purple-50/60 rounded-xl border border-purple-100 flex items-center justify-between gap-2 ${
              !username ? "sm:col-span-2" : ""
            }`}
          >
            <div className="min-w-0">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                Password / PIN
              </span>
              <span className="font-mono text-xs font-bold text-[#23055c] truncate block">
                {password}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(password, "Password")}
              className="text-[11px] font-bold text-[#23055c] hover:underline cursor-pointer shrink-0 px-2 py-1 rounded-lg hover:bg-purple-100/50 transition flex items-center gap-1"
            >
              {copiedKey === "Password" ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. EXPIRED STATE: Subscription duration ended
  if (effectiveStatus === "EXPIRED") {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center shrink-0 border border-slate-200/60">
              <WifiOff className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900">
                Wi-Fi Details
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className="w-2 h-2 rounded-full shrink-0 bg-slate-300 ring-2 ring-slate-100"
                  title="Pass Expired"
                />
                <p className="text-xs font-semibold text-slate-500 truncate">
                  Pass Expired
                </p>
              </div>
            </div>
          </div>

          <Link
            href="/book"
            className="p-2 text-primary hover:bg-purple-50 rounded-xl transition-colors shrink-0 flex items-center gap-1 text-[11px] font-bold"
            title="Book Workspace"
          >
            <span className="hidden sm:inline">Renew</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between gap-3">
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Your workspace pass has expired. Book a new pass or renew your
            subscription to access workspace Wi-Fi.
          </p>
          <Link
            href="/book"
            className="shrink-0 text-xs font-bold text-primary hover:underline"
          >
            Book Space
          </Link>
        </div>
      </div>
    );
  }

  // 3. DAILY LOCKED STATE: Active pass, but check-in required today (end of day lock / next day arrival)
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs p-5 space-y-3.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200/60 shadow-xs">
            <Lock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900">Wi-Fi Details</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 ring-2 ring-amber-100" />
              <p className="text-xs font-semibold text-slate-700 truncate">
                Locked &bull; Check-in Required
              </p>
            </div>
          </div>
        </div>

        <Link
          href="/qr"
          className="px-3.5 py-1.5 bg-[#23055c] hover:bg-[#340a82] text-white rounded-xl transition-all shrink-0 flex items-center gap-1.5 text-xs font-bold shadow-xs cursor-pointer"
          title="Open Digital Pass"
        >
          <QrCode className="w-3.5 h-3.5" />
          <span>Check In</span>
        </Link>
      </div>

      <div className="p-3 bg-amber-50/40 rounded-xl border border-amber-100 text-[11px] text-slate-600 leading-relaxed">
        Scan your digital pass at reception upon arrival to unlock today&apos;s
        high-speed connection.
      </div>
    </div>
  );
};
