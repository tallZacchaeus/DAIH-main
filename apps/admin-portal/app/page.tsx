"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  DashboardHeader,
  KpiGrid,
  SubscriptionBarChart,
  SubscriptionBreakdown,
  MostUsedFacilities,
  DailyActivityTable,
  WalkInModal,
  FacilityUtilization,
  SubscriptionPlanMetric,
  DailyActivityRecord,
  DashboardKpiData,
} from "../components/dashboard";
import { api, apiCacheManager, useAuth } from "@daih/api-client";
import {
  UserRole,
  BookingSummary,
  BookingState,
  FacilityResource,
  PaymentTransaction,
  PaymentStatus,
  CustomerRecord,
  AdminDashboardSummaryDTO,
} from "@daih/types";
// lucide-react icons

export default function AdminOperationsDashboard() {
  const { user } = useAuth();
  const [isWalkInModalOpen, setIsWalkInModalOpen] = useState(false);
  const isManagementViewer = user?.role === UserRole.MANAGEMENT_VIEWER;
  const isSecurityOfficer = user?.role === UserRole.SECURITY_OFFICER;
  const canIssuePass = !isManagementViewer && !isSecurityOfficer;
  const canViewDistributionAndFacilities =
    user?.role === UserRole.SUPER_ADMIN ||
    user?.role === UserRole.OPERATIONS_ADMIN ||
    user?.role === UserRole.MANAGEMENT_VIEWER;
  const [summary, setSummary] = useState<AdminDashboardSummaryDTO | null>(null);
  const [resources, setResources] = useState<FacilityResource[]>([]);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const isFirstMount = React.useRef(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadDashboardTelemetry = useCallback(async (forceRefresh = false) => {
    const hasCachedData = Boolean(
      apiCacheManager.get("admin_dashboard_summary"),
    );
    if (isFirstMount.current && !hasCachedData) {
      setInitialLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      // Single-roundtrip consolidated dashboard query with fast client cache
      const [summaryRes, resRes, custRes] = await Promise.allSettled([
        api.bookings.getDashboardSummary({ forceRefresh }),
        api.catalogue.getResources({ forceRefresh }),
        api.customers.getCustomers({ limit: 100 }),
      ]);

      if (summaryRes.status === "fulfilled") {
        setSummary(summaryRes.value);
      }
      if (resRes.status === "fulfilled") {
        setResources(resRes.value || []);
      }
      if (custRes.status === "fulfilled") {
        setCustomers(custRes.value.customers || []);
      }
    } catch (err) {
      console.warn("Could not load admin dashboard live telemetry:", err);
    } finally {
      setInitialLoading(false);
      setIsRefreshing(false);
      isFirstMount.current = false;
    }
  }, []);

  useEffect(() => {
    loadDashboardTelemetry();
  }, [loadDashboardTelemetry]);

  // Derive Strictly Daily / Today's KPI Telemetry from Consolidated Backend Summary
  const dailyKpiData: DashboardKpiData = useMemo(() => {
    if (summary) {
      return {
        dailyVisitors: summary.dailyVisitors,
        currentlyOnSite: summary.currentlyOnSite,
        weeklyVisitors: summary.dailyVisitors,
        monthlyVisitors: summary.dailyVisitors,
        repeatCustomersRate: "Today",
        repeatCustomersCount: summary.dailyVisitors,
        totalRevenueMtd: summary.totalRevenueMtd,
        revenueToday: summary.revenueToday,
        occupancyRate: summary.occupancyRate,
        occupiedSeats: summary.occupiedSeats,
        totalSeats: summary.totalSeats,
        peakHourWindow: summary.peakHourWindow,
        peakOccupancyRate: summary.peakOccupancyRate,
        todayBookingsCount: summary.todayBookingsCount,
        todayDeparturesCount: summary.todayDeparturesCount,
      };
    }

    return {
      dailyVisitors: 0,
      currentlyOnSite: 0,
      weeklyVisitors: 0,
      monthlyVisitors: 0,
      repeatCustomersRate: "Today",
      repeatCustomersCount: 0,
      totalRevenueMtd: "₦0.00",
      revenueToday: "₦0.00",
      occupancyRate: 0,
      occupiedSeats: 0,
      totalSeats: 104,
      peakHourWindow: "11:00 AM – 03:30 PM",
      peakOccupancyRate: 0,
      todayBookingsCount: 0,
      todayDeparturesCount: 0,
    };
  }, [summary]);

  // Derive Live Subscription Breakdown from Consolidated Backend Summary
  const subscriptionPlans: SubscriptionPlanMetric[] = useMemo(() => {
    return summary?.subscriptionPlans || [];
  }, [summary]);

  // Derive Live Facility Utilization Rankings from Consolidated Backend Summary
  const facilityRankings: FacilityUtilization[] = useMemo(() => {
    if (!summary?.mostUsedFacilities) return [];
    const colors = [
      "bg-primary-container",
      "bg-secondary",
      "bg-on-tertiary-container",
      "bg-[#10b981]",
      "bg-[#0ea5e9]",
      "bg-[#f59e0b]",
    ];
    return summary.mostUsedFacilities.map((f, idx) => ({
      id: f.name,
      name: f.name,
      type: f.category,
      utilizationRate: f.utilizationRate,
      paidBookingsCount: f.bookingsCount,
      activeOccupancy: `Cap: Active`,
      status:
        f.bookingsCount >= 4 || f.utilizationRate >= 35
          ? ("High Demand" as const)
          : f.bookingsCount > 0
            ? ("Active" as const)
            : ("Available" as const),
      barColorClass: colors[idx % colors.length],
    }));
  }, [summary]);

  // Derive Live Daily Activity Records from Consolidated Backend Summary
  const dailyActivities: DailyActivityRecord[] = useMemo(() => {
    if (!summary?.recentActivities) return [];
    return summary.recentActivities.map((a: any) => {
      // 1. Resolve Time In (strictly check-in time)
      let timeInStr = a.formattedCheckIn;
      if (!timeInStr && a.checkInTime) {
        const d = new Date(a.checkInTime);
        if (!isNaN(d.getTime())) {
          timeInStr = d.toLocaleTimeString("en-NG", {
            hour: "2-digit",
            minute: "2-digit",
          });
        }
      }
      if (!timeInStr && (a.eventType === "CHECK_IN" || !a.formattedCheckOut)) {
        timeInStr = a.formattedTime || a.timeIn;
      }
      if (!timeInStr) {
        timeInStr = a.formattedTime || "—";
      }

      // 2. Resolve Time Out (strictly check-out time or On-site)
      let timeOutStr = a.formattedCheckOut;
      if (!timeOutStr && a.checkOutTime) {
        const d = new Date(a.checkOutTime);
        if (!isNaN(d.getTime())) {
          timeOutStr = d.toLocaleTimeString("en-NG", {
            hour: "2-digit",
            minute: "2-digit",
          });
        }
      }
      if (
        !timeOutStr &&
        a.eventType === "CHECK_OUT" &&
        a.formattedTime &&
        a.formattedTime !== timeInStr
      ) {
        timeOutStr = a.formattedTime;
      }
      if (!timeOutStr) {
        timeOutStr = "Active (On-site)";
      }

      // 3. Resolve Duration / Hours Used
      let duration = a.hoursUsed;
      if (!duration || duration === "Session Active") {
        if (a.checkInTime && a.checkOutTime) {
          const tIn = new Date(a.checkInTime).getTime();
          const tOut = new Date(a.checkOutTime).getTime();
          if (!isNaN(tIn) && !isNaN(tOut) && tOut >= tIn) {
            const diffMins = Math.max(
              1,
              Math.round((tOut - tIn) / (1000 * 60)),
            );
            const hrs = Math.floor(diffMins / 60);
            const mins = diffMins % 60;
            duration = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
          }
        }
      }
      if (!duration) {
        duration =
          a.checkOutTime || a.formattedCheckOut
            ? "Completed"
            : "Active (On-site)";
      }

      const dateSource =
        a.checkInTime || a.timestamp || new Date().toISOString();
      const dateObj = new Date(dateSource);

      return {
        id: a.id,
        date: !isNaN(dateObj.getTime())
          ? dateObj.toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10),
        day: !isNaN(dateObj.getTime())
          ? dateObj.toLocaleDateString("en-NG", { weekday: "long" })
          : "Today",
        customerName: a.memberName,
        clientId: a.clientNumber,
        timeIn: timeInStr,
        timeOut: timeOutStr,
        hoursUsed: duration,
        workspaceUsed: a.resourceName,
        meetingRoomUsed: a.workspaceCategory
          ? a.workspaceCategory.replace(/_/g, " ")
          : "Workspace",
        subscriptionPlan: a.subscriptionPlan || "Standard Pass",
        amountPaid: a.amountPaid || "Settled",
        paymentStatus: (a.paymentStatus as any) || "PAID",
      };
    });
  }, [summary]);

  return (
    <div className="space-y-8">
      {/* 1. Page Header */}
      <DashboardHeader
        onOpenWalkInModal={
          canIssuePass ? () => setIsWalkInModalOpen(true) : undefined
        }
      />

      {/* 2. Daily Operations KPIs: Today's Visitors, Live Floor Count, Today's Revenue, Occupancy */}
      <KpiGrid
        loading={initialLoading}
        data={dailyKpiData}
        mode="daily"
        role={user?.role}
      />

      {/* 3. Main Analytics Grid: Subscription Breakdown Bar Chart & Plan Allocation (Operations Manager, Super Admin, CEO Only) */}
      {canViewDistributionAndFacilities && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
          <div className="lg:col-span-2">
            <SubscriptionBarChart
              loading={initialLoading}
              plans={subscriptionPlans}
              totalCount={subscriptionPlans.reduce(
                (sum, p) => sum + p.count,
                0,
              )}
            />
          </div>
          <div>
            <SubscriptionBreakdown
              loading={initialLoading}
              plans={subscriptionPlans}
              totalCount={subscriptionPlans.reduce(
                (sum, p) => sum + p.count,
                0,
              )}
            />
          </div>
        </div>
      )}

      {/* 4. Most Used Facilities Utilization Grid (Operations Manager, Super Admin, CEO Only) */}
      {canViewDistributionAndFacilities && (
        <div>
          <MostUsedFacilities
            loading={initialLoading}
            facilities={facilityRankings}
          />
        </div>
      )}

      {/* 6. Comprehensive Daily Activity Log Table */}
      <div>
        <DailyActivityTable
          loading={initialLoading || isRefreshing}
          activities={dailyActivities}
          onRefresh={() => loadDashboardTelemetry(true)}
          role={user?.role}
        />
      </div>

      {/* 7. Walk-In Pass Modal */}
      <WalkInModal
        isOpen={isWalkInModalOpen}
        onClose={() => {
          setIsWalkInModalOpen(false);
          loadDashboardTelemetry();
        }}
      />
    </div>
  );
}
