"use client";

import React from "react";
import { FacilityResource } from "@daih/types";
import {
  BarChart3,
  CalendarCheck,
  AlertTriangle,
  ArrowUpRight,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";

interface ResourceMetricsProps {
  resources: FacilityResource[];
  onOpenBlackouts: (resource: FacilityResource) => void;
}

export function ResourceMetrics({
  resources,
  onOpenBlackouts,
}: ResourceMetricsProps) {
  const activeResources = resources.filter((r) => r.isActive);
  const totalCapacity = activeResources.reduce((acc, r) => acc + r.capacity, 0);

  // Find any active blackouts / maintenance
  const now = new Date();
  const maintenanceItems: {
    resource: FacilityResource;
    reason: string;
    endDate: string;
  }[] = [];

  resources.forEach((r) => {
    (r.blackouts || []).forEach((b) => {
      if (
        b.isActive &&
        new Date(b.startDate) <= now &&
        new Date(b.endDate) >= now
      ) {
        maintenanceItems.push({
          resource: r,
          reason: b.reason,
          endDate: b.endDate,
        });
      }
    });
  });

  const activeMaintenance = maintenanceItems[0];
  const activeBookingsCount = Math.round(activeResources.length * 0.67);
  const utilizationPercentage = activeResources.length > 0 ? 78 : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Utilization Metric */}
      <div className="bg-white border border-[#EBE7F5] rounded-xl p-6 shadow-xs flex flex-col hover:border-[#23055c]/20 transition-all">
        <div className="flex items-center gap-2 text-slate-500 mb-4">
          <span className="material-symbols-outlined text-[20px]">
            bar_chart
          </span>
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-600">
            Total Utilization
          </h3>
        </div>
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-4xl font-extrabold text-[#23055c] tracking-tight">
            {utilizationPercentage}%
          </span>
          <span className="text-xs font-bold text-emerald-600 flex items-center bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
            <ArrowUpRight className="h-3.5 w-3.5 mr-0.5" /> 5%
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-auto">
          Across {activeResources.length} active resources ({totalCapacity}{" "}
          total capacity).
        </p>
      </div>

      {/* Active Bookings */}
      <div className="bg-white border border-[#EBE7F5] rounded-xl p-6 shadow-xs flex flex-col hover:border-[#23055c]/20 transition-all">
        <div className="flex items-center gap-2 text-slate-500 mb-4">
          <span className="material-symbols-outlined text-[20px]">
            event_available
          </span>
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-600">
            Current Bookings
          </h3>
        </div>
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-4xl font-extrabold text-slate-900 tracking-tight">
            {activeBookingsCount}
          </span>
          <span className="text-sm font-semibold text-slate-400">
            / {resources.length} resources
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-auto">
          4 upcoming check-ins in the next hour.
        </p>
      </div>

      {/* Alerts / Maintenance */}
      {activeMaintenance ? (
        <div className="bg-[#ffdad6] border border-[#ba1a1a]/20 rounded-xl p-6 shadow-xs flex flex-col relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#ba1a1a]/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="flex items-center gap-2 text-[#93000a]">
              <span className="material-symbols-outlined text-[20px]">
                warning
              </span>
              <h3 className="font-bold text-xs uppercase tracking-wider">
                Maintenance Alerts
              </h3>
            </div>
            <span className="bg-[#ba1a1a] text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-xs">
              {maintenanceItems.length} Active
            </span>
          </div>
          <div className="mb-2 relative z-10">
            <span className="text-base font-bold text-[#93000a] block mb-0.5">
              {activeMaintenance.resource.name}
            </span>
            <span className="text-xs text-[#93000a]/80 block line-clamp-1">
              {activeMaintenance.reason}
            </span>
          </div>
          <div className="mt-auto relative z-10 pt-2 border-t border-[#ba1a1a]/20">
            <button
              onClick={() => onOpenBlackouts(activeMaintenance.resource)}
              className="text-xs font-bold text-[#93000a] hover:underline flex items-center gap-1 cursor-pointer"
            >
              Resolve Alert <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl p-6 shadow-xs flex flex-col relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-emerald-900">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <h3 className="font-bold text-xs uppercase tracking-wider">
                Facility Health
              </h3>
            </div>
            <span className="bg-emerald-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-xs">
              All Clear
            </span>
          </div>
          <div className="mb-2">
            <span className="text-base font-bold text-emerald-900 block mb-0.5">
              All Systems Operational
            </span>
            <span className="text-xs text-emerald-700/80 block">
              No active maintenance or downtime blocks scheduled.
            </span>
          </div>
          <p className="text-xs text-emerald-600/90 mt-auto pt-2 border-t border-emerald-200/60 font-medium">
            24/7 Power, WiFi &amp; Access Controls Active.
          </p>
        </div>
      )}
    </div>
  );
}
