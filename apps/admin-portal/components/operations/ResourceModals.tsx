"use client";

import React, { useState, useEffect, useRef } from "react";
import { Modal, Button, Input } from "@daih/ui";
import { api } from "@daih/api-client";
import { compressImage, formatFileSize } from "../../lib/image-compression";
import { resolveResourceImageUrl } from "../../lib/image-utils";
import {
  FacilityResource,
  ResourceCategory,
  CreateResourceDTO,
  CreatePricingPlanDTO,
  UpdatePricingPlanDTO,
  CreateBlackoutDTO,
  UpsertScheduleDTO,
} from "@daih/types";
import {
  Trash2,
  Plus,
  CalendarOff,
  Tag,
  Wrench,
  Image as ImageIcon,
  Pencil,
  Check,
  X,
  Loader2,
  Clock,
  Sparkles,
  UploadCloud,
  Upload,
  FileImage,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Globe,
  Layers,
} from "lucide-react";

const CATEGORIES: { label: string; value: ResourceCategory }[] = [
  { label: "Flex Desk", value: ResourceCategory.FLEX_DESK },
  { label: "Dedicated Desk", value: ResourceCategory.DEDICATED_DESK },
  {
    label: "Private Office / Mini Conference",
    value: ResourceCategory.OFFICE_SUITE,
  },
  { label: "Training / Meeting Room", value: ResourceCategory.TRAINING_ROOM },
  { label: "Rooftop Lounge", value: ResourceCategory.ROOFTOP_LOUNGE },
  { label: "Studio", value: ResourceCategory.STUDIO },
];

export const IMAGE_PRESETS = [
  { label: "Flex Desk (Open Plan)", url: "/images/search/2.jpg" },
  { label: "Dedicated Desk (Workstation)", url: "/images/search/1.jpg" },
  { label: "Private Office (Executive)", url: "/images/search/3.jpg" },
  { label: "Training / Meeting Room", url: "/images/search/5.jpg" },
  { label: "Rooftop Lounge & Terrace", url: "/images/search/6.jpg" },
  { label: "Studio & Production", url: "/images/search/4.jpg" },
  { label: "Podcast Studio Suite", url: "/images/misc/space-type-podcast.jpg" },
  { label: "Photo & Video Studio", url: "/images/misc/space-type-photo.jpg" },
  {
    label: "Streaming Broadcast Hub",
    url: "/images/misc/space-type-streaming.jpg",
  },
];

interface ResourceImageManagerProps {
  value?: string | null;
  onChange: (url: string) => void;
  resourceId?: string;
  category?: ResourceCategory;
}

