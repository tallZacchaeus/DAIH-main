"use client";

import React from "react";
import { UserRole } from "@daih/types";
import {
  Users,
  UserCheck,
  DollarSign,
  Armchair,
  Clock,
  LogOut,
  TrendingUp,
  Calendar,
  CheckCircle2,
} from "lucide-react";

export interface DashboardKpiData {
  dailyVisitors: number;
  currentlyOnSite?: number;
  weeklyVisitors: number;
  monthlyVisitors: number;
  repeatCustomersRate: string;
  repeatCustomersCount: number;
  totalRevenueMtd: string;
  revenueToday: string;
  occupancyRate: number;
  occupiedSeats: number;
  totalSeats: number;
  peakHourWindow: string;
  peakOccupancyRate: number;
  todayBookingsCount?: number;
  todayDeparturesCount?: number;
}

interface KpiGridProps {
  data?: Partial<DashboardKpiData>;
  loading?: boolean;
  mode?: "daily" | "full";
  role?: UserRole | string | null;
}

export const KpiGrid: React.FC<KpiGridProps> = ({
  data,
  loading = false,
  mode = "daily",
  role,
}) => {
  const isSecurity = role === UserRole.SECURITY_OFFICER;
  const isReception = role === UserRole.RECEPTION_OFFICER;
  if (loading) {
    return (
      <div className="space-y-6 mb-8 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white p-5 rounded-2xl border border-accent-soft space-y-3 shadow-xs"
            >
              <div className="h-8 w-8 bg-slate-200 rounded-xl" />
              <div className="h-4 w-24 bg-slate-200 rounded" />
              <div className="h-7 w-20 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const kpi: DashboardKpiData = {
    dailyVisitors: data?.dailyVisitors ?? 0,
    currentlyOnSite: data?.currentlyOnSite ?? data?.occupiedSeats ?? 0,
    weeklyVisitors: data?.weeklyVisitors ?? 0,
    monthlyVisitors: data?.monthlyVisitors ?? 0,
    repeatCustomersRate: data?.repeatCustomersRate || "0%",
    repeatCustomersCount: data?.repeatCustomersCount ?? 0,
    totalRevenueMtd: data?.totalRevenueMtd || "₦0.00",
    revenueToday: data?.revenueToday || "₦0.00",
    occupancyRate: data?.occupancyRate ?? 0,
    occupiedSeats: data?.occupiedSeats ?? 0,
    totalSeats: data?.totalSeats ?? 104,
    peakHourWindow: data?.peakHourWindow || "11:00 AM – 03:30 PM",
    peakOccupancyRate: data?.peakOccupancyRate ?? 0,
    todayBookingsCount: data?.todayBookingsCount ?? data?.dailyVisitors ?? 0,
    todayDeparturesCount: data?.todayDeparturesCount ?? 0,
  };

  if (mode === "daily") {
    return (
      <div className="space-y-4 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Today's Live Floor Operations & Telemetry
            </span>
          </div>
          <span className="text-[11px] font-semibold text-slate-400">
            Real-Time Shift Stats
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* 1. Today's Check-ins */}
          <div className="bg-white p-5 rounded-2xl border border-accent-soft shadow-xs hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-3">
              <div className="w-9 h-9 bg-purple-50 rounded-xl text-[#23055c] flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase bg-purple-50 text-[#23055c] border border-purple-200 px-2 py-0.5 rounded-full">
                Today
              </span>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">
                Today's Visitors (Check-Ins)
              </p>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                {kpi.dailyVisitors.toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-400 mt-1 font-medium">
                {kpi.currentlyOnSite} currently active on-site
              </p>
            </div>
          </div>

          {/* 2. Role-Regulated Metric: Expected Bookings (Reception) | Departures (Security) | Today's Revenue (Finance/Admin/Management) */}
          {isReception ? (
            <div className="bg-white p-5 rounded-2xl border border-accent-soft shadow-xs hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-3">
                <div className="w-9 h-9 bg-purple-50 rounded-xl text-[#23055c] flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase bg-purple-50 text-[#23055c] border border-purple-200 px-2 py-0.5 rounded-full">
                  Shift Schedule
                </span>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">
                  Expected Reservations
                </p>
                <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 truncate">
                  {(kpi.todayBookingsCount ?? 0).toLocaleString()}
                </p>
                <p className="text-[11px] text-slate-400 mt-1 font-medium">
                  Confirmed bookings scheduled for today
                </p>
              </div>
            </div>
          ) : isSecurity ? (
            <div className="bg-white p-5 rounded-2xl border border-accent-soft shadow-xs hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-3">
                <div className="w-9 h-9 bg-blue-50 rounded-xl text-blue-700 flex items-center justify-center">
                  <LogOut className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-full">
                  Gate Logs
                </span>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">
                  Departures Logged
                </p>
                <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 truncate">
                  {(kpi.todayDeparturesCount ?? 0).toLocaleString()}
                </p>
                <p className="text-[11px] text-slate-400 mt-1 font-medium">
                  Verified exit check-outs recorded today
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white p-5 rounded-2xl border border-accent-soft shadow-xs hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-3">
                <div className="w-9 h-9 bg-emerald-50 rounded-xl text-emerald-700 flex items-center justify-center font-bold text-base">
                  ₦
                </div>
                <span className="text-[10px] font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Settled
                </span>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">
                  Today's Revenue
                </p>
                <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 truncate">
                  {kpi.revenueToday}
                </p>
                <p className="text-[11px] text-slate-400 mt-1 font-medium">
                  Paystack verified transactions today
                </p>
              </div>
            </div>
          )}

          {/* 3. Live Occupancy */}
          <div className="bg-white p-5 rounded-2xl border border-accent-soft shadow-xs hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-3">
              <div className="w-9 h-9 bg-amber-50 rounded-xl text-amber-700 flex items-center justify-center">
                <Armchair className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full">
                {kpi.occupancyRate}% Live
              </span>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">
                Live Space Occupancy
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                  {kpi.occupancyRate}%
                </p>
                <span className="text-xs text-slate-500 font-mono">
                  {kpi.occupiedSeats} / {kpi.totalSeats} Seats
                </span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2.5 overflow-hidden border border-slate-200">
                <div
                  className="bg-gradient-to-r from-[#23055c] to-[#65519f] h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${Math.min(100, Math.max(0, kpi.occupancyRate))}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* 4. Peak Hours & Schedule */}
          <div className="bg-white p-5 rounded-2xl border border-accent-soft shadow-xs hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-3">
              <div className="w-9 h-9 bg-blue-50 rounded-xl text-blue-700 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-full">
                {kpi.todayBookingsCount} Booked
              </span>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">
                Peak Hour Window
              </p>
              <p className="text-base sm:text-lg font-bold text-slate-900 mt-1.5">
                {kpi.peakHourWindow}
              </p>
              <p className="text-[11px] text-slate-400 mt-1 font-medium">
                {kpi.todayDeparturesCount} departures logged today
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Full / Multi-Period Mode (used in Reports / Analytics if needed)
  return (
    <div className="space-y-6 mb-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Daily Visitors */}
        <div className="bg-white p-5 rounded-2xl border border-accent-soft shadow-xs">
          <p className="text-xs font-semibold text-slate-500">Daily Visitors</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">
            {kpi.dailyVisitors}
          </p>
        </div>
        {/* Weekly Visitors */}
        <div className="bg-white p-5 rounded-2xl border border-accent-soft shadow-xs">
          <p className="text-xs font-semibold text-slate-500">
            Weekly Visitors
          </p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">
            {kpi.weeklyVisitors}
          </p>
        </div>
        {/* Monthly Visitors */}
        <div className="bg-white p-5 rounded-2xl border border-accent-soft shadow-xs">
          <p className="text-xs font-semibold text-slate-500">
            Monthly Visitors
          </p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">
            {kpi.monthlyVisitors}
          </p>
        </div>
        {/* Retention */}
        <div className="bg-white p-5 rounded-2xl border border-accent-soft shadow-xs">
          <p className="text-xs font-semibold text-slate-500">
            Repeat Retention
          </p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">
            {kpi.repeatCustomersRate}
          </p>
        </div>
      </div>
    </div>
  );
};
