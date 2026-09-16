"use client";

import React from "react";
import {
  CreditCard,
  Calendar,
  QrCode,
  ArrowUpRight,
  Activity,
} from "lucide-react";
import Link from "next/link";

export interface ActivityItem {
  id: string;
  title: string;
  time: string;
  iconType?: "payment" | "booking" | "access";
  amount?: string | null;
  status?: string;
}

interface RecentActivityCardProps {
  activities?: ActivityItem[];
  loading?: boolean;
}

export const RecentActivityCard: React.FC<RecentActivityCardProps> = ({
  activities = [],
  loading = false,
}) => {
  const getIcon = (type?: "payment" | "booking" | "access") => {
    switch (type) {
      case "payment":
        return CreditCard;
      case "access":
        return QrCode;
      case "booking":
      default:
        return Calendar;
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-purple-100 rounded-2xl shadow-sm p-6 space-y-4 animate-pulse">
        <div className="h-4 w-28 bg-slate-200 rounded" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-slate-200 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-3/4 bg-slate-200 rounded" />
                <div className="h-2.5 w-1/2 bg-slate-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-purple-100 rounded-2xl shadow-sm p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Recent Activity
        </h3>
        <Link
          href="/bookings"
          title="View All Activity"
          className="text-slate-400 hover:text-[#23055c] transition-colors"
        >
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>

      {activities.length === 0 ? (
        <div className="py-4 text-center space-y-1">
          <Activity className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
          <p className="text-xs font-semibold text-slate-600">
            No Recent Activity
          </p>
          <p className="text-[11px] text-slate-400">
            Bookings and payment transactions will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {activities.map((item) => {
            const Icon = getIcon(item.iconType);
            return (
              <div key={item.id} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-[#23055c] flex items-center justify-center shrink-0 mt-0.5 border border-purple-100/60">
                  <Icon className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#181c20] truncate">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {item.time}
                    </p>
                  </div>
                  {item.amount && (
                    <span className="text-xs font-bold text-rose-600 shrink-0">
                      {item.amount}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
