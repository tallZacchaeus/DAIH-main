"use client";

import React from "react";
import { FacilityResource } from "@daih/types";
import { resolveResourceImageUrl } from "../../lib/image-utils";
import {
  Edit2,
  Tag,
  CalendarOff,
  Power,
  Users,
  Wrench,
  Trash2,
  Clock,
  Camera,
} from "lucide-react";

interface ResourceTableViewProps {
  resources: FacilityResource[];
  onEdit: (resource: FacilityResource) => void;
  onManagePricing: (resource: FacilityResource) => void;
  onManageBlackouts: (resource: FacilityResource) => void;
  onManageSchedules?: (resource: FacilityResource) => void;
  onToggleActive: (resource: FacilityResource) => void;
  onDelete: (resource: FacilityResource) => void;
  onUpdateImage?: (resource: FacilityResource) => void;
}

export function ResourceTableView({
  resources,
  onEdit,
  onManagePricing,
  onManageBlackouts,
  onManageSchedules,
  onToggleActive,
  onDelete,
  onUpdateImage,
}: ResourceTableViewProps) {
  const now = new Date();

  return (
    <div className="bg-white border border-[#EBE7F5] rounded-xl overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#EBE7F5] bg-slate-50/70 text-slate-500 uppercase tracking-wider text-[10px]">
              <th className="py-3 px-4 font-bold">Space</th>
              <th className="py-3 px-4 font-bold">Category</th>
              <th className="py-3 px-4 font-bold">Capacity</th>
              <th className="py-3 px-4 font-bold">Location</th>
              <th className="py-3 px-4 font-bold">Official Pricing</th>
              <th className="py-3 px-4 font-bold text-center">Status</th>
              <th className="py-3 px-4 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {resources.map((res) => {
              const activeBlackout = (res.blackouts || []).find(
                (b) =>
                  b.isActive &&
                  new Date(b.startDate) <= now &&
                  new Date(b.endDate) >= now,
              );

              const imageSrc = resolveResourceImageUrl(
                res.imageUrl,
                res.category,
                res.slug,
              );

              return (
                <tr
                  key={res.id}
                  className="hover:bg-slate-50/80 transition-colors"
                >
                  <td className="py-3.5 px-4 font-bold text-slate-900">
                    <div className="flex items-center gap-3">
                      <div
                        onClick={() => onUpdateImage && onUpdateImage(res)}
                        className={`h-11 w-14 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shrink-0 relative group/tblimg ${
                          onUpdateImage ? "cursor-pointer" : ""
                        }`}
                        title={
                          onUpdateImage ? "Click to change photo" : undefined
                        }
                      >
                        <img
                          src={imageSrc}
                          alt={res.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "/images/search/2.jpg";
                          }}
                        />
                        {onUpdateImage && (
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/tblimg:opacity-100 transition-opacity flex items-center justify-center text-white">
                            <Camera className="h-3.5 w-3.5" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div>{res.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono font-normal">
                          /{res.slug}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 font-mono text-[10px] text-slate-700">
                      {res.category}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-[#23055c]">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-slate-400" />{" "}
                      {res.capacity} Max
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 max-w-[160px] truncate">
                    {res.location}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap gap-1.5 max-w-xs">
                      {res.pricing && res.pricing.length > 0 ? (
                        res.pricing.map((p) => {
                          const currencySymbol =
                            p.currency === "NGN" ? "₦" : p.currency || "₦";
                          return (
                            <span
                              key={p.id}
                              className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-semibold border border-blue-200/60"
                            >
                              {p.planName}: {currencySymbol}
                              {Number(p.price).toLocaleString()}
                            </span>
                          );
                        })
                      ) : (
                        <span className="text-slate-400 italic">No plans</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {!res.isActive ? (
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold border border-slate-200">
                        Offline
                      </span>
                    ) : activeBlackout ? (
                      <span className="px-2 py-0.5 rounded-full bg-[#ffdad6] text-[#93000a] text-[10px] font-bold border border-[#ba1a1a]/20 flex items-center justify-center gap-1">
                        <Wrench className="h-2.5 w-2.5" /> Maintenance
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                        Available
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {onUpdateImage && (
                        <button
                          onClick={() => onUpdateImage(res)}
                          title="Change Resource Photo"
                          className="px-2 py-1 text-xs text-purple-800 hover:bg-purple-50 rounded-md transition-colors flex items-center gap-1 font-semibold cursor-pointer"
                        >
                          <Camera className="h-3.5 w-3.5" /> Photo
                        </button>
                      )}
                      <button
                        onClick={() => onManagePricing(res)}
                        title="Manage Pricing Plans"
                        className="px-2 py-1 text-xs text-blue-700 hover:bg-blue-50 rounded-md transition-colors flex items-center gap-1 font-semibold cursor-pointer"
                      >
                        <Tag className="h-3.5 w-3.5" /> Pricing
                      </button>
                      {onManageSchedules && (
                        <button
                          onClick={() => onManageSchedules(res)}
                          title="Manage Operating Schedule"
                          className="px-2 py-1 text-xs text-indigo-700 hover:bg-indigo-50 rounded-md transition-colors flex items-center gap-1 font-semibold cursor-pointer"
                        >
                          <Clock className="h-3.5 w-3.5" /> Schedule
                        </button>
                      )}
                      <button
                        onClick={() => onManageBlackouts(res)}
                        title="Manage Blackouts"
                        className="px-2 py-1 text-xs text-amber-700 hover:bg-amber-50 rounded-md transition-colors flex items-center gap-1 font-semibold cursor-pointer"
                      >
                        <CalendarOff className="h-3.5 w-3.5" /> Blackout
                      </button>
                      <button
                        onClick={() => onEdit(res)}
                        title="Edit Details"
                        className="p-1.5 text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => onToggleActive(res)}
                        title={
                          res.isActive
                            ? "Active (Click to take offline)"
                            : "Inactive (Click to reactivate)"
                        }
                        className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                          res.isActive
                            ? "text-emerald-600 bg-emerald-50/70 hover:bg-emerald-100"
                            : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        }`}
                      >
                        <Power className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => onDelete(res)}
                        title="Delete Resource"
                        className="p-1.5 rounded-md transition-colors cursor-pointer text-red-600 hover:bg-red-50"
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
    </div>
  );
}
