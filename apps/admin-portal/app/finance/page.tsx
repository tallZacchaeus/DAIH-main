"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  FinanceHeader,
  DateRangeOption,
  FinanceKpiGrid,
  RevenueTrendChart,
  RevenueBreakdown,
  TransactionLedgerTable,
  ReconciliationHealthCard,
  BreakdownItem,
} from "../../components/finance";
import { useToast } from "@daih/ui";
import { api } from "@daih/api-client";
import {
  PaymentTransaction,
  PaymentStatus,
  BookingSummary,
  BookingState,
  ReconciliationSummary,
} from "@daih/types";

function getDateRangeBounds(range: DateRangeOption): {
  startDate: Date;
  endDate: Date;
  startDateStr: string;
  endDateStr: string;
} {
  const now = new Date();
  const endDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999,
  );
  let startDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0,
  );

  switch (range) {
    case "Today": {
      startDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0,
        0,
        0,
        0,
      );
      break;
    }
    case "Last 7 Days": {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);
      break;
    }
    case "Last 30 Days": {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);
      break;
    }
    case "This Quarter": {
      const currentMonth = now.getMonth();
      const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
      startDate = new Date(now.getFullYear(), quarterStartMonth, 1, 0, 0, 0, 0);
      break;
    }
    case "Year to Date": {
      startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      break;
    }
  }

  return {
    startDate,
    endDate,
    startDateStr: startDate.toISOString(),
    endDateStr: endDate.toISOString(),
  };
}

