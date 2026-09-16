"use client";

import React, { useState } from "react";
import { Modal, Button } from "@daih/ui";

interface ActivityItem {
  id: string;
  time: string;
  event: string;
  entity: string;
  dotColorClass: string;
  details: {
    reference: string;
    operator: string;
    notes: string;
  };
}

const activityRows: ActivityItem[] = [
  {
    id: "act-1",
    time: "Just now",
    event: "Check-in",
    entity: "Sarah Jenkins",
    dotColorClass: "bg-[#10b981]",
    details: {
      reference: "CHK-2026-8831",
      operator: "Reception Kiosk #1 (Lounge)",
      notes: "QR Pass scanned and validated. Wi-Fi session triggered.",
    },
  },
  {
    id: "act-2",
    time: "5m ago",
    event: "New Booking",
    entity: "Podcast Rm 1",
    dotColorClass: "bg-secondary",
    details: {
      reference: "BKG-2026-0914",
      operator: "Online Customer PWA",
      notes: "Session scheduled for tomorrow 14:00 - 16:00.",
    },
  },
  {
    id: "act-3",
    time: "12m ago",
    event: "Payment",
    entity: "Inv-4921 ($150)",
    dotColorClass: "bg-primary-container",
    details: {
      reference: "PAY-PSTK-990214",
      operator: "Paystack Webhook (Live)",
      notes: "Dedicated desk monthly retainer settlement completed.",
    },
  },
  {
    id: "act-4",
    time: "28m ago",
    event: "Access Denied",
    entity: "Main Entrance",
    dotColorClass: "bg-error",
    details: {
      reference: "SEC-DENY-004",
      operator: "Main Gate Scanner A",
      notes: "QR code expired or invalid hash. Guard alerted.",
    },
  },
  {
    id: "act-5",
    time: "1h ago",
    event: "Maint. Req",
    entity: "Streaming Pod B",
    dotColorClass: "bg-[#f59e0b]",
    details: {
      reference: "MNT-REQ-032",
      operator: "Operations Staff (Amina)",
      notes:
        "Microphone gain calibration and audio interface inspection needed.",
    },
  },
];

export const LiveActivityTable: React.FC = () => {
  const [filterActive, setFilterActive] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(
    null,
  );

  return (
    <>
      <div className="bg-surface-container-lowest rounded-lg border border-accent-soft p-6 elevation-1 flex flex-col justify-between h-full">
        <div>
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-headline-sm text-[20px] leading-[28px] font-semibold text-on-surface">
              Live Activity Log
            </h3>
            <button
              onClick={() => setFilterActive(!filterActive)}
              className="text-outline hover:text-on-surface transition-colors p-1 rounded hover:bg-surface-container cursor-pointer"
              title="Filter activity events"
            >
              <span className="material-symbols-outlined text-[20px]">
                filter_list
              </span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-accent-soft">
                  <th className="py-2 font-label-md text-label-md text-outline font-medium">
                    Time
                  </th>
                  <th className="py-2 font-label-md text-label-md text-outline font-medium">
                    Event
                  </th>
                  <th className="py-2 font-label-md text-label-md text-outline font-medium">
                    Entity
                  </th>
                  <th className="py-2 font-label-md text-label-md text-outline font-medium text-right">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="font-body-md text-body-md text-on-surface text-[14px]">
                {activityRows.map((row, index) => {
                  const isZebra = index % 2 === 1;
                  return (
                    <tr
                      key={row.id}
                      className={`h-[48px] border-b border-accent-soft/50 transition-colors ${
                        isZebra
                          ? "bg-workspace-surface hover:bg-surface-container"
                          : "hover:bg-workspace-surface"
                      }`}
                    >
                      <td className="py-2 text-on-surface-variant font-medium whitespace-nowrap">
                        {row.time}
                      </td>
                      <td className="py-2 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 font-medium">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${row.dotColorClass}`}
                          />
                          {row.event}
                        </span>
                      </td>
                      <td className="py-2 font-medium max-w-[150px] truncate">
                        {row.entity}
                      </td>
                      <td className="py-2 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedActivity(row)}
                          className="text-primary hover:underline font-semibold cursor-pointer"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Activity Details Modal */}
      {selectedActivity && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedActivity(null)}
          title={`Activity Event: ${selectedActivity.event}`}
        >
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 p-3 bg-surface-container rounded-xl border border-accent-soft">
              <span
                className={`w-3 h-3 rounded-full ${selectedActivity.dotColorClass}`}
              />
              <div>
                <p className="text-sm font-bold text-on-surface">
                  {selectedActivity.entity}
                </p>
                <p className="text-xs text-on-surface-variant">
                  Logged {selectedActivity.time}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <span className="font-bold text-outline">
                  Audit Reference:{" "}
                </span>
                <span className="font-mono text-primary font-semibold">
                  {selectedActivity.details.reference}
                </span>
              </div>
              <div>
                <span className="font-bold text-outline">
                  Device / Operator:{" "}
                </span>
                <span className="text-on-surface font-medium">
                  {selectedActivity.details.operator}
                </span>
              </div>
              <div className="p-3 bg-workspace-surface rounded-lg border border-accent-soft text-on-surface-variant">
                {selectedActivity.details.notes}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-accent-soft">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedActivity(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};
