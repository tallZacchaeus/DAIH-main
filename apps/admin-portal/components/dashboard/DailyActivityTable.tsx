"use client";

import React, { useState } from "react";
import { UserRole } from "@daih/types";
import { Modal, Button } from "@daih/ui";
import { Activity, Download, Search, RefreshCw } from "lucide-react";

export interface DailyActivityRecord {
  id: string;
  date: string;
  day: string;
  customerName: string;
  clientId: string;
  timeIn: string;
  timeOut: string;
  hoursUsed: string;
  workspaceUsed: string;
  meetingRoomUsed: string;
  subscriptionPlan: string;
  amountPaid: string;
  paymentStatus: "PAID" | "PENDING" | "WAIVED";
}

interface DailyActivityTableProps {
  activities?: DailyActivityRecord[];
  loading?: boolean;
  onRefresh?: () => void;
  role?: UserRole | string | null;
}

export const DailyActivityTable: React.FC<DailyActivityTableProps> = ({
  activities = [],
  loading = false,
  onRefresh,
  role,
}) => {
  const showFinancials =
    role !== UserRole.RECEPTION_OFFICER && role !== UserRole.SECURITY_OFFICER;
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedRecord, setSelectedRecord] =
    useState<DailyActivityRecord | null>(null);

  const filteredActivities = activities.filter((item) => {
    const matchesSearch =
      item.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.clientId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.workspaceUsed.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.subscriptionPlan.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "ALL" || item.paymentStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const exportToCSV = () => {
    if (filteredActivities.length === 0) return;

    const headers = [
      "Date",
      "Day",
      "Customer Name",
      "Client ID",
      "Time In",
      "Time Out",
      "Hours Used",
      "Workspace Used",
      "Meeting Room Used",
      "Subscription Plan",
      "Amount Paid",
      "Payment Status",
    ];

    const rows = filteredActivities.map((r) => [
      r.date,
      r.day,
      `"${r.customerName}"`,
      r.clientId,
      r.timeIn,
      r.timeOut,
      r.hoursUsed,
      `"${r.workspaceUsed}"`,
      `"${r.meetingRoomUsed}"`,
      `"${r.subscriptionPlan}"`,
      r.amountPaid,
      r.paymentStatus,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `daih-daily-activity-log-${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <div className="bg-surface-container-lowest rounded-lg border border-accent-soft p-6 elevation-1 flex flex-col justify-between">
        <div>
          {/* Header & Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-accent-soft">
            <div>
              <h3 className="font-headline-sm text-[20px] leading-[28px] font-semibold text-on-surface">
                Comprehensive Daily Activity Log
              </h3>
              <p className="font-body-md text-xs text-on-surface-variant mt-0.5">
                Real-time tracking of visitor check-ins, facility occupancy,
                hours, and revenue ledger.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Search Box */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search customer, ID, desk..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-surface-container border border-accent-soft rounded-DEFAULT text-xs px-3 py-1.5 pl-8 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary w-56 font-medium"
                />
                <span className="material-symbols-outlined absolute left-2.5 top-2 text-on-surface-variant text-[16px]">
                  search
                </span>
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-surface-container border border-accent-soft rounded-DEFAULT text-xs px-2.5 py-1.5 text-on-surface-variant font-medium focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                <option value="ALL">All Payment Statuses</option>
                <option value="PAID">PAID</option>
                <option value="PENDING">PENDING</option>
              </select>

              {/* Refresh Button */}
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  disabled={loading}
                  title="Refresh Activity Log"
                  className="flex items-center gap-1.5 bg-surface-container hover:bg-accent-soft text-primary font-label-md text-xs px-3 py-1.5 rounded-DEFAULT border border-accent-soft transition-colors cursor-pointer disabled:opacity-40"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
                  />
                  <span>Refresh</span>
                </button>
              )}

              {/* Export CSV Button */}
              <button
                onClick={exportToCSV}
                disabled={filteredActivities.length === 0}
                title="Export Activity to CSV"
                className="flex items-center gap-1.5 bg-surface-container hover:bg-accent-soft text-primary font-label-md text-xs px-3 py-1.5 rounded-DEFAULT border border-accent-soft transition-colors cursor-pointer disabled:opacity-40"
              >
                <Download className="w-4 h-4" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* 12-Column Comprehensive Daily Activity Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1100px]">
              <thead>
                <tr className="border-b border-accent-soft bg-workspace-surface/80 text-[11px] font-bold text-outline uppercase tracking-wider">
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-2">Day</th>
                  <th className="py-3 px-3">Customer Name</th>
                  <th className="py-3 px-2">Client ID</th>
                  <th className="py-3 px-2">Time In</th>
                  <th className="py-3 px-2">Time Out</th>
                  <th className="py-3 px-2">Hours Used</th>
                  <th className="py-3 px-3">Workspace Used</th>
                  <th className="py-3 px-3">Meeting Room Used</th>
                  <th className="py-3 px-3">Subscription Plan</th>
                  {showFinancials && (
                    <>
                      <th className="py-3 px-2">Amount</th>
                      <th className="py-3 px-2">Payment Status</th>
                    </>
                  )}
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="font-body-md text-xs text-on-surface divide-y divide-accent-soft/50 font-medium">
                {loading ? (
                  [1, 2, 3, 4, 5].map((i) => (
                    <tr key={i} className="animate-pulse h-[52px]">
                      <td
                        colSpan={showFinancials ? 13 : 11}
                        className="py-3 px-3"
                      >
                        <div className="h-4 bg-slate-200 rounded w-full" />
                      </td>
                    </tr>
                  ))
                ) : filteredActivities.length === 0 ? (
                  <tr>
                    <td
                      colSpan={showFinancials ? 13 : 11}
                      className="py-12 text-center text-on-surface-variant font-medium"
                    >
                      <Activity className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                      <p className="font-bold text-slate-700">
                        No Activity Records Found
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Visitor check-ins and session telemetry will appear here
                        in real time.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredActivities.map((row, idx) => {
                    const isZebra = idx % 2 === 1;
                    const isOngoing =
                      row.timeOut.includes("Active") ||
                      row.timeOut.includes("On-site");

                    return (
                      <tr
                        key={row.id}
                        className={`h-[52px] transition-colors ${
                          isZebra
                            ? "bg-workspace-surface hover:bg-surface-container"
                            : "hover:bg-workspace-surface"
                        }`}
                      >
                        <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px] text-on-surface-variant">
                          {row.date}
                        </td>

                        <td className="py-2.5 px-2 whitespace-nowrap text-on-surface-variant text-[11px]">
                          {row.day}
                        </td>

                        <td className="py-2.5 px-3 whitespace-nowrap font-semibold text-on-surface">
                          {row.customerName}
                        </td>

                        <td className="py-2.5 px-2 whitespace-nowrap font-mono text-[11px] text-primary font-bold">
                          {row.clientId}
                        </td>

                        <td className="py-2.5 px-2 whitespace-nowrap font-mono text-[11px]">
                          {row.timeIn.includes("Pending") ? (
                            <span className="text-slate-400 font-sans italic text-[10px]">
                              Pending
                            </span>
                          ) : (
                            row.timeIn
                          )}
                        </td>

                        <td className="py-2.5 px-2 whitespace-nowrap font-mono text-[11px]">
                          {isOngoing ? (
                            <span className="inline-flex items-center gap-1 text-[#065f46] bg-[#d1fae5] px-2 py-0.5 rounded-full text-[10px] font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
                              On-site
                            </span>
                          ) : (
                            row.timeOut
                          )}
                        </td>

                        <td className="py-2.5 px-2 whitespace-nowrap font-mono text-[11px]">
                          {row.hoursUsed}
                        </td>

                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="font-semibold text-on-surface text-[11px]">
                            {row.workspaceUsed}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 whitespace-nowrap text-[11px] text-on-surface-variant">
                          {row.meetingRoomUsed}
                        </td>

                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="text-[11px] font-medium text-on-surface">
                            {row.subscriptionPlan}
                          </span>
                        </td>

                        <td className="py-2.5 px-2 whitespace-nowrap font-mono font-bold text-on-surface">
                          {row.amountPaid}
                        </td>

                        <td className="py-2.5 px-2 whitespace-nowrap">
                          <span
                            className={`font-label-sm text-[10px] px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1 ${
                              row.paymentStatus === "PAID"
                                ? "bg-[#d1fae5] text-[#065f46]"
                                : row.paymentStatus === "PENDING"
                                  ? "bg-[#fef3c7] text-[#92400e]"
                                  : "bg-error-container text-on-error-container"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                row.paymentStatus === "PAID"
                                  ? "bg-[#10b981]"
                                  : row.paymentStatus === "PENDING"
                                    ? "bg-[#f59e0b]"
                                    : "bg-error"
                              }`}
                            />
                            {row.paymentStatus}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <button
                            onClick={() => setSelectedRecord(row)}
                            className="text-primary hover:underline font-bold text-xs cursor-pointer"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer info & summary */}
        <div className="mt-4 pt-3 border-t border-accent-soft flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-on-surface-variant">
          <span>
            Showing {filteredActivities.length} operational daily activity logs
          </span>
          <span className="font-semibold text-primary">
            DAIH Redemption City Campus Hub Telemetry
          </span>
        </div>
      </div>

      {/* Activity Details Inspection Modal */}
      {selectedRecord && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedRecord(null)}
          title={`Operational Session Details: ${selectedRecord.customerName}`}
        >
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between p-3.5 bg-surface-container rounded-xl border border-accent-soft">
              <div>
                <p className="text-sm font-bold text-on-surface">
                  {selectedRecord.customerName}
                </p>
                <p className="text-xs font-mono text-primary font-bold">
                  {selectedRecord.clientId}
                </p>
              </div>
              <span
                className={`font-bold text-xs px-2.5 py-1 rounded-full ${
                  selectedRecord.paymentStatus === "PAID"
                    ? "bg-[#d1fae5] text-[#065f46]"
                    : "bg-[#fef3c7] text-[#92400e]"
                }`}
              >
                {selectedRecord.paymentStatus}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-workspace-surface rounded-lg border border-accent-soft">
                <span className="font-bold text-outline block mb-1">
                  Session Date &amp; Time
                </span>
                <p className="font-semibold text-on-surface">
                  {selectedRecord.day}, {selectedRecord.date}
                </p>
                <p className="text-on-surface-variant font-mono mt-0.5">
                  {selectedRecord.timeIn} – {selectedRecord.timeOut}
                </p>
                <p className="text-[11px] text-primary font-bold mt-1">
                  Duration: {selectedRecord.hoursUsed}
                </p>
              </div>

              <div className="p-3 bg-workspace-surface rounded-lg border border-accent-soft">
                <span className="font-bold text-outline block mb-1">
                  Facilities Utilized
                </span>
                <p className="font-semibold text-on-surface">
                  {selectedRecord.workspaceUsed}
                </p>
                <p className="text-on-surface-variant text-[11px] mt-0.5">
                  Meeting: {selectedRecord.meetingRoomUsed}
                </p>
              </div>
            </div>

            <div className="p-3 bg-workspace-surface rounded-lg border border-accent-soft text-xs">
              <span className="font-bold text-outline block mb-1">
                Financial &amp; Subscription Ledger
              </span>
              <div className="flex justify-between items-center">
                <span className="text-on-surface">
                  {selectedRecord.subscriptionPlan}
                </span>
                <span className="font-bold font-mono text-sm text-primary">
                  {selectedRecord.amountPaid}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-accent-soft">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedRecord(null)}
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
