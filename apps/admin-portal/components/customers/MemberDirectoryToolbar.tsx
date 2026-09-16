"use client";

import React from "react";
import { Search, Filter, SlidersHorizontal } from "lucide-react";

export interface MemberDirectoryToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  tierFilter: string;
  onTierFilterChange: (tier: string) => void;
}

export const MemberDirectoryToolbar: React.FC<MemberDirectoryToolbarProps> = ({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  tierFilter,
  onTierFilterChange,
}) => {
  return (
    <div className="p-4 border-b border-[#EBE7F5] flex flex-col sm:flex-row justify-between items-center gap-4 bg-[#F8F9FA]/60">
      {/* Search Input */}
      <div className="relative w-full sm:w-[340px]">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search members by name, email, or Client ID..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#23055c] focus:ring-2 focus:ring-[#23055c]/20 transition-all shadow-xs"
        />
      </div>

      {/* Filter Dropdowns */}
      <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
        {/* Status Filter */}
        <div className="relative inline-block">
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 appearance-none focus:outline-none focus:border-[#23055c] focus:ring-2 focus:ring-[#23055c]/20 cursor-pointer shadow-xs"
          >
            <option value="ALL">Status: All</option>
            <option value="ACTIVE">Status: Verified</option>
            <option value="PENDING">Status: Unverified</option>
            <option value="INACTIVE">Status: Dormant</option>
          </select>
          <Filter className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        {/* Tier Filter */}
        <div className="relative inline-block">
          <select
            value={tierFilter}
            onChange={(e) => onTierFilterChange(e.target.value)}
            className="pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 appearance-none focus:outline-none focus:border-[#23055c] focus:ring-2 focus:ring-[#23055c]/20 cursor-pointer shadow-xs"
          >
            <option value="ALL">Tier: All</option>
            <option value="Enterprise">Tier: Enterprise</option>
            <option value="Professional">Tier: Professional</option>
            <option value="Creator">Tier: Creator</option>
            <option value="Hot Desk">Tier: Hot Desk</option>
            <option value="Dedicated Desk">Tier: Dedicated Desk</option>
            <option value="Private Suite">Tier: Private Suite</option>
          </select>
          <SlidersHorizontal className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>
    </div>
  );
};
