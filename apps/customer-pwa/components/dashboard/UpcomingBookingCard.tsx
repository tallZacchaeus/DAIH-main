"use client";

import React from "react";
import Link from "next/link";
import { Clock, MapPin } from "lucide-react";

interface UpcomingBookingCardProps {
  title?: string;
  time?: string;
  location?: string;
  detailsHref?: string;
  badge?: string;
  badgeColor?: "purple" | "emerald" | "amber" | "rose";
  loading?: boolean;
}

export const UpcomingBookingCard: React.FC<UpcomingBookingCardProps> = ({
  title = "Meeting Room",
  time = "",
  location,
  detailsHref = "/bookings",
  badge,
  badgeColor = "purple",
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="bg-white border border-purple-100/90 rounded-2xl shadow-sm p-5 sm:p-6 animate-pulse">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-5 w-44 bg-slate-200 rounded-md" />
            <div className="h-3.5 w-60 bg-slate-100 rounded-md" />
          </div>
          <div className="h-9 w-28 bg-slate-200 rounded-xl" />
        </div>
      </div>
    );
  }

  const getBadgeClasses = () => {
    switch (badgeColor) {
      case "emerald":
        return "bg-emerald-50 text-emerald-700 border border-emerald-200/80";
      case "amber":
        return "bg-amber-50 text-amber-700 border border-amber-200/80";
      case "rose":
        return "bg-rose-50 text-rose-700 border border-rose-200/80";
      case "purple":
      default:
        return "bg-purple-50 text-[#23055c] border border-purple-100";
    }
  };

  return (
    <div className="bg-white border border-purple-100/90 rounded-2xl shadow-sm p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:shadow-md hover:border-purple-200">
      <div className="space-y-1.5 min-w-0">
        <div className="flex items-center gap-2.5">
          <h4 className="text-base sm:text-lg font-bold text-[#181c20] tracking-tight truncate">
            {title}
          </h4>
          {badge && (
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0 ${getBadgeClasses()}`}
            >
              {badge}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
          {time && (
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#23055c]" />
              {time}
            </span>
          )}
          {location && (
            <span className="flex items-center gap-1.5 text-slate-400">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              {location}
            </span>
          )}
        </div>
      </div>

      <Link
        href={detailsHref}
        className="px-5 py-2 bg-transparent border border-[#23055c] text-[#23055c] hover:bg-[#23055c] hover:text-white font-bold text-xs rounded-xl transition-all text-center whitespace-nowrap cursor-pointer shadow-xs self-start sm:self-auto"
      >
        View Details
      </Link>
    </div>
  );
};
