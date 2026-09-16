"use client";

import React from "react";
import Link from "next/link";
import { Building2 } from "lucide-react";

export interface FacilityUtilization {
  id: string;
  name: string;
  type: string;
  utilizationRate: number;
  paidBookingsCount: number;
  activeOccupancy: string;
  status: "High Demand" | "Active" | "Available";
  barColorClass: string;
}

interface MostUsedFacilitiesProps {
  facilities?: FacilityUtilization[];
  loading?: boolean;
}

const colorPalette = [
  "bg-primary-container",
  "bg-secondary",
  "bg-on-tertiary-container",
  "bg-[#10b981]",
  "bg-[#0ea5e9]",
  "bg-[#f59e0b]",
];

export const MostUsedFacilities: React.FC<MostUsedFacilitiesProps> = ({
  facilities = [],
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="bg-surface-container-lowest rounded-lg border border-accent-soft p-6 elevation-1 animate-pulse h-full">
        <div className="flex justify-between items-center mb-5 pb-3 border-b border-accent-soft">
          <div className="h-5 w-44 bg-slate-200 rounded" />
          <div className="h-4 w-28 bg-slate-200 rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="p-4 bg-slate-100 rounded border border-slate-200 h-28"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-container-lowest rounded-lg border border-accent-soft p-6 elevation-1 flex flex-col justify-between h-full">
      <div>
        <div className="flex justify-between items-center mb-5 pb-3 border-b border-accent-soft">
          <div>
            <h3 className="font-headline-sm text-[20px] leading-[28px] font-semibold text-on-surface">
              Most Used Facilities
            </h3>
            <p className="font-body-md text-xs text-on-surface-variant mt-0.5">
              Workspace &amp; meeting room utilization rankings based on paid
              bookings
            </p>
          </div>
          <Link
            href="/operations"
            className="font-label-sm text-label-sm text-primary hover:underline font-semibold flex items-center gap-1"
          >
            Manage Inventory
            <span className="material-symbols-outlined text-[16px]">
              arrow_forward
            </span>
          </Link>
        </div>

        {facilities.length === 0 ? (
          <div className="py-12 text-center text-on-surface-variant text-xs">
            <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-on-surface mb-1">
              No Facility Activity Yet
            </p>
            <p className="text-[11px] text-slate-400">
              Rankings will dynamically compute as verified paid bookings are
              logged.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {facilities.map((fac, idx) => {
              const barColor =
                fac.barColorClass || colorPalette[idx % colorPalette.length];
              return (
                <div
                  key={fac.id}
                  className="p-4 bg-workspace-surface rounded-DEFAULT border border-accent-soft/70 hover:border-primary-container transition-all hover:shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center font-mono shrink-0">
                          #{idx + 1}
                        </span>
                        <h4 className="font-label-md text-label-md text-on-surface font-semibold truncate">
                          {fac.name}
                        </h4>
                      </div>
                      <span
                        className={`font-label-sm text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ml-1 ${
                          fac.status === "High Demand"
                            ? "bg-error-container text-on-error-container"
                            : fac.status === "Active"
                              ? "bg-primary/10 text-primary"
                              : "bg-[#d1fae5] text-[#065f46]"
                        }`}
                      >
                        {fac.status}
                      </span>
                    </div>

                    <p className="text-[11px] text-on-surface-variant font-medium mb-3 pl-7 truncate">
                      {fac.type} · {fac.activeOccupancy}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-[11px] text-on-surface-variant font-medium">
                        Paid Usage Share
                      </span>
                      <span className="font-bold text-on-surface font-mono">
                        {fac.utilizationRate}% ({fac.paidBookingsCount}{" "}
                        bookings)
                      </span>
                    </div>
                    <div className="w-full bg-surface-variant h-2 rounded-full overflow-hidden">
                      <div
                        className={`${barColor} h-full rounded-full transition-all duration-700`}
                        style={{
                          width: `${Math.max(fac.utilizationRate, 5)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
