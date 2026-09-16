"use client";

import React, { useState, useEffect, useCallback } from "react";
import { api } from "@daih/api-client";
import { useToast } from "@daih/ui";
import { CustomerReferralsResponse } from "@daih/types";
import {
  Copy,
  Check,
  Share2,
  Users,
  CheckCircle2,
  Clock,
  RefreshCw,
  Loader2,
  Send,
  MessageSquare,
  Mail,
} from "lucide-react";

export default function ReferralsPage() {
  const toast = useToast();
  const [data, setData] = useState<CustomerReferralsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const fetchReferrals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.referrals.getMyReferrals();
      setData(res);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load referral details.", {
        title: "Error Loading Referrals",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchReferrals();
  }, [fetchReferrals]);

  const handleCopyCode = () => {
    if (!data?.referralCode) return;
    navigator.clipboard.writeText(data.referralCode);
    setCopiedCode(true);
    toast.success("Referral code copied to clipboard!");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    if (!data?.referralLink) return;
    navigator.clipboard.writeText(data.referralLink);
    setCopiedLink(true);
    toast.success("Referral link copied to clipboard!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShareNative = async () => {
    if (!data?.referralLink) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join me at DAIH Workspace",
          text: `Use my referral code ${data.referralCode} to sign up and book workspaces at DAIH!`,
          url: data.referralLink,
        });
      } catch {
        // User cancelled or share failed
      }
    } else {
      handleCopyLink();
    }
  };

  const shareText = data
    ? encodeURIComponent(
        `Join me on DAIH Workspace! Use my referral code ${data.referralCode} or sign up using this link: ${data.referralLink}`,
      )
    : "";

  const whatsappUrl = `https://api.whatsapp.com/send?text=${shareText}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(data?.referralLink || "")}&text=${encodeURIComponent(`Join me on DAIH Workspace! Use referral code ${data?.referralCode || ""}`)}`;
  const mailUrl = `mailto:?subject=${encodeURIComponent("Join me on DAIH Workspace")}&body=${shareText}`;

  return (
    <div className="space-y-6 sm:space-y-8 max-w-5xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#181c20] tracking-tight flex items-center gap-2.5">
            <Users className="w-7 h-7 text-[#23055c]" />
            Referrals
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Invite colleagues and friends to DAIH Workspace. Track your invited
            members and their status.
          </p>
        </div>

        <button
          onClick={fetchReferrals}
          disabled={loading}
          className="self-start sm:self-auto p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition-all shadow-2xs cursor-pointer disabled:opacity-50"
          title="Refresh Data"
        >
          <RefreshCw
            className={`h-4 w-4 ${loading ? "animate-spin text-[#23055c]" : ""}`}
          />
        </button>
      </div>

      {loading && !data ? (
        <div className="py-24 text-center space-y-3 bg-white rounded-2xl border border-[#EBE7F5] shadow-xs">
          <Loader2 className="h-8 w-8 animate-spin text-[#23055c] mx-auto" />
          <p className="text-xs text-slate-500 font-semibold">
            Loading your referral dashboard...
          </p>
        </div>
      ) : (
        <>
          {/* Hero Referral Card */}
          <div className="bg-gradient-to-br from-[#23055c] via-[#2f136d] to-[#492e88] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
            {/* Subtle background glow decoration */}
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-48 h-48 bg-purple-400/10 rounded-full blur-xl pointer-events-none" />

            <div className="relative z-10 space-y-6">
              <div className="max-w-xl space-y-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-purple-200 text-xs font-semibold backdrop-blur-sm border border-white/10">
                  <Users className="w-3.5 h-3.5 text-purple-200" />
                  Your Personal Referral Code
                </span>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                  Share DAIH with your network
                </h2>
                <p className="text-xs sm:text-sm text-purple-100/80 leading-relaxed">
                  Give your friends seamless access to premium desks, meeting
                  rooms, and creative studios.
                </p>
              </div>

              {/* Code & Link Box */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Referral Code Box */}
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-purple-200 font-bold">
                      Referral Code
                    </p>
                    <p className="text-xl sm:text-2xl font-mono font-extrabold tracking-widest text-white mt-0.5">
                      {data?.referralCode || "..."}
                    </p>
                  </div>
                  <button
                    onClick={handleCopyCode}
                    className="px-4 py-2.5 rounded-xl bg-white text-[#23055c] hover:bg-purple-50 font-bold text-xs transition-all shadow-sm flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    {copiedCode ? (
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

                {/* Referral Link Box */}
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 flex items-center justify-between gap-3 min-w-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] uppercase tracking-wider text-purple-200 font-bold">
                      Shareable Link
                    </p>
                    <p className="text-xs font-mono text-purple-100 truncate mt-1">
                      {data?.referralLink || "..."}
                    </p>
                  </div>
                  <button
                    onClick={handleCopyLink}
                    className="px-4 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs transition-all border border-white/20 flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Quick Share Actions */}
              <div className="pt-2 flex flex-wrap items-center gap-2.5 text-xs">
                <span className="text-purple-200 font-medium mr-1">
                  Quick Share:
                </span>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-emerald-600/90 hover:bg-emerald-600 text-white font-semibold transition-all flex items-center gap-1.5 shadow-xs"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  WhatsApp
                </a>
                <a
                  href={telegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-sky-600/90 hover:bg-sky-600 text-white font-semibold transition-all flex items-center gap-1.5 shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  Telegram
                </a>
                <a
                  href={mailUrl}
                  className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-semibold transition-all flex items-center gap-1.5 border border-white/10"
                >
                  <Mail className="w-3.5 h-3.5" />
                  Email
                </a>
                <button
                  onClick={handleShareNative}
                  className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-semibold transition-all flex items-center gap-1.5 border border-white/10 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  More Options
                </button>
              </div>
            </div>
          </div>

          {/* 3 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-[#EBE7F5] p-5 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-[#23055c] flex items-center justify-center font-bold shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Total Referred
                </p>
                <p className="text-2xl font-extrabold text-slate-900 mt-0.5">
                  {data?.totalReferred ?? 0}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#EBE7F5] p-5 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Active
                </p>
                <p className="text-2xl font-extrabold text-emerald-700 mt-0.5">
                  {data?.activeReferred ?? 0}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#EBE7F5] p-5 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Inactive
                </p>
                <p className="text-2xl font-extrabold text-amber-700 mt-0.5">
                  {data?.inactiveReferred ?? 0}
                </p>
              </div>
            </div>
          </div>

          {/* Referred Members Directory */}
          <div className="bg-white rounded-2xl border border-[#EBE7F5] shadow-xs overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-[#EBE7F5] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Referred Members
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  List of friends who joined DAIH with your referral code.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                {data?.referredUsers?.length ?? 0} members
              </span>
            </div>

            {!data?.referredUsers || data.referredUsers.length === 0 ? (
              <div className="py-16 text-center space-y-3 px-4">
                <div className="w-12 h-12 rounded-full bg-purple-50 text-[#23055c] flex items-center justify-center mx-auto">
                  <Users className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-800">
                  No referrals yet
                </p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Share your referral link with colleagues and friends. Once
                  they sign up and make a booking, they will appear here.
                </p>
                <button
                  onClick={handleCopyLink}
                  className="mt-2 px-4 py-2 bg-[#23055c] hover:bg-[#392271] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy Referral Link
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F8F9FA] border-b border-[#EBE7F5] text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <th className="p-4">Member Name</th>
                      <th className="p-4">Joined Date</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Bookings</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EBE7F5] text-xs text-slate-800">
                    {data.referredUsers.map((member) => (
                      <tr
                        key={member.id}
                        className="hover:bg-slate-50/70 transition-colors"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#23055c] to-[#65519f] text-white flex items-center justify-center font-bold text-xs shrink-0">
                              {member.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">
                                {member.name}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                {member.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-slate-600">
                          {new Date(member.joinedAt).toLocaleDateString(
                            "en-NG",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            },
                          )}
                        </td>
                        <td className="p-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold ${
                              member.isActive
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            {member.status}
                          </span>
                        </td>
                        <td className="p-4 text-right font-semibold text-slate-700">
                          {member.paidBookingsCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
