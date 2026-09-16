"use client";

import React from "react";
import {
  QrCode,
  CheckCircle2,
  Clock,
  UserCheck,
  CreditCard,
  DoorOpen,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@daih/ui";

export interface ActivityItem {
  id: string;
  member: string;
  clientId: string;
  action: string;
  type: "qr-scan" | "walk-in" | "payment" | "checkout";
  timestamp: string;
  location: string;
}

const defaultActivities: ActivityItem[] = [
  {
    id: "act-1",
    member: "Tunde Adeleke",
    clientId: "DAIH-2026-0042",
    action: "Scanned digital QR badge at Reception Scanner",
    type: "qr-scan",
    timestamp: "2 mins ago",
    location: "Main Entrance Gate",
  },
  {
    id: "act-2",
    member: "Grace Nwosu",
    clientId: "DAIH-2026-0019",
    action: "Walk-in desk access checked in by Reception Officer",
    type: "walk-in",
    timestamp: "14 mins ago",
    location: "Hot Desk Lounge",
  },
  {
    id: "act-3",
    member: "Bamidele Alabi",
    clientId: "DAIH-2026-0033",
    action: "Paystack transaction verified: ₦45,000 (Monthly Plan)",
    type: "payment",
    timestamp: "32 mins ago",
    location: "Online Portal",
  },
  {
    id: "act-4",
    member: "Amina Yusuf",
    clientId: "DAIH-2026-0012",
    action: "Checked into Innovation Training Room",
    type: "qr-scan",
    timestamp: "45 mins ago",
    location: "Training Wing 1",
  },
  {
    id: "act-5",
    member: "Samuel Okafor",
    clientId: "DAIH-2026-0008",
    action: "Executive Boardroom booking hold confirmed",
    type: "payment",
    timestamp: "1 hour ago",
    location: "Executive Wing",
  },
];

const activityTypeConfig = {
  "qr-scan": {
    icon: QrCode,
    bgColor: "bg-blue-50 text-blue-600 border-blue-200",
  },
  "walk-in": {
    icon: UserCheck,
    bgColor: "bg-amber-50 text-amber-600 border-amber-200",
  },
  payment: {
    icon: CreditCard,
    bgColor: "bg-emerald-50 text-emerald-600 border-emerald-200",
  },
  checkout: {
    icon: DoorOpen,
    bgColor: "bg-purple-50 text-purple-600 border-purple-200",
  },
};

export const RecentActivityFeed: React.FC<{ activities?: ActivityItem[] }> = ({
  activities = defaultActivities,
}) => {
  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#23055c]" />
            Live Activity & Check-In Feed
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            Real-time telemetry
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {activities.map((item) => {
            const config =
              activityTypeConfig[item.type] || activityTypeConfig["qr-scan"];
            const Icon = config.icon;

            return (
              <div
                key={item.id}
                className="py-3.5 first:pt-0 last:pb-0 flex items-start gap-3"
              >
                <div
                  className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border mt-0.5",
                    config.bgColor,
                  )}
                >
                  <Icon className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {item.member}{" "}
                      <span className="font-mono text-[10px] font-normal text-slate-500">
                        ({item.clientId})
                      </span>
                    </p>
                    <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap ml-2">
                      {item.timestamp}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 mt-0.5 line-clamp-1">
                    {item.action}
                  </p>

                  <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    {item.location}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 text-center">
        <a
          href="/operations"
          className="text-xs font-bold text-[#23055c] hover:text-[#392271] transition-colors inline-block"
        >
          View Full Operations Stream →
        </a>
      </div>
    </div>
  );
};
