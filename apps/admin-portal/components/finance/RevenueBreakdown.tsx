"use client";

import React from "react";
import { PieChart } from "lucide-react";

export interface BreakdownItem {
  name: string;
  amount: string;
  percentage: number;
  colorClass: string;
  dotColor: string;
}

interface RevenueBreakdownProps {
  items?: BreakdownItem[];
  loading?: boolean;
}

const colorPalette = [
  { colorClass: "bg-[#392271]", dotColor: "#392271" },
  { colorClass: "bg-[#65519f]", dotColor: "#65519f" },
  { colorClass: "bg-[#d56c04]", dotColor: "#d56c04" },
  { colorClass: "bg-[#10b981]", dotColor: "#10b981" },
  { colorClass: "bg-[#0ea5e9]", dotColor: "#0ea5e9" },
];

export const RevenueBreakdown: React.FC<RevenueBreakdownProps> = ({
  items = [],
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="bg-white/80 backdrop-blur-md border border-[#EBE7F5] rounded-xl p-6 flex flex-col h-[400px] shadow-xs animate-pulse">
        <div className="h-5 w-40 bg-slate-200 rounded mb-6" />
        <div className="flex-1 flex flex-col justify-center gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between">
                <div className="h-3 w-28 bg-slate-200 rounded" />
                <div className="h-3 w-16 bg-slate-200 rounded" />
              </div>
              <div className="h-2 bg-slate-100 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/80 backdrop-blur-md border border-[#EBE7F5] rounded-xl p-6 flex flex-col h-[400px] shadow-xs">
      <h3 className="text-base font-bold text-slate-900 mb-6">
        Revenue by Resource
      </h3>

      {items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
          <PieChart className="w-8 h-8 text-slate-300 mb-2" />
          <p className="text-xs font-bold text-slate-700">
            No Revenue Data Yet
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Resource breakdown will generate once bookings and payments are
            processed.
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-center gap-6">
          {items.map((item, index) => {
            const fallbackColor = colorPalette[index % colorPalette.length];
            const colorClass = item.colorClass || fallbackColor.colorClass;
            const dotColor = item.dotColor || fallbackColor.dotColor;

            return (
              <div key={item.name}>
                <div className="flex justify-between items-center mb-2 text-xs">
                  <span className="font-semibold text-slate-800 flex items-center gap-2 truncate">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: dotColor }}
                    />
                    <span className="truncate">{item.name}</span>
                  </span>
                  <span className="font-bold text-slate-900 shrink-0 ml-2">
                    {item.amount}
                  </span>
                </div>

                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${colorClass}`}
                    style={{ width: `${Math.max(item.percentage, 2)}%` }}
                  />
                </div>

                <p className="text-[11px] text-slate-400 mt-1 text-right font-medium">
                  {item.percentage}%
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