export function ResourceImageManager({
  value,
  onChange,
  resourceId,
  category,
}: ResourceImageManagerProps) {
  const [activeTab, setActiveTab] = useState<"upload" | "preset" | "url">(
    "upload",
  );
  const [isCompressing, setIsCompressing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [compressionStats, setCompressionStats] = useState<{
    originalSize: string;
    compressedSize: string;
    savings: number;
    fileName: string;
  } | null>(null);
  const [customUrlInput, setCustomUrlInput] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentImageUrl = value || "";

  // Helper to resolve display URL (e.g. if relative /uploads/)
  const resolvedDisplayUrl = resolveResourceImageUrl(currentImageUrl, category);

  const handleProcessFile = async (file: File) => {
    if (!file) return;

    // Validate file is an image
    if (!file.type.startsWith("image/")) {
      setUploadError("Please select a valid image file (PNG, JPG, WebP, SVG)");
      return;
    }

    setUploadError(null);
    setIsCompressing(true);
    setCompressionStats(null);

    try {
      // 1. Client-Side compression before upload
      const compressed = await compressImage(file, {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.85,
        mimeType: "image/webp",
      });

      setCompressionStats({
        originalSize: formatFileSize(compressed.originalSize),
        compressedSize: formatFileSize(compressed.compressedSize),
        savings: compressed.savingsPercentage,
        fileName: compressed.fileName,
      });

      setIsCompressing(false);
      setIsUploading(true);

      // 2. Server-side upload and optimization
      const res = await api.catalogue.uploadImage({
        data: compressed.data,
        fileName: compressed.fileName,
        contentType: compressed.contentType,
        resourceId,
      });

      onChange(res.url);
    } catch (err: any) {
      setUploadError(err?.message || "Failed to process and upload image");
    } finally {
      setIsCompressing(false);
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
          <ImageIcon className="h-4 w-4 text-[#23055c]" /> Workspace Photo
        </label>
        <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-[11px] font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("upload")}
            className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
              activeTab === "upload"
                ? "bg-white text-[#23055c] shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <UploadCloud className="h-3 w-3" /> Upload Photo
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("preset")}
            className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
              activeTab === "preset"
                ? "bg-white text-[#23055c] shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Sparkles className="h-3 w-3" /> Presets
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("url")}
            className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
              activeTab === "url"
                ? "bg-white text-[#23055c] shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Globe className="h-3 w-3" /> Direct URL
          </button>
        </div>
      </div>

      {/* Tab 1: Upload with Live Compression */}
      {activeTab === "upload" && (
        <div className="space-y-2.5">
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleProcessFile(e.target.files[0]);
              }
            }}
            accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
            className="hidden"
          />

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
              isDragging
                ? "border-[#23055c] bg-purple-50/70"
                : "border-slate-300 hover:border-purple-400 bg-white"
            } ${isCompressing || isUploading ? "pointer-events-none opacity-80" : ""}`}
          >
            {isCompressing || isUploading ? (
              <div className="py-3 flex flex-col items-center justify-center text-slate-600 gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-[#23055c]" />
                <div className="text-xs font-semibold">
                  {isCompressing
                    ? "Compressing & Optimizing Image..."
                    : "Uploading to Server Storage..."}
                </div>
                <p className="text-[11px] text-slate-400">
                  Resizing and compressing to WebP for lightning-fast loads...
                </p>
              </div>
            ) : (
              <div className="py-2 flex flex-col items-center justify-center gap-1.5">
                <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-[#23055c] mb-0.5">
                  <UploadCloud className="h-5 w-5" />
                </div>
                <div className="text-xs font-bold text-slate-800">
                  Click to browse or drag & drop photo here
                </div>
                <p className="text-[10px] text-slate-500">
                  PNG, JPG, WebP or SVG up to 15MB • Automatically compressed
                  before saving
                </p>
              </div>
            )}
          </div>

          {/* Compression feedback badge */}
          {compressionStats && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-[11px] text-emerald-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold">{compressionStats.fileName}</span>
                  :{" "}
                  <span className="text-slate-500 line-through">
                    {compressionStats.originalSize}
                  </span>{" "}
                  →{" "}
                  <span className="font-extrabold text-emerald-700">
                    {compressionStats.compressedSize}
                  </span>
                </div>
              </div>
              <span className="bg-emerald-200/70 text-emerald-800 font-extrabold px-2 py-0.5 rounded text-[10px]">
                {compressionStats.savings}% smaller
              </span>
            </div>
          )}

          {uploadError && (
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-2 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Preset Library Grid */}
      {activeTab === "preset" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-52 overflow-y-auto pr-1">
          {IMAGE_PRESETS.map((p) => {
            const isSelected = currentImageUrl === p.url;
            return (
              <button
                key={p.url}
                type="button"
                onClick={() => onChange(p.url)}
                className={`relative rounded-lg overflow-hidden border text-left transition-all p-1 group cursor-pointer ${
                  isSelected
                    ? "border-[#23055c] ring-2 ring-[#23055c]/20 bg-purple-50/50"
                    : "border-slate-200 hover:border-slate-400 bg-white"
                }`}
              >
                <div className="h-16 w-full rounded overflow-hidden relative bg-slate-100 mb-1">
                  <img
                    src={p.url}
                    alt={p.label}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "/images/search/2.jpg";
                    }}
                  />
                  {isSelected && (
                    <div className="absolute top-1 right-1 bg-[#23055c] text-white rounded-full p-0.5 shadow-xs">
                      <Check className="h-2.5 w-2.5" />
                    </div>
                  )}
                </div>
                <div className="text-[10px] font-bold text-slate-800 truncate px-0.5">
                  {p.label}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Tab 3: Direct URL */}
      {activeTab === "url" && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={customUrlInput || currentImageUrl}
              onChange={(e) => {
                setCustomUrlInput(e.target.value);
                onChange(e.target.value);
              }}
              placeholder="https://example.com/workspace-photo.jpg"
              className="text-xs"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (customUrlInput) onChange(customUrlInput);
              }}
              className="text-xs"
            >
              Apply
            </Button>
          </div>
          <p className="text-[10px] text-slate-400">
            Paste any HTTPS image URL from your CDN or asset host.
          </p>
        </div>
      )}

      {/* Active Selected Image Preview Bar */}
      {currentImageUrl && (
        <div className="flex items-center gap-3 p-2 bg-white rounded-lg border border-slate-200 shadow-2xs">
          <div className="h-12 w-16 rounded overflow-hidden border border-slate-200 bg-slate-100 shrink-0 relative">
            <img
              src={resolvedDisplayUrl}
              alt="Active Preview"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/images/search/2.jpg";
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Selected Image
            </div>
            <div className="text-xs font-semibold text-slate-800 truncate font-mono">
              {currentImageUrl}
            </div>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs text-[#23055c] hover:underline font-bold px-2 py-1 cursor-pointer"
          >
            Change
          </button>
        </div>
      )}
    </div>
  );
}

interface AddEditResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  resourceToEdit: FacilityResource | null;
  onSave: (payload: CreateResourceDTO) => Promise<void>;
  onDelete?: (resource: FacilityResource) => void;
  submitting: boolean;
}

export function AddEditResourceModal({
  isOpen,
  onClose,
  resourceToEdit,
  onSave,
  onDelete,
  submitting,
}: AddEditResourceModalProps) {
  const [formData, setFormData] = useState<CreateResourceDTO>({
    name: "",
    slug: "",
    category: ResourceCategory.FLEX_DESK,
    description: "",
    capacity: 1,
    location: "",
    amenities: [
      "High-Speed Internet/Wi-Fi",
      "24/7 Power supply",
      "Water (Hot/Cold)",
    ],
    imageUrl: "/images/search/2.jpg",
    isPopular: false,
    isActive: true,
  });

  const [amenitiesInput, setAmenitiesInput] = useState("");

  // Synchronize form values whenever modal opens or resourceToEdit changes
  useEffect(() => {
    if (isOpen) {
      if (resourceToEdit) {
        // Prefill full details on edit
        const defaultCategory =
          (resourceToEdit.category as ResourceCategory) ||
          ResourceCategory.FLEX_DESK;
        setFormData({
          name: resourceToEdit.name || "",
          slug: resourceToEdit.slug || "",
          category: defaultCategory,
          description: resourceToEdit.description || "",
          capacity: resourceToEdit.capacity || 1,
          location: resourceToEdit.location || "",
          amenities: resourceToEdit.amenities || [
            "High-Speed Internet/Wi-Fi",
            "24/7 Power supply",
            "Water (Hot/Cold)",
          ],
          imageUrl: resourceToEdit.imageUrl || "/images/search/2.jpg",
          isPopular: Boolean(resourceToEdit.isPopular),
          isActive: resourceToEdit.isActive !== false,
        });
        setAmenitiesInput((resourceToEdit.amenities || []).join(", "));
      } else {
        // Reset to clean blank form on add
        setFormData({
          name: "",
          slug: "",
          category: ResourceCategory.FLEX_DESK,
          description: "",
          capacity: 1,
          location: "",
          amenities: [
            "High-Speed Internet/Wi-Fi",
            "24/7 Power supply",
            "Water (Hot/Cold)",
          ],
          imageUrl: "/images/search/2.jpg",
          isPopular: false,
          isActive: true,
        });
        setAmenitiesInput(
          "High-Speed Internet/Wi-Fi, 24/7 Power supply, Water (Hot/Cold)",
        );
      }
    }
  }, [isOpen, resourceToEdit]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmenities = amenitiesInput
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);

    onSave({
      ...formData,
      amenities: parsedAmenities,
      capacity: Number(formData.capacity) || 1,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-2xl"
      title={
        resourceToEdit
          ? `Edit Details: ${resourceToEdit.name}`
          : "Create New Workspace Resource"
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Resource Name *
            </label>
            <Input
              required
              value={formData.name}
              onChange={(e) => {
                const name = e.target.value;
                const autoSlug = name
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")
                  .replace(/(^-|-$)/g, "");
                setFormData((prev) => ({
                  ...prev,
                  name,
                  slug: resourceToEdit ? prev.slug : autoSlug,
                }));
              }}
              placeholder="e.g. Flex Desk"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              URL Slug *
            </label>
            <Input
              required
              value={formData.slug}
              onChange={(e) =>
                setFormData({ ...formData, slug: e.target.value })
              }
              placeholder="e.g. flex-desk"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Category *
            </label>
            <select
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-900"
              value={formData.category}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  category: e.target.value as ResourceCategory,
                })
              }
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Total Capacity (Persons) *
            </label>
            <Input
              type="number"
              required
              min={1}
              value={formData.capacity}
              onChange={(e) =>
                setFormData({ ...formData, capacity: Number(e.target.value) })
              }
            />
          </div>
        </div>

        <div>
          <label className="font-semibold text-slate-700 block mb-1">
            Physical Location *
          </label>
          <Input
            required
            value={formData.location}
            onChange={(e) =>
              setFormData({ ...formData, location: e.target.value })
            }
            placeholder="e.g. Ground Floor, Innovation Lounge"
          />
        </div>

        {/* Space Image Manager (Upload with compression, Presets, Custom URL) */}
        <ResourceImageManager
          value={formData.imageUrl}
          onChange={(url) => setFormData({ ...formData, imageUrl: url })}
          resourceId={resourceToEdit?.id}
          category={formData.category}
        />

        <div>
          <label className="font-semibold text-slate-700 block mb-1">
            Description *
          </label>
          <textarea
            required
            rows={3}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-900"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder="Detailed description of features and layout..."
          />
        </div>

        <div>
          <label className="font-semibold text-slate-700 block mb-1">
            Amenities (comma-separated)
          </label>
          <Input
            value={amenitiesInput}
            onChange={(e) => setAmenitiesInput(e.target.value)}
            placeholder="e.g. High-Speed Internet/Wi-Fi, 24/7 Power supply, Water (Hot/Cold)"
          />
        </div>

        <div className="flex items-center gap-6 pt-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) =>
                setFormData({ ...formData, isActive: e.target.checked })
              }
              className="rounded border-slate-300 text-[#23055c]"
            />
            <span className="text-slate-700 font-medium">
              Active (Visible in catalogue)
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isPopular}
              onChange={(e) =>
                setFormData({ ...formData, isPopular: e.target.checked })
              }
              className="rounded border-slate-300 text-[#23055c]"
            />
            <span className="text-slate-700 font-medium">
              Featured / Popular Badge
            </span>
          </label>
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-slate-200">
          {resourceToEdit && onDelete ? (
            <button
              type="button"
              onClick={() => onDelete(resourceToEdit)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 font-semibold px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer text-xs"
            >
              <Trash2 className="h-4 w-4" /> Delete Resource
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-3">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              isLoading={submitting}
              className="bg-[#23055c] hover:bg-[#392271] text-white"
            >
              {resourceToEdit ? "Save Changes" : "Create Workspace"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
interface PricingManagementModalProps {
  resource: FacilityResource | null;
  onClose: () => void;
  onAddPlan: (resourceId: string, plan: CreatePricingPlanDTO) => Promise<void>;
  onUpdatePlan?: (planId: string, plan: UpdatePricingPlanDTO) => Promise<void>;
  onDeletePlan: (planId: string) => Promise<void>;
}

export function PricingManagementModal({
  resource,
  onClose,
  onAddPlan,
  onUpdatePlan,
  onDeletePlan,
}: PricingManagementModalProps) {
  const [newPlan, setNewPlan] = useState<CreatePricingPlanDTO>({
    planName: "",
    price: 0,
    currency: "NGN",
    durationDays: 1,
    isPopular: false,
    isActive: true,
  });
  const [durationType, setDurationType] = useState<
    "days" | "hours" | "months" | "years"
  >("days");
  const [durationValue, setDurationValue] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);

  // Edit Mode State for Existing Pricing Tier
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<{
    planName: string;
    price: number;
    isPopular: boolean;
    durationType: "days" | "hours" | "months" | "years";
    durationValue: number;
  }>({
    planName: "",
    price: 0,
    isPopular: false,
    durationType: "days",
    durationValue: 1,
  });
  const [updatingPlan, setUpdatingPlan] = useState(false);

  if (!resource) return null;

  const handleStartEdit = (plan: any) => {
    setEditingPlanId(plan.id);
    let dType: "days" | "hours" | "months" | "years" = "days";
    let dVal = 1;
    if (plan.durationHours) {
      dType = "hours";
      dVal = plan.durationHours;
    } else if (plan.durationMonths) {
      if (plan.durationMonths % 12 === 0) {
        dType = "years";
        dVal = plan.durationMonths / 12;
      } else {
        dType = "months";
        dVal = plan.durationMonths;
      }
    } else if (plan.durationDays) {
      dType = "days";
      dVal = plan.durationDays;
    }

    setEditFormData({
      planName: plan.planName || "",
      price: Number(plan.price) || 0,
      isPopular: Boolean(plan.isPopular),
      durationType: dType,
      durationValue: dVal,
    });
  };

  const handleCancelEdit = () => {
    setEditingPlanId(null);
  };

  const handleSaveEdit = async (planId: string) => {
    if (!onUpdatePlan) return;
    if (
      !editFormData.planName.trim() ||
      !editFormData.price ||
      Number(editFormData.price) <= 0
    )
      return;

    setUpdatingPlan(true);
    try {
      const payload: UpdatePricingPlanDTO = {
        planName: editFormData.planName.trim(),
        price: Number(editFormData.price),
        isPopular: Boolean(editFormData.isPopular),
        durationDays:
          editFormData.durationType === "days"
            ? Number(editFormData.durationValue) || 1
            : (null as any),
        durationHours:
          editFormData.durationType === "hours"
            ? Number(editFormData.durationValue) || 1
            : (null as any),
        durationMonths:
          editFormData.durationType === "years"
            ? (Number(editFormData.durationValue) || 1) * 12
            : editFormData.durationType === "months"
              ? Number(editFormData.durationValue) || 1
              : (null as any),
      };
      await onUpdatePlan(planId, payload);
      setEditingPlanId(null);
    } catch {
      // Error handled by parent toast
    } finally {
      setUpdatingPlan(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlan.planName.trim()) return;
    if (!newPlan.price || Number(newPlan.price) <= 0) return;

    setSubmitting(true);
    const payload: CreatePricingPlanDTO = {
      planName: newPlan.planName.trim(),
      price: Number(newPlan.price),
      currency: "NGN",
      isPopular: Boolean(newPlan.isPopular),
      isActive: true,
      durationDays:
        durationType === "days" ? Number(durationValue) || 1 : undefined,
      durationHours:
        durationType === "hours" ? Number(durationValue) || 1 : undefined,
      durationMonths:
        durationType === "years"
          ? (Number(durationValue) || 1) * 12
          : durationType === "months"
            ? Number(durationValue) || 1
            : undefined,
    };

    try {
      await onAddPlan(resource.id, payload);
      setNewPlan({
        planName: "",
        price: 0,
        currency: "NGN",
        isPopular: false,
        isActive: true,
      });
      setDurationValue(1);
    } catch {
      // Error handled by parent toast
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      className="max-w-2xl"
      title={`Pricing Plans: ${resource.name}`}
    >
      <div className="space-y-6 text-xs">
        <div>
          <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-1.5">
            <Tag className="h-4 w-4 text-blue-600" /> Active Pricing Tiers
          </h4>
          {resource.pricing && resource.pricing.length > 0 ? (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Plan Name</th>
                    <th className="p-2.5">Duration</th>
                    <th className="p-2.5 text-right">Rate (NGN)</th>
                    <th className="p-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {resource.pricing.map((plan) => {
                    const isEditing = editingPlanId === plan.id;
                    const currencySymbol =
                      plan.currency === "NGN" ? "₦" : plan.currency || "₦";

                    if (isEditing) {
                      return (
                        <tr key={plan.id} className="bg-purple-50/70">
                          <td className="p-2.5">
                            <input
                              type="text"
                              value={editFormData.planName}
                              onChange={(e) =>
                                setEditFormData({
                                  ...editFormData,
                                  planName: e.target.value,
                                })
                              }
                              className="w-full px-2 py-1 border border-purple-300 rounded text-xs bg-white text-slate-900 font-bold"
                              placeholder="Plan name"
                            />
                            <label className="flex items-center gap-1 mt-1 text-[10px] text-slate-600 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editFormData.isPopular}
                                onChange={(e) =>
                                  setEditFormData({
                                    ...editFormData,
                                    isPopular: e.target.checked,
                                  })
                                }
                                className="rounded text-[#23055c] scale-90"
                              />
                              Popular
                            </label>
                          </td>
                          <td className="p-2.5">
                            <div className="flex gap-1 items-center">
                              <input
                                type="number"
                                min={1}
                                value={editFormData.durationValue}
                                onChange={(e) =>
                                  setEditFormData({
                                    ...editFormData,
                                    durationValue: Number(e.target.value),
                                  })
                                }
                                className="w-14 px-1.5 py-1 border border-purple-300 rounded text-xs bg-white text-slate-900 text-center"
                              />
                              <select
                                value={editFormData.durationType}
                                onChange={(e) =>
                                  setEditFormData({
                                    ...editFormData,
                                    durationType: e.target.value as any,
                                  })
                                }
                                className="px-1.5 py-1 border border-purple-300 rounded text-[11px] bg-white text-slate-900"
                              >
                                <option value="days">Days</option>
                                <option value="months">Months</option>
                                <option value="years">Years</option>
                                <option value="hours">Hours</option>
                              </select>
                            </div>
                          </td>
                          <td className="p-2.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <span className="font-bold text-slate-600 text-xs">
                                ₦
                              </span>
                              <input
                                type="number"
                                min={100}
                                value={editFormData.price || ""}
                                onChange={(e) =>
                                  setEditFormData({
                                    ...editFormData,
                                    price: Number(e.target.value),
                                  })
                                }
                                className="w-24 px-2 py-1 border border-purple-300 rounded text-xs bg-white text-slate-900 font-bold text-right"
                                placeholder="Price"
                              />
                            </div>
                          </td>
                          <td className="p-2.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(plan.id)}
                                disabled={updatingPlan}
                                className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] inline-flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                                title="Save changes"
                              >
                                {updatingPlan ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Check className="h-3 w-3" />
                                )}
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelEdit}
                                disabled={updatingPlan}
                                className="p-1 rounded text-slate-500 hover:bg-slate-200 cursor-pointer transition-colors"
                                title="Cancel edit"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr
                        key={plan.id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="p-2.5 font-bold text-slate-900">
                          {plan.planName}
                          {plan.isPopular && (
                            <span className="ml-1.5 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] font-bold">
                              Popular
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-slate-600 font-medium">
                          {plan.durationHours
                            ? `${plan.durationHours} Hour(s)`
                            : ""}
                          {plan.durationDays
                            ? `${plan.durationDays} Day(s)`
                            : ""}
                          {plan.durationMonths
                            ? plan.durationMonths % 12 === 0
                              ? `${plan.durationMonths / 12} Year(s)`
                              : `${plan.durationMonths} Month(s)`
                            : ""}
                        </td>
                        <td className="p-2.5 text-right font-extrabold text-[#23055c]">
                          {currencySymbol}
                          {Number(plan.price).toLocaleString()}
                        </td>
                        <td className="p-2.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleStartEdit(plan)}
                              className="text-blue-600 hover:bg-blue-50 p-1.5 rounded transition-colors cursor-pointer"
                              title="Edit price and duration"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => onDeletePlan(plan.id)}
                              className="text-red-600 hover:bg-red-50 p-1.5 rounded transition-colors cursor-pointer"
                              title="Remove tier"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-slate-400 italic p-3 border border-dashed border-slate-200 rounded-lg text-center">
              No pricing plans configured yet for this space.
            </p>
          )}
        </div>

        <form
          onSubmit={handleAdd}
          className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3"
        >
          <h4 className="font-bold text-slate-800">Add New Pricing Tier</h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Plan Name *
              </label>
              <Input
                required
                value={newPlan.planName}
                onChange={(e) =>
                  setNewPlan({ ...newPlan, planName: e.target.value })
                }
                placeholder="e.g. Daily Pass, Monthly Dedicated, Hourly Rate"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Price (₦ NGN) *
              </label>
              <Input
                type="number"
                required
                min={100}
                value={newPlan.price || ""}
                onChange={(e) =>
                  setNewPlan({ ...newPlan, price: Number(e.target.value) })
                }
                placeholder="e.g. 4000"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Duration Type *
              </label>
              <select
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-900"
                value={durationType}
                onChange={(e) => setDurationType(e.target.value as any)}
              >
                <option value="days">Days (Daily/Weekly)</option>
                <option value="months">Months (Monthly/Quarterly)</option>
                <option value="years">Years (Yearly / Annual)</option>
                <option value="hours">Hours (Hourly Bookings)</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Duration Units *
              </label>
              <Input
                type="number"
                required
                min={1}
                value={durationValue}
                onChange={(e) => setDurationValue(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newPlan.isPopular}
                onChange={(e) =>
                  setNewPlan({ ...newPlan, isPopular: e.target.checked })
                }
                className="rounded border-slate-300 text-[#23055c]"
              />
              <span className="text-slate-700 font-medium">
                Highlight / Recommended Plan
              </span>
            </label>

            <Button
              variant="primary"
              type="submit"
              isLoading={submitting}
              className="bg-[#23055c] hover:bg-[#392271] text-white"
            >
              Add Pricing Tier
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

interface BlackoutManagementModalProps {
  resource: FacilityResource | null;
  onClose: () => void;
  onAddBlackout: (
    resourceId: string,
    blackout: CreateBlackoutDTO,
  ) => Promise<void>;
  onDeleteBlackout: (blackoutId: string) => Promise<void>;
}

export function BlackoutManagementModal({
  resource,
  onClose,
  onAddBlackout,
  onDeleteBlackout,
}: BlackoutManagementModalProps) {
  const [newBlackout, setNewBlackout] = useState<CreateBlackoutDTO>({
    startDate: "",
    endDate: "",
    reason: "",
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);

  if (!resource) return null;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onAddBlackout(resource.id, {
        startDate: new Date(newBlackout.startDate).toISOString(),
        endDate: new Date(newBlackout.endDate).toISOString(),
        reason: newBlackout.reason,
        isActive: true,
      });
      setNewBlackout({
        startDate: "",
        endDate: "",
        reason: "",
        isActive: true,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Maintenance & Blackouts: ${resource.name}`}
    >
      <div className="space-y-6 text-xs">
        <div>
          <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-1.5">
            <Wrench className="h-4 w-4 text-amber-600" /> Active Blackout
            Windows
          </h4>
          {resource.blackouts && resource.blackouts.length > 0 ? (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Reason / Note</th>
                    <th className="p-2.5">Scheduled Window</th>
                    <th className="p-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {resource.blackouts.map((b) => (
                    <tr key={b.id}>
                      <td className="p-2.5 font-bold text-slate-900">
                        {b.reason}
                      </td>
                      <td className="p-2.5 text-slate-600 font-mono text-[11px]">
                        {new Date(b.startDate).toLocaleDateString()} –{" "}
                        {new Date(b.endDate).toLocaleDateString()}
                      </td>
                      <td className="p-2.5 text-right">
                        <button
                          onClick={() => onDeleteBlackout(b.id)}
                          className="text-red-600 hover:bg-red-50 p-1.5 rounded transition-colors cursor-pointer"
                          title="Remove blackout"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-slate-400 italic p-3 border border-dashed border-slate-200 rounded-lg text-center">
              No active blackout schedules. Space is fully operational.
            </p>
          )}
        </div>

        <form
          onSubmit={handleAdd}
          className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3"
        >
          <h4 className="font-bold text-slate-800">
            Schedule New Maintenance Window
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Start Date *
              </label>
              <Input
                type="date"
                required
                value={newBlackout.startDate}
                onChange={(e) =>
                  setNewBlackout({ ...newBlackout, startDate: e.target.value })
                }
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                End Date *
              </label>
              <Input
                type="date"
                required
                value={newBlackout.endDate}
                onChange={(e) =>
                  setNewBlackout({ ...newBlackout, endDate: e.target.value })
                }
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Reason / Note *
            </label>
            <Input
              required
              value={newBlackout.reason}
              onChange={(e) =>
                setNewBlackout({ ...newBlackout, reason: e.target.value })
              }
              placeholder="e.g. A/V Equipment repair / Acoustic soundproofing upgrade"
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button
              variant="primary"
              type="submit"
              isLoading={submitting}
              className="bg-[#23055c] hover:bg-[#392271] text-white"
            >
              Block Dates
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  selectedStatus: string;
  onSelectStatus: (status: string) => void;
}

