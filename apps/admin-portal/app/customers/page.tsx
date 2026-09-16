"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  UserPlus,
  RefreshCw,
  Loader2,
  Users,
  Download,
  FileText,
} from "lucide-react";
import { useToast } from "@daih/ui";
import { api } from "@daih/api-client";
import { CustomerRecord, CustomerMetrics } from "@daih/types";
import {
  exportCustomersCsv,
  exportCustomersPdf,
} from "../../lib/customerExport";
import {
  MemberMetricsGrid,
  MemberDirectoryToolbar,
  MemberDirectoryTable,
  MemberDetailModal,
  AddMemberModal,
  CustomerReferralsModal,
} from "../../components/customers";

export default function CustomersPage() {
  const toast = useToast();
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [metrics, setMetrics] = useState<CustomerMetrics>({
    totalMembers: 0,
    activeNow: 0,
    newThisMonth: 0,
    mrrGrowth: "₦0",
  });
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [tierFilter, setTierFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Export states
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Modals
  const [selectedMember, setSelectedMember] = useState<CustomerRecord | null>(
    null,
  );
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedReferralMember, setSelectedReferralMember] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isReferralsModalOpen, setIsReferralsModalOpen] = useState(false);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.customers.getCustomers({
        search: searchQuery.trim() || undefined,
        status: statusFilter === "ALL" ? undefined : statusFilter,
        tier: tierFilter === "ALL" ? undefined : tierFilter,
        page: currentPage,
        limit: pageSize,
      });

      setCustomers(res.customers || []);
      setTotalCount(res.total ?? 0);
      if (res.metrics) {
        setMetrics(res.metrics);
      }
    } catch (err: any) {
      toast.error(
        err?.message || "Failed to fetch customer members from database",
        {
          title: "Error Loading Customers",
        },
      );
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, tierFilter, currentPage, pageSize]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleViewMember = (member: any) => {
    setSelectedMember(member);
    setIsDetailModalOpen(true);
  };

  const handleViewReferrals = (member: any) => {
    setSelectedReferralMember({
      id: member.userId || member.id,
      name: member.name,
    });
    setIsReferralsModalOpen(true);
  };

  const handleSelectReferredMember = (clientIdOrId: string) => {
    const found = customers.find(
      (c) => c.id === clientIdOrId || c.userId === clientIdOrId,
    );
    if (found) {
      setSelectedMember(found);
      setIsDetailModalOpen(true);
    } else {
      // If not on current page, search for them
      setSearchQuery(clientIdOrId);
    }
  };

  const handleMemberAdded = (newMember: CustomerRecord) => {
    fetchCustomers();
  };

  const handleExportCsv = async () => {
    setIsExportingCsv(true);
    try {
      const res = await api.customers.getCustomers({
        search: searchQuery || undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        tier: tierFilter !== "ALL" ? tierFilter : undefined,
        limit: 1000,
      });
      const records =
        res.customers && res.customers.length > 0 ? res.customers : customers;
      if (records.length === 0) {
        toast.warning("No customer records available to export.", {
          title: "Export Empty",
        });
        return;
      }
      exportCustomersCsv(records);
      toast.success(
        `Exported ${records.length} customer records to CSV successfully.`,
        {
          title: "CSV Exported",
        },
      );
    } catch (err: any) {
      console.error("Failed to export customers to CSV:", err);
      if (customers.length > 0) {
        exportCustomersCsv(customers);
        toast.success(`Exported ${customers.length} customer records to CSV.`, {
          title: "CSV Exported",
        });
      } else {
        toast.error(err?.message || "Failed to export customer records.", {
          title: "Export Failed",
        });
      }
    } finally {
      setIsExportingCsv(false);
    }
  };

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      const res = await api.customers.getCustomers({
        search: searchQuery || undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        tier: tierFilter !== "ALL" ? tierFilter : undefined,
        limit: 1000,
      });
      const records =
        res.customers && res.customers.length > 0 ? res.customers : customers;
      if (records.length === 0) {
        toast.warning("No customer records available to export.", {
          title: "Export Empty",
        });
        return;
      }
      exportCustomersPdf(records);
      toast.success(
        `Generated official PDF directory report for ${records.length} members.`,
        {
          title: "PDF Report Generated",
        },
      );
    } catch (err: any) {
      console.error("Failed to export customers to PDF:", err);
      if (customers.length > 0) {
        exportCustomersPdf(customers);
        toast.success(
          `Generated official PDF directory report for ${customers.length} members.`,
          {
            title: "PDF Report Generated",
          },
        );
      } else {
        toast.error(err?.message || "Failed to generate customer PDF report.", {
          title: "Export Failed",
        });
      }
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#181c20] tracking-tight">
            Member Directory
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Live database records of community members, Client IDs, and active
            subscriptions.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Export PDF Button */}
          <button
            onClick={handleExportPdf}
            disabled={isExportingPdf || loading}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-[#23055c] hover:bg-[#34117c] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-60"
            title="Export Customer Directory as PDF (Includes Date of Birth)"
          >
            {isExportingPdf ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileText className="w-3.5 h-3.5 text-purple-200" />
            )}
            <span>{isExportingPdf ? "Generating PDF..." : "Export PDF"}</span>
          </button>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCsv}
            disabled={isExportingCsv || loading}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-white border border-slate-200 text-slate-700 hover:text-[#23055c] hover:bg-purple-50/50 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer disabled:opacity-60"
            title="Export Customer Directory as CSV (Includes Date of Birth)"
          >
            {isExportingCsv ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5 text-slate-500" />
            )}
            <span>{isExportingCsv ? "Exporting..." : "Export CSV"}</span>
          </button>

          <button
            onClick={fetchCustomers}
            disabled={loading}
            className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition-all shadow-2xs cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin text-[#23055c]" : ""}`}
            />
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-[#23055c] hover:bg-[#392271] text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            Add New Member
          </button>
        </div>
      </div>

      {/* 4 Metric Summary Cards */}
      <div id="tiers" className="scroll-mt-20">
        <MemberMetricsGrid
          totalMembers={metrics.totalMembers}
          activeNow={metrics.activeNow}
          newThisMonth={metrics.newThisMonth}
          mrrGrowth={metrics.mrrGrowth}
        />
      </div>

      {/* Directory Table Section */}
      <div id="directory" className="space-y-0 scroll-mt-20">
        <div className="bg-white rounded-2xl border border-[#EBE7F5] shadow-[0_4px_12px_rgba(33,37,41,0.04)] overflow-hidden">
          {/* Toolbar */}
          <MemberDirectoryToolbar
            searchQuery={searchQuery}
            onSearchChange={(q) => {
              setSearchQuery(q);
              setCurrentPage(1);
            }}
            statusFilter={statusFilter}
            onStatusFilterChange={(s) => {
              setStatusFilter(s);
              setCurrentPage(1);
            }}
            tierFilter={tierFilter}
            onTierFilterChange={(t) => {
              setTierFilter(t);
              setCurrentPage(1);
            }}
          />

          {/* Table */}
          {loading ? (
            <div className="py-24 text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-[#23055c] mx-auto" />
              <p className="text-xs text-slate-500 font-semibold">
                Loading live members from database...
              </p>
            </div>
          ) : customers.length === 0 ? (
            <div className="py-20 text-center space-y-3">
              <Users className="h-10 w-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">
                No members found
              </p>
              <p className="text-xs text-slate-400">
                {searchQuery || statusFilter !== "ALL" || tierFilter !== "ALL"
                  ? "No members match the selected filters. Try resetting search or filter."
                  : 'No registered customers in the database yet. Click "Add New Member" to create one.'}
              </p>
            </div>
          ) : (
            <MemberDirectoryTable
              members={customers as any}
              totalCount={totalCount}
              currentPage={currentPage}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onViewMember={handleViewMember}
              onViewReferrals={handleViewReferrals}
            />
          )}
        </div>
      </div>

      {/* Referrals Breakdown Modal */}
      <CustomerReferralsModal
        isOpen={isReferralsModalOpen}
        customerId={selectedReferralMember?.id || null}
        customerName={selectedReferralMember?.name}
        onClose={() => setIsReferralsModalOpen(false)}
        onSelectReferredMember={handleSelectReferredMember}
      />

      {/* Detail Modal */}
      <MemberDetailModal
        isOpen={isDetailModalOpen}
        member={selectedMember as any}
        onClose={() => setIsDetailModalOpen(false)}
      />

      {/* Add Member Modal */}
      <AddMemberModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onMemberAdded={handleMemberAdded}
      />
    </div>
  );
}
