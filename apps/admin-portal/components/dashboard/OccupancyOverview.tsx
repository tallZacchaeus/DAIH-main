"use client";

import React from "react";
import { Building, Users, Armchair, Shield, CheckCircle2 } from "lucide-react";
import { cn } from "@daih/ui";

export interface ResourceOccupancy {
  id: string;
  name: string;
  category: string;
  totalCapacity: number;
  occupied: number;
  status: "Available" | "Active" | "Occupied" | "Reserved";
}

const defaultResources: ResourceOccupancy[] = [
  {
    id: "res-hot-desk",
    name: "Hot Desk Lounge",
    category: "Shared Workstation",
    totalCapacity: 50,
    occupied: 34,
    status: "Active",
  },
  {
    id: "res-dedicated",
    name: "Dedicated Desks Wing",
    category: "Reserved Workspace",
    totalCapacity: 24,
    occupied: 20,
    status: "Active",
  },
  {
    id: "res-suite-201",
    name: "Private Office Suite 201",
    category: "Executive Suite",
    totalCapacity: 6,
    occupied: 6,
    status: "Occupied",
  },
  {
    id: "res-auditorium",
    name: "Conference Hall (Auditorium)",
    category: "Event Venue",
    totalCapacity: 120,
    occupied: 0,
    status: "Available",
  },
  {
    id: "res-training",
    name: "Innovation Training Room",
    category: "Seminar / Lab",
    totalCapacity: 30,
    occupied: 18,
    status: "Active",
  },
];

export const OccupancyOverview: React.FC<{
  resources?: ResourceOccupancy[];
}> = ({ resources = defaultResources }) => {
  const totalSpots = resources.reduce(
    (acc, curr) => acc + curr.totalCapacity,
    0,
  );
  const totalOccupied = resources.reduce((acc, curr) => acc + curr.occupied, 0);
  const overallPercentage = Math.round((totalOccupied / totalSpots) * 100);

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Armchair className="w-5 h-5 text-[#23055c]" />
            Live Facility Occupancy & Desk Utilisation
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time seat allotment across zones in Dare Adeboye Innovation
            Hub.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-200">
          <span className="text-xs font-semibold text-slate-600">
            Total Hub Occupancy:
          </span>
          <span className="text-sm font-extrabold text-[#23055c]">
            {overallPercentage}%
          </span>
          <span className="text-xs text-slate-400 font-mono">
            ({totalOccupied}/{totalSpots})
          </span>
        </div>
      </div>

      {/* Progress Bars List */}
      <div className="space-y-4">
        {resources.map((item) => {
          const percent = Math.round(
            (item.occupied / item.totalCapacity) * 100,
          );
          const isFull = percent >= 100;
          const isHigh = percent >= 80;

          return (
            <div
              key={item.id}
              className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-bold text-slate-900">
                    {item.name}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-200 text-slate-600 font-medium">
                    {item.category}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className="font-semibold text-slate-700">
                    {item.occupied} / {item.totalCapacity}{" "}
                    <span className="text-slate-400 font-normal">spots</span>
                  </span>
                  <span
                    className={cn(
                      "font-extrabold px-2 py-0.5 rounded text-[11px]",
                      isFull
                        ? "bg-rose-100 text-rose-800"
                        : isHigh
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800",
                    )}
                  >
                    {percent}%
                  </span>
                </div>
              </div>

              {/* Progress Track */}
              <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    isFull
                      ? "bg-rose-500"
                      : isHigh
                        ? "bg-amber-500"
                        : "bg-emerald-500",
                  )}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