export function ResourceFilterModal({
  isOpen,
  onClose,
  selectedCategory,
  onSelectCategory,
  selectedStatus,
  onSelectStatus,
}: FilterModalProps) {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Filter Workspace Directory">
      <div className="space-y-4 text-xs">
        <div>
          <label className="font-semibold text-slate-700 block mb-1.5">
            Workspace Category
          </label>
          <select
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-900"
            value={selectedCategory}
            onChange={(e) => onSelectCategory(e.target.value)}
          >
            <option value="ALL">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="font-semibold text-slate-700 block mb-1.5">
            Operational Status
          </label>
          <select
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-900"
            value={selectedStatus}
            onChange={(e) => onSelectStatus(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Available / Active</option>
            <option value="MAINTENANCE">Under Maintenance</option>
            <option value="OFFLINE">Offline / Deactivated</option>
          </select>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
          <Button
            variant="outline"
            onClick={() => {
              onSelectCategory("ALL");
              onSelectStatus("ALL");
              onClose();
            }}
          >
            Reset Filters
          </Button>
          <Button
            variant="primary"
            onClick={onClose}
            className="bg-[#23055c] hover:bg-[#392271] text-white"
          >
            Apply
          </Button>
        </div>
      </div>
    </Modal>
  );
}

interface DeleteResourceModalProps {
  resource: FacilityResource | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (resource: FacilityResource) => Promise<void>;
  submitting: boolean;
}

export function DeleteResourceModal({
  resource,
  isOpen,
  onClose,
  onConfirm,
  submitting,
}: DeleteResourceModalProps) {
  if (!isOpen || !resource) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Workspace Resource">
      <div className="space-y-4 text-xs">
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-800">
          <Trash2 className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm text-red-900 mb-1">
              Confirm Resource Deletion
            </h4>
            <p className="text-red-700">
              Are you sure you want to delete <strong>{resource.name}</strong> (
              <span className="font-mono">{resource.slug}</span>)?
            </p>
            <p className="text-red-600 mt-1.5 text-[11px] leading-relaxed">
              This action will remove the workspace from the live member booking
              catalogue. Any associated pricing tiers and schedules will also be
              removed.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <Button
            variant="outline"
            type="button"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            type="button"
            isLoading={submitting}
            onClick={() => onConfirm(resource)}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Delete Resource
          </Button>
        </div>
      </div>
    </Modal>
  );
}

