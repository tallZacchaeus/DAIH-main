"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  SpaceCard,
  SpaceItem,
  DiscoveryHeader,
  CategoryOption,
} from "../../../components/book";
import { api } from "@daih/api-client";
import { FacilityResource } from "@daih/types";
import { Layers, Loader2 } from "lucide-react";

const CATEGORIES: CategoryOption[] = [
  { id: "ALL", label: "All Spaces" },
  { id: "Hot Desk", label: "Hot Desk & Workstations" },
  { id: "Private Office", label: "Private Office" },
  { id: "Meeting Room", label: "Meeting & Training" },
  { id: "Studio", label: "Creative Studios & Lounge" },
];

import {
  resolveResourceImageUrl,
  getWorkspaceImage,
} from "../../../lib/image-utils";

// Helper to map category strings to filter chips
function mapToCategoryGroup(
  category?: string,
  slug: string = "",
): "Private Office" | "Meeting Room" | "Hot Desk" | "Studio" {
  const c = (category || "").toUpperCase();
  const s = slug.toLowerCase();

  if (c.includes("OFFICE") || s.includes("office") || s.includes("suite"))
    return "Private Office";
  if (
    c.includes("MEETING") ||
    c.includes("TRAINING") ||
    c.includes("CONFERENCE") ||
    s.includes("room") ||
    s.includes("hall")
  )
    return "Meeting Room";
  if (
    c.includes("HOT") ||
    c.includes("DESK") ||
    s.includes("desk") ||
    c.includes("FLEX") ||
    c.includes("DEDICATED")
  )
    return "Hot Desk";
  if (
    c.includes("STUDIO") ||
    c.includes("MEDIA") ||
    c.includes("ROOFTOP") ||
    s.includes("studio") ||
    s.includes("stream") ||
    s.includes("audio") ||
    s.includes("rooftop")
  )
    return "Studio";
  return "Hot Desk";
}

export default function BookingDiscoveryPage() {
  const [spaces, setSpaces] = useState<SpaceItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);

  // Fetch live backend resource and pricing data
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    api.catalogue
      .getResources()
      .then((data: FacilityResource[]) => {
        if (!isMounted) return;
        if (data && Array.isArray(data) && data.length > 0) {
          const mapped: SpaceItem[] = data.map((r) => {
            // Dynamically extract price & time unit from live backend pricing plans
            let formattedPrice = "₦4,000";
            let formattedUnit = "/day";

            if (r.pricing && r.pricing.length > 0) {
              const primaryPlan = r.pricing[0];
              const symbol = primaryPlan.currency === "USD" ? "$" : "₦";
              formattedPrice = `${symbol}${Number(primaryPlan.price).toLocaleString()}`;
              if (primaryPlan.durationHours) {
                formattedUnit = `/hr`;
              } else if (primaryPlan.durationMonths) {
                if (primaryPlan.durationMonths === 12) {
                  formattedUnit = `/yr`;
                } else if (primaryPlan.durationMonths % 12 === 0) {
                  formattedUnit = `/${primaryPlan.durationMonths / 12}yr`;
                } else {
                  formattedUnit = `/mo`;
                }
              } else if (
                primaryPlan.durationDays &&
                primaryPlan.durationDays > 1
              ) {
                formattedUnit = `/${primaryPlan.durationDays}d`;
              } else {
                formattedUnit = `/day`;
              }
            } else if (r.dailyRate) {
              formattedPrice = `₦${Number(r.dailyRate).toLocaleString()}`;
              formattedUnit = "/day";
            } else if (r.hourlyRate) {
              formattedPrice = `₦${Number(r.hourlyRate).toLocaleString()}`;
              formattedUnit = "/hr";
            } else if (r.monthlyRate) {
              formattedPrice = `₦${Number(r.monthlyRate).toLocaleString()}`;
              formattedUnit = "/mo";
            }

            const categoryGroup = mapToCategoryGroup(
              r.category,
              r.slug || r.name,
            );
            const categoryBadge = r.name;

            let specType: "area" | "wifi" | "audio" | "slots" = "area";
            let specText = "Air Conditioned";
            if (r.slug?.includes("desk") || r.category?.includes("DESK")) {
              specType = "wifi";
              specText = "Fibre WiFi";
            } else if (
              r.slug?.includes("audio") ||
              r.slug?.includes("podcast") ||
              r.category?.includes("STUDIO")
            ) {
              specType = "audio";
              specText = "Studio Mics";
            } else if (r.slug?.includes("stream")) {
              specType = "wifi";
              specText = "1 Gbps LAN";
            }

            return {
              id: r.id,
              name: r.name,
              slug: r.slug || r.id,
              category: categoryGroup,
              categoryBadge,
              price: formattedPrice,
              unit: formattedUnit,
              description: r.description || "",
              capacityText: `${r.capacity} ${r.capacity === 1 ? "Person" : "Persons"}`,
              specText,
              specType,
              imageUrl: getWorkspaceImage(r.slug || "", r.imageUrl),
            };
          });

          setSpaces(mapped);
        }
      })
      .catch((err) => {
        console.error("Could not load live catalogue:", err);
        setSpaces([]);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Filter spaces based on category and search query
  const filteredSpaces = useMemo(() => {
    return spaces.filter((space) => {
      const matchesCategory =
        selectedCategory === "ALL" || space.category === selectedCategory;
      const matchesSearch =
        searchQuery === "" ||
        space.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        space.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        space.categoryBadge.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [spaces, selectedCategory, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Search and Category Filter Header */}
      <DiscoveryHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        categories={CATEGORIES}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        onToggleFilters={() => setIsFilterOpen((prev) => !prev)}
        isFilterOpen={isFilterOpen}
      />

      {/* Loading state indicator */}
      {isLoading && (
        <div className="py-12 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#23055c]" />
          <p className="text-xs font-semibold text-slate-500">
            Loading live workspace inventory & real-time rates...
          </p>
        </div>
      )}

      {/* Workspace Grid */}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredSpaces.map((space) => (
            <SpaceCard key={space.id || space.slug} space={space} />
          ))}
        </div>
      )}

      {/* Empty Search State */}
      {!isLoading && filteredSpaces.length === 0 && (
        <div className="bg-white rounded-2xl border border-[#EBE7F5] p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-purple-50 text-[#23055c] flex items-center justify-center mx-auto">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            No spaces found
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            We couldn't find any workspace matching "{searchQuery}". Try
            selecting a different category or clearing your search.
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("ALL");
            }}
            className="px-5 py-2 rounded-xl bg-[#23055c] hover:bg-[#35089e] text-white font-bold text-xs transition-colors shadow-xs cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      )}
    </div>
  );
}
