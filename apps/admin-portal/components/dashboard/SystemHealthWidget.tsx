"use client";

import React from "react";
import Link from "next/link";

export const SystemHealthWidget: React.FC = () => {
  return (
    <div className="bg-surface-container-lowest rounded-lg border border-accent-soft p-6 elevation-1 flex flex-col justify-between h-full">
      <div>
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-headline-sm text-[20px] leading-[28px] font-semibold text-on-surface">
            System Health
          </h3>
          <span className="material-symbols-outlined text-outline">
            monitor_heart
          </span>
        </div>

        <div className="space-y-4">
          {/* 1. API Status */}
          <div className="flex items-center justify-between p-3 bg-workspace-surface rounded-DEFAULT border border-accent-soft/50">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-[#10b981]" />
              <span className="font-label-md text-label-md text-on-surface">
                Core API
              </span>
            </div>
            <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
              99.9% Uptime
            </span>
          </div>

          {/* 2. Stripe Webhooks */}
          <div className="flex items-center justify-between p-3 bg-workspace-surface rounded-DEFAULT border border-accent-soft/50">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-[#10b981]" />
              <span className="font-label-md text-label-md text-on-surface">
                Stripe Webhooks
              </span>
            </div>
            <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
              Operational
            </span>
          </div>

          {/* 3. Hardware Integration */}
          <div className="flex items-center justify-between p-3 bg-error-container/20 rounded-DEFAULT border border-error/20">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-error animate-pulse" />
              <span className="font-label-md text-label-md text-on-surface">
                Door Access Readers
              </span>
            </div>
            <span className="font-label-sm text-label-sm text-error font-semibold">
              2 Offline
            </span>
          </div>
        </div>
      </div>

      <Link
        href="/reports"
        className="mt-6 w-full py-2 border border-outline-variant text-on-surface-variant rounded-DEFAULT font-label-md text-label-md hover:bg-surface-container transition-colors text-center block cursor-pointer"
      >
        View Datadog Logs
      </Link>
    </div>
  );
};
