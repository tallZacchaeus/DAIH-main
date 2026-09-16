"use client";

import React from "react";
import { CalendarDays, Users, MapPin, Clock, ArrowRight } from "lucide-react";
import Link from "next/link";

export interface ReservationItem {
  id: string;
  title: string;
  venue: string;
  organizer: string;
  timeSlot: string;
  attendees: number;
  status: "Confirmed" | "In-Progress" | "Scheduled";
}

const defaultReservations: ReservationItem[] = [
  {
    id: "ev-1",
    title: "Ogun Tech Founders Demo Day 2026",
    venue: "Conference Hall (Auditorium)",
    organizer: "Ogun Innovate Ecosystem",
    timeSlot: "02:00 PM - 05:30 PM",
    attendees: 110,
    status: "Confirmed",
  },
  {
    id: "ev-2",
    title: "Fullstack AI & Next.js Masterclass",
    venue: "Innovation Training Room",
    organizer: "DAIH Tech Academy",
    timeSlot: "10:00 AM - 01:00 PM",
    attendees: 28,
    status: "In-Progress",
  },
  {
    id: "ev-3",
    title: "Fintech Board Strategy Meeting",
    venue: "Executive Boardroom A",
    organizer: "Vertex Capital Africa",
    timeSlot: "03:30 PM - 05:00 PM",
    attendees: 10,
    status: "Scheduled",
  },
];

export const UpcomingReservations: React.FC<{
  reservations?: ReservationItem[];
}> = ({ reservations = defaultReservations }) => {
  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-[#23055c]" />
            Today\'s Hall & Training Room Events
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            Daily Schedule
          </span>
        </div>

        <div className="space-y-3">
          {reservations.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition-all hover:border-slate-300"
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                  {item.title}
                </h3>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-100 text-[#23055c] shrink-0">
                  {item.status}
                </span>
              </div>

              <p className="text-xs text-slate-600 font-medium flex items-center gap-1 mb-2">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {item.venue}
              </p>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[11px] text-slate-500">
                <span className="flex items-center gap-1 font-mono font-medium text-slate-700">
                  <Clock className="w-3 h-3 text-amber-500" />
                  {item.timeSlot}
                </span>
                <span className="flex items-center gap-1 font-semibold text-slate-600">
                  <Users className="w-3 h-3 text-slate-400" />
                  {item.attendees} delegates
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 text-center">
        <Link
          href="/operations"
          className="text-xs font-bold text-[#23055c] hover:text-[#392271] transition-colors inline-flex items-center gap-1"
        >
          <span>Manage Venue Bookings</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};
