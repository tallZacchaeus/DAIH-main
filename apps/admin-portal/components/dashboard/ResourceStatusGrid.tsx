"use client";

import React from "react";
import Link from "next/link";

export const ResourceStatusGrid: React.FC = () => {
  return (
    <div className="bg-surface-container-lowest rounded-lg border border-accent-soft p-6 elevation-1 flex flex-col justify-between h-full">
      <div>
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-headline-sm text-[20px] leading-[28px] font-semibold text-on-surface">
            Studio Status
          </h3>
          <Link
            className="font-label-sm text-label-sm text-primary hover:underline font-semibold"
            href="/operations"
          >
            Manage Resources
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Studio 1 */}
          <div className="border border-accent-soft p-4 rounded-DEFAULT bg-workspace-surface relative overflow-hidden group hover:border-primary-container transition-colors">
            <div className="absolute top-0 left-0 w-1 h-full bg-error" />
            <div className="flex justify-between items-start mb-2 pl-2">
              <h4 className="font-label-md text-label-md text-on-surface font-semibold">
                Photo Studio A
              </h4>
              <span className="font-label-sm text-label-sm bg-error-container text-on-error-container px-2 py-0.5 rounded-full font-medium">
                Occupied
              </span>
            </div>
            <div className="pl-2 flex items-center gap-2 text-on-surface-variant">
              <span className="material-symbols-outlined text-[16px]">
                schedule
              </span>
              <span className="font-label-sm text-label-sm">
                Until 14:00 (1h left)
              </span>
            </div>
          </div>

          {/* Studio 2 */}
          <div className="border border-accent-soft p-4 rounded-DEFAULT bg-workspace-surface relative overflow-hidden group hover:border-primary-container transition-colors">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#10b981]" />
            <div className="flex justify-between items-start mb-2 pl-2">
              <h4 className="font-label-md text-label-md text-on-surface font-semibold">
                Podcast Room 1
              </h4>
              <span className="font-label-sm text-label-sm bg-[#d1fae5] text-[#065f46] px-2 py-0.5 rounded-full font-medium">
                Available
              </span>
            </div>
            <div className="pl-2 flex items-center gap-2 text-on-surface-variant">
              <span className="material-symbols-outlined text-[16px]">
                cleaning_services
              </span>
              <span className="font-label-sm text-label-sm">
                Cleaned 30m ago
              </span>
            </div>
          </div>

          {/* Studio 3 */}
          <div className="border border-accent-soft p-4 rounded-DEFAULT bg-workspace-surface relative overflow-hidden group hover:border-primary-container transition-colors">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#f59e0b]" />
            <div className="flex justify-between items-start mb-2 pl-2">
              <h4 className="font-label-md text-label-md text-on-surface font-semibold">
                Streaming Pod B
              </h4>
              <span className="font-label-sm text-label-sm bg-[#fef3c7] text-[#92400e] px-2 py-0.5 rounded-full font-medium">
                Maintenance
              </span>
            </div>
            <div className="pl-2 flex items-center gap-2 text-on-surface-variant">
              <span className="material-symbols-outlined text-[16px]">
                build
              </span>
              <span className="font-label-sm text-label-sm">
                Tech Issue Reported
              </span>
            </div>
          </div>

          {/* Studio 4 */}
          <div className="border border-accent-soft p-4 rounded-DEFAULT bg-workspace-surface relative overflow-hidden group hover:border-primary-container transition-colors">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#10b981]" />
            <div className="flex justify-between items-start mb-2 pl-2">
              <h4 className="font-label-md text-label-md text-on-surface font-semibold">
                Meeting Room C
              </h4>
              <span className="font-label-sm text-label-sm bg-[#d1fae5] text-[#065f46] px-2 py-0.5 rounded-full font-medium">
                Available
              </span>
            </div>
            <div className="pl-2 flex items-center gap-2 text-on-surface-variant">
              <span className="material-symbols-outlined text-[16px]">
                event
              </span>
              <span className="font-label-sm text-label-sm">
                Next booking: 16:00
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