const DAYS_OF_WEEK = [
  { index: 1, name: "Monday", short: "Mon" },
  { index: 2, name: "Tuesday", short: "Tue" },
  { index: 3, name: "Wednesday", short: "Wed" },
  { index: 4, name: "Thursday", short: "Thu" },
  { index: 5, name: "Friday", short: "Fri" },
  { index: 6, name: "Saturday", short: "Sat" },
  { index: 0, name: "Sunday", short: "Sun" },
];

export interface ScheduleManagementModalProps {
  resource: FacilityResource | null;
  onClose: () => void;
  onSave: (resourceId: string, schedules: UpsertScheduleDTO[]) => Promise<void>;
}

export function ScheduleManagementModal({
  resource,
  onClose,
  onSave,
}: ScheduleManagementModalProps) {
  const [schedules, setSchedules] = useState<UpsertScheduleDTO[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [activePreset, setActivePreset] = useState<
    "standard" | "24-7" | "weekdays" | null
  >(null);

  useEffect(() => {
    if (!resource) return;

    // Pre-populate with existing schedule if present, otherwise default business hours
    const initial: UpsertScheduleDTO[] = DAYS_OF_WEEK.map((day) => {
      const existing = (resource.schedules || []).find(
        (s) => s.dayOfWeek === day.index,
      );
      if (existing) {
        return {
          dayOfWeek: day.index,
          openTime: existing.openTime || "08:00",
          closeTime: existing.closeTime || "20:00",
          is24Hours: Boolean(existing.is24Hours),
          isClosed: Boolean(existing.isClosed),
        };
      }

      // Default presets: Mon-Fri 08:00-20:00, Sat 09:00-17:00, Sun Closed
      if (day.index === 0) {
        return {
          dayOfWeek: 0,
          openTime: "00:00",
          closeTime: "00:00",
          is24Hours: false,
          isClosed: true,
        };
      }
      if (day.index === 6) {
        return {
          dayOfWeek: 6,
          openTime: "09:00",
          closeTime: "17:00",
          is24Hours: false,
          isClosed: false,
        };
      }
      return {
        dayOfWeek: day.index,
        openTime: "08:00",
        closeTime: "20:00",
        is24Hours: false,
        isClosed: false,
      };
    });

    setSchedules(initial);
  }, [resource]);

  if (!resource) return null;

  const handleUpdateDay = (
    dayIndex: number,
    patch: Partial<UpsertScheduleDTO>,
  ) => {
    setActivePreset(null); // Clear preset highlight on manual edit
    setSchedules((prev) =>
      prev.map((s) => (s.dayOfWeek === dayIndex ? { ...s, ...patch } : s)),
    );
  };

  const handleApplyPreset = (preset: "standard" | "24-7" | "weekdays") => {
    setActivePreset(preset);
    if (preset === "standard") {
      setSchedules(
        DAYS_OF_WEEK.map((day) => {
          if (day.index === 0)
            return {
              dayOfWeek: 0,
              openTime: "00:00",
              closeTime: "00:00",
              is24Hours: false,
              isClosed: true,
            };
          if (day.index === 6)
            return {
              dayOfWeek: 6,
              openTime: "09:00",
              closeTime: "17:00",
              is24Hours: false,
              isClosed: false,
            };
          return {
            dayOfWeek: day.index,
            openTime: "08:00",
            closeTime: "20:00",
            is24Hours: false,
            isClosed: false,
          };
        }),
      );
    } else if (preset === "24-7") {
      setSchedules(
        DAYS_OF_WEEK.map((day) => ({
          dayOfWeek: day.index,
          openTime: "00:00",
          closeTime: "23:59",
          is24Hours: true,
          isClosed: false,
        })),
      );
    } else if (preset === "weekdays") {
      setSchedules(
        DAYS_OF_WEEK.map((day) => {
          if (day.index === 0 || day.index === 6) {
            return {
              dayOfWeek: day.index,
              openTime: "00:00",
              closeTime: "00:00",
              is24Hours: false,
              isClosed: true,
            };
          }
          return {
            dayOfWeek: day.index,
            openTime: "08:00",
            closeTime: "18:00",
            is24Hours: false,
            isClosed: false,
          };
        }),
      );
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSave(resource.id, schedules);
      onClose();
    } catch {
      // Error handled by parent toast
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      className="max-w-2xl"
      title={`Weekly Operating Schedule: ${resource.name}`}
    >
      <form onSubmit={handleSave} className="space-y-5 text-xs">
        {/* Quick Presets Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="flex items-center gap-1.5 text-slate-700 font-bold">
            <Clock className="h-4 w-4 text-indigo-600" />
            <span>Quick Schedule Presets:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleApplyPreset("standard")}
              className={`px-2.5 py-1 rounded-md border font-semibold text-[11px] transition-colors cursor-pointer shadow-2xs ${
                activePreset === "standard"
                  ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                  : "bg-white border-slate-300 hover:bg-slate-100 text-slate-700"
              }`}
            >
              Standard (Mon-Sat)
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset("24-7")}
              className={`px-2.5 py-1 rounded-md border font-semibold text-[11px] transition-colors cursor-pointer shadow-2xs ${
                activePreset === "24-7"
                  ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                  : "bg-white border-slate-300 hover:bg-slate-100 text-slate-700"
              }`}
            >
              24/7 Unrestricted
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset("weekdays")}
              className={`px-2.5 py-1 rounded-md border font-semibold text-[11px] transition-colors cursor-pointer shadow-2xs ${
                activePreset === "weekdays"
                  ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                  : "bg-white border-slate-300 hover:bg-slate-100 text-slate-700"
              }`}
            >
              Weekdays Only
            </button>
          </div>
        </div>

        {/* Weekly Day-by-Day Configuration Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-bold tracking-wider">
                  <th className="p-3">Day of Week</th>
                  <th className="p-3">Operating Window</th>
                  <th className="p-3 text-center">24 Hours</th>
                  <th className="p-3 text-center">Closed / Off</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {DAYS_OF_WEEK.map((day) => {
                  const current = schedules.find(
                    (s) => s.dayOfWeek === day.index,
                  ) || {
                    dayOfWeek: day.index,
                    openTime: "08:00",
                    closeTime: "20:00",
                    is24Hours: false,
                    isClosed: false,
                  };

                  return (
                    <tr
                      key={day.index}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        current.isClosed ? "bg-slate-50/40 text-slate-400" : ""
                      }`}
                    >
                      <td className="p-3 font-bold text-slate-800">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              current.isClosed
                                ? "bg-slate-300"
                                : current.is24Hours
                                  ? "bg-indigo-500"
                                  : "bg-emerald-500"
                            }`}
                          />
                          <span>{day.name}</span>
                        </div>
                      </td>

                      <td className="p-3">
                        {current.isClosed ? (
                          <span className="text-slate-400 font-medium italic">
                            Closed all day
                          </span>
                        ) : current.is24Hours ? (
                          <span className="text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200/60 inline-flex items-center gap-1">
                            <Sparkles className="h-3 w-3" /> Open 24 Hours
                          </span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <input
                              type="time"
                              value={current.openTime}
                              onChange={(e) =>
                                handleUpdateDay(day.index, {
                                  openTime: e.target.value,
                                })
                              }
                              className="px-2 py-1 border border-slate-300 rounded-md text-xs bg-white text-slate-900 font-mono font-medium focus:ring-1 focus:ring-purple-500 focus:outline-none"
                            />
                            <span className="text-slate-400 font-medium">
                              to
                            </span>
                            <input
                              type="time"
                              value={current.closeTime}
                              onChange={(e) =>
                                handleUpdateDay(day.index, {
                                  closeTime: e.target.value,
                                })
                              }
                              className="px-2 py-1 border border-slate-300 rounded-md text-xs bg-white text-slate-900 font-mono font-medium focus:ring-1 focus:ring-purple-500 focus:outline-none"
                            />
                          </div>
                        )}
                      </td>

                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={Boolean(current.is24Hours)}
                          disabled={Boolean(current.isClosed)}
                          onChange={(e) =>
                            handleUpdateDay(day.index, {
                              is24Hours: e.target.checked,
                              isClosed: e.target.checked
                                ? false
                                : current.isClosed,
                            })
                          }
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:opacity-30"
                        />
                      </td>

                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={Boolean(current.isClosed)}
                          onChange={(e) =>
                            handleUpdateDay(day.index, {
                              isClosed: e.target.checked,
                              is24Hours: e.target.checked
                                ? false
                                : current.is24Hours,
                            })
                          }
                          className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200">
          <p className="text-slate-500 text-[11px]">
            Bookings are only permitted during active scheduled operating hours.
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              type="button"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              isLoading={submitting}
              className="bg-[#23055c] hover:bg-[#392271] text-white"
            >
              Save Schedule
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

interface UpdateResourceImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  resource: FacilityResource | null;
  onSaveImage: (resourceId: string, imageUrl: string) => Promise<void>;
}

export function UpdateResourceImageModal({
  isOpen,
  onClose,
  resource,
  onSaveImage,
}: UpdateResourceImageModalProps) {
  const [selectedImageUrl, setSelectedImageUrl] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (resource && isOpen) {
      setSelectedImageUrl(resource.imageUrl || "/images/search/2.jpg");
    }
  }, [resource, isOpen]);

  if (!isOpen || !resource) return null;

  const handleSave = async () => {
    if (!selectedImageUrl) return;
    setSubmitting(true);
    try {
      await onSaveImage(resource.id, selectedImageUrl);
      onClose();
    } catch {
      // Error handled by parent
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-2xl"
      title={`Update Photo: ${resource.name}`}
    >
      <div className="space-y-4 text-xs">
        <p className="text-slate-500">
          Upload a high-quality photo for{" "}
          <strong className="text-slate-800">{resource.name}</strong>, pick from
          our curated workspace presets, or provide an image URL. Uploaded
          photos are automatically resized and compressed for high performance.
        </p>

        <ResourceImageManager
          value={selectedImageUrl}
          onChange={setSelectedImageUrl}
          resourceId={resource.id}
          category={resource.category}
        />

        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <Button
            variant="outline"
            type="button"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            type="button"
            onClick={handleSave}
            isLoading={submitting}
            className="bg-[#23055c] hover:bg-[#392271] text-white"
          >
            Save Photo
          </Button>
        </div>
      </div>
    </Modal>
  );
}
