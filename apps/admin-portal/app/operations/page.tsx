"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useToast } from "@daih/ui";
import { api } from "@daih/api-client";
import {
  FacilityResource,
  ResourcePricingPlan,
  CreateResourceDTO,
  CreatePricingPlanDTO,
  UpdatePricingPlanDTO,
  CreateBlackoutDTO,
  UpsertScheduleDTO,
} from "@daih/types";
import { ResourceMetrics } from "../../components/operations/ResourceMetrics";
import { ResourceCard } from "../../components/operations/ResourceCard";
import { ResourceTableView } from "../../components/operations/ResourceTableView";
import {
  AddEditResourceModal,
  PricingManagementModal,
  BlackoutManagementModal,
  ScheduleManagementModal,
  ResourceFilterModal,
  DeleteResourceModal,
  UpdateResourceImageModal,
} from "../../components/operations/ResourceModals";
import {
  Plus,
  Filter,
  LayoutGrid,
  List,
  Loader2,
  RefreshCw,
  Layers,
  Download,
} from "lucide-react";

export default function OperationsPage() {
  const toast = useToast();
  const [resources, setResources] = useState<FacilityResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Filter state
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [resourceToEdit, setResourceToEdit] = useState<FacilityResource | null>(
    null,
  );
  const [imageResource, setImageResource] = useState<FacilityResource | null>(
    null,
  );
  const [pricingResource, setPricingResource] =
    useState<FacilityResource | null>(null);
  const [blackoutResource, setBlackoutResource] =
    useState<FacilityResource | null>(null);
  const [scheduleResource, setScheduleResource] =
    useState<FacilityResource | null>(null);
  const [resourceToDelete, setResourceToDelete] =
    useState<FacilityResource | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const toastRef = React.useRef(toast);
  toastRef.current = toast;

  const [exportingReport, setExportingReport] = useState(false);

  const fetchResources = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }
    try {
      const data = await api.catalogue.getAdminResources();
      setResources(data);
      setPricingResource((prev) => {
        if (!prev) return null;
        return data.find((r) => r.id === prev.id) || prev;
      });
      return data;
    } catch (err: any) {
      toastRef.current.error(
        err?.message || "Failed to fetch resource inventory",
        {
          title: "Error loading resources",
        },
      );
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  const handleExportOperationsReport = async () => {
    setExportingReport(true);
    try {
      await api.reports.downloadExport({
        type: "occupancy",
        format: "pdf",
      });
      toast.success("Operations occupancy report downloaded successfully.", {
        title: "Report Exported",
      });
    } catch (err: any) {
      toast.error(err?.message || "Failed to download operations report", {
        title: "Download Failed",
      });
    } finally {
      setExportingReport(false);
    }
  };

  // Handle Save Resource (Create or Update)
  const handleSaveResource = async (payload: CreateResourceDTO) => {
    setSubmitting(true);
    try {
      if (resourceToEdit) {
        await api.catalogue.updateResource(resourceToEdit.id, payload);
        toast.success(`${payload.name} details saved successfully.`, {
          title: "Resource Updated",
        });
        setResourceToEdit(null);
        setIsAddOpen(false);
      } else {
        await api.catalogue.createResource(payload);
        toast.success(`${payload.name} added to workspace directory.`, {
          title: "Resource Created",
        });
        setIsAddOpen(false);
      }
      await fetchResources();
    } catch (err: any) {
      toast.error(err?.message || "Could not save resource", {
        title: "Save Failed",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Quick Photo Update
  const handleUpdateResourceImage = async (
    resourceId: string,
    imageUrl: string,
  ) => {
    try {
      await api.catalogue.updateResource(resourceId, { imageUrl });
      toast.success("Workspace photo updated and saved successfully.", {
        title: "Photo Updated",
      });
      setImageResource(null);
      await fetchResources();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update workspace photo", {
        title: "Photo Update Failed",
      });
      throw err;
    }
  };

  // Handle Toggle Active / Offline
  const handleToggleActive = async (res: FacilityResource) => {
    const nextActiveState = !res.isActive;

    // Optimistically update local UI immediately (zero flash, zero reload)
    setResources((prev) =>
      prev.map((r) =>
        r.id === res.id ? { ...r, isActive: nextActiveState } : r,
      ),
    );

    try {
      await api.catalogue.updateResource(res.id, { isActive: nextActiveState });
      toast.info(
        `${res.name} is now ${nextActiveState ? "live and active" : "offline/deactivated"}.`,
        {
          title: nextActiveState
            ? "Resource Reactivated"
            : "Resource Deactivated",
        },
      );
      // Background sync without unmounting or triggering full-page loading state
      await fetchResources(true);
    } catch (err: any) {
      // Revert optimistic update on failure
      setResources((prev) =>
        prev.map((r) =>
          r.id === res.id ? { ...r, isActive: res.isActive } : r,
        ),
      );
      toast.error(err?.message || "Failed to update status", {
        title: "Status Update Failed",
      });
    }
  };

  // Handle Delete Resource
  const handleDeleteResource = async (res: FacilityResource) => {
    setSubmitting(true);
    try {
      await api.catalogue.deleteResource(res.id);
      toast.success(`${res.name} was successfully removed.`, {
        title: "Resource Deleted",
      });
      setResourceToDelete(null);
      if (resourceToEdit?.id === res.id) {
        setResourceToEdit(null);
        setIsAddOpen(false);
      }
      await fetchResources();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete workspace resource", {
        title: "Delete Failed",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Add Pricing Plan
  const handleAddPricingPlan = async (
    resourceId: string,
    plan: CreatePricingPlanDTO,
  ) => {
    try {
      await api.catalogue.createPricingPlan(resourceId, plan);
      toast.success(
        `Plan '${plan.planName}' added at ₦${plan.price.toLocaleString()}.`,
        {
          title: "Pricing Plan Added",
        },
      );
      await fetchResources();
    } catch (err: any) {
      toast.error(err?.message || "Could not add pricing plan", {
        title: "Plan Creation Failed",
      });
      throw err;
    }
  };

  // Handle Update / Edit Pricing Plan
  const handleUpdatePricingPlan = async (
    planId: string,
    plan: UpdatePricingPlanDTO,
  ) => {
    if (!pricingResource) return;
    try {
      const existingPlan = pricingResource.pricing?.find(
        (p: ResourcePricingPlan) => p.id === planId,
      );

      await api.catalogue.updatePricingPlan(planId, plan);

      const planName =
        plan.planName || existingPlan?.planName || "Pricing plan";

      const oldPrice = existingPlan ? Number(existingPlan.price) : undefined;
      const newPrice =
        plan.price !== undefined ? Number(plan.price) : undefined;
      const priceChanged =
        oldPrice !== undefined &&
        newPrice !== undefined &&
        oldPrice !== newPrice;

      const oldMonths = existingPlan?.durationMonths
        ? Number(existingPlan.durationMonths)
        : null;
      const newMonths = plan.durationMonths
        ? Number(plan.durationMonths)
        : null;

      const oldDays = existingPlan?.durationDays
        ? Number(existingPlan.durationDays)
        : null;
      const newDays = plan.durationDays ? Number(plan.durationDays) : null;

      const oldHours = existingPlan?.durationHours
        ? Number(existingPlan.durationHours)
        : null;
      const newHours = plan.durationHours ? Number(plan.durationHours) : null;

      const durationChanged =
        oldMonths !== newMonths || oldDays !== newDays || oldHours !== newHours;

      let message = `Plan '${planName}' updated successfully.`;
      if (durationChanged && !priceChanged) {
        let durationDesc = "duration";
        if (newMonths && newMonths > 0) {
          if (newMonths % 12 === 0) {
            const yrs = newMonths / 12;
            durationDesc = `${yrs} year${yrs > 1 ? "s" : ""}`;
          } else {
            durationDesc = `${newMonths} month${newMonths > 1 ? "s" : ""}`;
          }
        } else if (newDays && newDays > 0) {
          durationDesc = `${newDays} day${newDays > 1 ? "s" : ""}`;
        } else if (newHours && newHours > 0) {
          durationDesc = `${newHours} hour${newHours > 1 ? "s" : ""}`;
        }
        message = `Plan '${planName}' duration updated to ${durationDesc}.`;
      } else if (priceChanged && !durationChanged) {
        message = `Plan '${planName}' price updated to ₦${Number(newPrice || 0).toLocaleString()}.`;
      }

      toast.success(message, {
        title: "Pricing Plan Updated",
      });
      await fetchResources();
    } catch (err: any) {
      toast.error(err?.message || "Could not update pricing plan", {
        title: "Update Failed",
      });
      throw err;
    }
  };

  // Handle Delete Pricing Plan
  const handleDeletePricingPlan = async (planId: string) => {
    if (!pricingResource) return;
    try {
      await api.catalogue.deletePricingPlan(planId);
      toast.info("Pricing plan removed successfully.", {
        title: "Plan Removed",
      });
      await fetchResources();
    } catch (err: any) {
      toast.error(err?.message || "Could not delete pricing plan", {
        title: "Delete Failed",
      });
      throw err;
    }
  };

  // Handle Add Blackout Window
  const handleAddBlackout = async (
    resourceId: string,
    blackout: CreateBlackoutDTO,
  ) => {
    try {
      await api.catalogue.createBlackout(resourceId, blackout);
      toast.success("Maintenance schedule created and space blocked.", {
        title: "Blackout Scheduled",
      });
      const updated = await api.catalogue.getResourceById(resourceId);
      setBlackoutResource(updated);
      await fetchResources();
    } catch (err: any) {
      toast.error(err?.message || "Could not schedule blackout", {
        title: "Blackout Failed",
      });
    }
  };

  // Handle Delete Blackout Window
  const handleDeleteBlackout = async (blackoutId: string) => {
    if (!blackoutResource) return;
    try {
      await api.catalogue.deleteBlackout(blackoutId);
      toast.info("Maintenance blackout removed. Space is operational.", {
        title: "Blackout Removed",
      });
      const updated = await api.catalogue.getResourceById(blackoutResource.id);
      setBlackoutResource(updated);
      await fetchResources();
    } catch (err: any) {
      toast.error(err?.message || "Could not remove blackout schedule", {
        title: "Delete Failed",
      });
    }
  };

  // Handle Update Operating Schedules
  const handleUpdateSchedules = async (
    resourceId: string,
    schedules: UpsertScheduleDTO[],
  ) => {
    try {
      await api.catalogue.updateSchedules(resourceId, schedules);
      toast.success("Operating hours and availability updated successfully.", {
        title: "Schedule Updated",
      });
      const updated = await api.catalogue.getResourceById(resourceId);
      setScheduleResource(updated);
      await fetchResources();
    } catch (err: any) {
      toast.error(err?.message || "Could not save operating schedule", {
        title: "Schedule Update Failed",
      });
      throw err;
    }
  };

  // Filtered resources list
  const filteredResources = useMemo(() => {
    const now = new Date();
    return resources.filter((res) => {
      // Category filter
      if (selectedCategory !== "ALL" && res.category !== selectedCategory) {
        return false;
      }

      // Status filter
      if (selectedStatus === "ACTIVE") {
        return res.isActive;
      }
      if (selectedStatus === "OFFLINE") {
        return !res.isActive;
      }
      if (selectedStatus === "MAINTENANCE") {
        const hasBlackout = (res.blackouts || []).some(
          (b) =>
            b.isActive &&
            new Date(b.startDate) <= now &&
            new Date(b.endDate) >= now,
        );
        return hasBlackout;
      }

      return true;
    });
  }, [resources, selectedCategory, selectedStatus]);

  const hasActiveFilters =
    selectedCategory !== "ALL" || selectedStatus !== "ALL";

  return (
    <div className="w-full">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="font-extrabold text-2xl md:text-3xl text-slate-900 tracking-tight mb-1">
            Resource Management
          </h1>
          <p className="text-sm text-slate-500 font-normal">
            Monitor and configure bookable spaces across the workspace.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleExportOperationsReport}
            disabled={exportingReport}
            className="border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            title="Download Operations Occupancy & Utilization Report (PDF)"
          >
            {exportingReport ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#23055c]" />
            ) : (
              <Download className="h-3.5 w-3.5 text-slate-600" />
            )}
            <span>Export Report</span>
          </button>
          <button
            onClick={() => setFilterModalOpen(true)}
            className={`border px-4 py-2 rounded-lg flex items-center gap-2 font-bold text-xs transition-colors shadow-2xs cursor-pointer ${
              hasActiveFilters
                ? "bg-[#23055c]/10 border-[#23055c] text-[#23055c]"
                : "bg-white border-slate-300 text-slate-800 hover:bg-slate-50"
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            Filter {hasActiveFilters && "• Active"}
          </button>
          <button
            onClick={() => {
              setResourceToEdit(null);
              setIsAddOpen(true);
            }}
            className="bg-[#23055c] hover:bg-[#392271] text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="h-4 w-4" /> New Resource
          </button>
        </div>
      </div>

      {/* Summary Dashboard (High-level metrics) */}
      <ResourceMetrics
        resources={resources}
        onOpenBlackouts={(res) => setBlackoutResource(res)}
      />

      {/* Directory Section Header */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="font-bold text-lg text-slate-900 tracking-tight">
            Directory
          </h2>
          <span className="text-xs text-slate-400 font-medium">
            ({filteredResources.length}{" "}
            {filteredResources.length === 1 ? "space" : "spaces"})
          </span>

          {hasActiveFilters && (
            <button
              onClick={() => {
                setSelectedCategory("ALL");
                setSelectedStatus("ALL");
              }}
              className="text-[11px] font-bold text-[#23055c] hover:underline ml-2 cursor-pointer"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* View Toggles (Grid / List) */}
        <div className="flex items-center bg-slate-200/80 rounded-lg p-1 w-fit">
          <button
            onClick={() => setViewMode("grid")}
            className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === "grid"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Grid
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === "list"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <List className="h-3.5 w-3.5" /> List
          </button>
        </div>

        {/* Add Space Button */}
        <button
          onClick={() => {
            setResourceToEdit(null);
            setIsAddOpen(true);
          }}
          className="bg-[#23055c] hover:bg-[#392271] text-white text-xs font-bold px-4 py-2 rounded-lg transition-all shadow-sm flex items-center gap-1.5 cursor-pointer ml-auto sm:ml-0"
        >
          <Plus className="h-4 w-4" /> Add Space
        </button>
      </div>

      {/* Main Content (Grid or Table) */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-[#23055c] mb-2" />
          <p className="text-xs font-medium">Loading workspace resources...</p>
        </div>
      ) : filteredResources.length === 0 ? (
        <div className="bg-white border border-[#EBE7F5] rounded-xl p-12 text-center text-slate-500">
          <p className="font-semibold text-base text-slate-700">
            No resources match your filter
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Try resetting your category or status filters.
          </p>
          <button
            onClick={() => {
              setSelectedCategory("ALL");
              setSelectedStatus("ALL");
            }}
            className="mt-4 px-4 py-2 text-xs font-bold text-[#23055c] bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          {filteredResources.map((res) => (
            <ResourceCard
              key={res.id}
              resource={res}
              onEdit={(r) => {
                setResourceToEdit(r);
                setIsAddOpen(true);
              }}
              onManagePricing={(r) => setPricingResource(r)}
              onManageBlackouts={(r) => setBlackoutResource(r)}
              onManageSchedules={(r) => setScheduleResource(r)}
              onToggleActive={(r) => handleToggleActive(r)}
              onDelete={(r) => setResourceToDelete(r)}
              onUpdateImage={(r) => setImageResource(r)}
            />
          ))}
        </div>
      ) : (
        <ResourceTableView
          resources={filteredResources}
          onEdit={(r) => {
            setResourceToEdit(r);
            setIsAddOpen(true);
          }}
          onManagePricing={(r) => setPricingResource(r)}
          onManageBlackouts={(r) => setBlackoutResource(r)}
          onManageSchedules={(r) => setScheduleResource(r)}
          onToggleActive={(r) => handleToggleActive(r)}
          onDelete={(r) => setResourceToDelete(r)}
          onUpdateImage={(r) => setImageResource(r)}
        />
      )}

      {/* Add / Edit Resource Modal */}
      <AddEditResourceModal
        isOpen={isAddOpen}
        onClose={() => {
          setIsAddOpen(false);
          setResourceToEdit(null);
        }}
        resourceToEdit={resourceToEdit}
        onSave={handleSaveResource}
        onDelete={(r) => {
          setIsAddOpen(false);
          setResourceToEdit(null);
          setResourceToDelete(r);
        }}
        submitting={submitting}
      />

      {/* Quick Update Resource Photo Modal */}
      <UpdateResourceImageModal
        isOpen={Boolean(imageResource)}
        resource={imageResource}
        onClose={() => setImageResource(null)}
        onSaveImage={handleUpdateResourceImage}
      />

      {/* Delete Resource Confirmation Modal */}
      <DeleteResourceModal
        resource={resourceToDelete}
        isOpen={Boolean(resourceToDelete)}
        onClose={() => setResourceToDelete(null)}
        onConfirm={handleDeleteResource}
        submitting={submitting}
      />

      {/* Pricing Management Modal */}
      <PricingManagementModal
        resource={pricingResource}
        onClose={() => setPricingResource(null)}
        onAddPlan={handleAddPricingPlan}
        onUpdatePlan={handleUpdatePricingPlan}
        onDeletePlan={handleDeletePricingPlan}
      />

      {/* Operating Schedule Modal */}
      <ScheduleManagementModal
        resource={scheduleResource}
        onClose={() => setScheduleResource(null)}
        onSave={handleUpdateSchedules}
      />

      {/* Maintenance & Blackout Modal */}
      <BlackoutManagementModal
        resource={blackoutResource}
        onClose={() => setBlackoutResource(null)}
        onAddBlackout={handleAddBlackout}
        onDeleteBlackout={handleDeleteBlackout}
      />

      {/* Directory Filter Modal */}
      <ResourceFilterModal
        isOpen={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        selectedStatus={selectedStatus}
        onSelectStatus={setSelectedStatus}
      />
    </div>
  );
}