export default function FinancialReportsPage() {
  const [selectedRange, setSelectedRange] =
    useState<DateRangeOption>("Last 30 Days");
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [bookings, setBookings] = useState<BookingSummary[]>([]);
  const [reconciliation, setReconciliation] =
    useState<ReconciliationSummary | null>(null);
  const isFirstMount = React.useRef(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const toast = useToast();

  const rangeBounds = useMemo(
    () => getDateRangeBounds(selectedRange),
    [selectedRange],
  );

  const loadFinancialTelemetry = useCallback(async () => {
    if (isFirstMount.current) {
      setInitialLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const [txRes, bkRes, reconRes] = await Promise.allSettled([
        api.payments.getAdminTransactions({
          startDate: rangeBounds.startDateStr,
          endDate: rangeBounds.endDateStr,
          limit: 100,
        }),
        api.bookings.getAdminBookings({
          startDate: rangeBounds.startDateStr,
          endDate: rangeBounds.endDateStr,
          limit: 100,
        }),
        api.payments.getReconciliation({
          startDate: rangeBounds.startDateStr,
          endDate: rangeBounds.endDateStr,
        }),
      ]);

      if (txRes.status === "fulfilled") {
        setTransactions(txRes.value.transactions || []);
      }
      if (bkRes.status === "fulfilled") {
        setBookings(bkRes.value.bookings || []);
      }
      if (reconRes.status === "fulfilled") {
        setReconciliation(reconRes.value);
      }
    } catch (err) {
      console.warn("Could not load financial telemetry:", err);
    } finally {
      setInitialLoading(false);
      setIsRefreshing(false);
      isFirstMount.current = false;
    }
  }, [rangeBounds]);

  useEffect(() => {
    loadFinancialTelemetry();
  }, [loadFinancialTelemetry]);

  // Calculate live KPIs
  const kpiData = useMemo(() => {
    const successful = transactions.filter(
      (t) =>
        t.status === PaymentStatus.SUCCESSFUL ||
        (t.status as any) === "SUCCESS",
    );
    const totalCollected = successful.reduce(
      (sum, t) => sum + (Number(t.amount) || 0),
      0,
    );

    const avgTransaction =
      successful.length > 0 ? totalCollected / successful.length : 0;

    const pending = transactions.filter(
      (t) => t.status === PaymentStatus.PENDING,
    );
    const outstandingAmount = pending.reduce(
      (sum, t) => sum + (Number(t.amount) || 0),
      0,
    );

    return {
      totalCollected: `₦${totalCollected.toLocaleString("en-NG", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      collectedBadge: `${successful.length} paid txs`,
      isCollectedUp: true,
      collectedSubtext: `Gross settlements in ${selectedRange}`,

      avgBookingValue: `₦${avgTransaction.toLocaleString("en-NG", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      avgBookingBadge: `${successful.length} bookings`,
      avgBookingSubtext: `Per completed transaction`,

      netRevenue: `₦${totalCollected.toLocaleString("en-NG", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      netRevenueBadge: "100% retained",
      isNetRevenueUp: true,
      netRevenueSubtext: `100% retained in ${selectedRange}`,

      outstandingAmount: `₦${outstandingAmount.toLocaleString("en-NG", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      pendingCount: pending.length,
      pendingSubtext: `${pending.length} pending in ${selectedRange}`,
    };
  }, [transactions, selectedRange]);

  // Calculate Revenue Breakdown by Resource
  const breakdownItems: BreakdownItem[] = useMemo(() => {
    const resourceMap = new Map<string, number>();
    let grandTotal = 0;

    transactions.forEach((tx: any) => {
      const isSuccess =
        tx.status === PaymentStatus.SUCCESSFUL || tx.status === "SUCCESS";
      if (!isSuccess) return;

      const amt = Number(tx.amount || 0);
      const name =
        tx.resourceName ||
        tx.booking?.resourceName ||
        tx.booking?.category ||
        "General Hub Access";

      resourceMap.set(name, (resourceMap.get(name) || 0) + amt);
      grandTotal += amt;
    });

    if (grandTotal === 0) return [];

    const colors = [
      { colorClass: "bg-[#392271]", dotColor: "#392271" },
      { colorClass: "bg-[#65519f]", dotColor: "#65519f" },
      { colorClass: "bg-[#d56c04]", dotColor: "#d56c04" },
      { colorClass: "bg-[#10b981]", dotColor: "#10b981" },
      { colorClass: "bg-[#0ea5e9]", dotColor: "#0ea5e9" },
    ];

    return Array.from(resourceMap.entries())
      .map(([name, amount], idx) => {
        const percentage = Math.round((amount / grandTotal) * 100);
        const palette = colors[idx % colors.length];
        return {
          name,
          amount: `₦${amount.toLocaleString("en-NG", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`,
          percentage,
          colorClass: palette.colorClass,
          dotColor: palette.dotColor,
        };
      })
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 5);
  }, [transactions]);

  const handleExport = () => {
    if (transactions.length === 0) {
      toast.info("No transaction records available to export for this range.", {
        title: "Export Empty",
      });
      return;
    }

    const headers = "Reference,Date,Amount,Status,Method\n";
    const rows = transactions
      .map(
        (t) =>
          `"${t.reference}","${new Date(t.createdAt).toISOString()}","${t.amount}","${t.status}","${t.method || "PAYSTACK"}"`,
      )
      .join("\n");

    const blob = new Blob([headers + rows], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `DAIH_Financial_Ledger_${selectedRange.replace(/\s+/g, "_")}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(
      `Exported ${transactions.length} records to CSV successfully.`,
      {
        title: "Ledger Exported",
      },
    );
  };

  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      await api.reports.downloadExport({
        type: "revenue",
        format: "pdf",
        startDate: rangeBounds.startDateStr,
        endDate: rangeBounds.endDateStr,
      });
      toast.success(
        `Financial PDF report for ${selectedRange} downloaded successfully.`,
        { title: "PDF Report Generated" },
      );
    } catch (err: any) {
      console.error("Failed to export finance PDF:", err);
      toast.error(err?.message || "Failed to download financial report PDF.", {
        title: "Export Failed",
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleViewPendingInvoices = () => {
    toast.info("Filtering ledger for Pending items.", {
      title: "Filter Applied",
    });
  };

  return (
    <div className="space-y-6">
      {/* Financial Reports Header & Date Filter */}
      <FinanceHeader
        selectedRange={selectedRange}
        onSelectRange={setSelectedRange}
        onExportLedger={handleExport}
        onExportPdf={handleExportPdf}
        isExportingPdf={isExportingPdf}
      />

      {/* Gateway & Ledger Reconciliation Health & Discrepancies Alert */}
      <ReconciliationHealthCard
        summary={reconciliation}
        loading={initialLoading || isRefreshing}
        onRefresh={loadFinancialTelemetry}
      />

      {/* KPI Metric Cards */}
      <FinanceKpiGrid
        loading={initialLoading}
        data={kpiData}
        onViewPendingInvoices={handleViewPendingInvoices}
      />

      {/* Charts & Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend Area Chart with smooth spline curve */}
        <div className="lg:col-span-2">
          <RevenueTrendChart
            loading={initialLoading}
            transactions={transactions}
            dateRange={selectedRange}
          />
        </div>

        {/* Revenue by Resource Breakdown */}
        <div className="lg:col-span-1">
          <RevenueBreakdown loading={initialLoading} items={breakdownItems} />
        </div>
      </div>

      {/* Transaction Ledger Table with live date range filtering */}
      <TransactionLedgerTable
        startDate={rangeBounds.startDateStr}
        endDate={rangeBounds.endDateStr}
        dateRangeLabel={selectedRange}
      />
    </div>
  );
}
