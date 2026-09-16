"use client";

import React from "react";
import { Search, SlidersHorizontal } from "lucide-react";

interface UserDirectoryToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  roleFilter: string;
  onRoleFilterChange: (role: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  onResetFilters: () => void;
}

export const UserDirectoryToolbar: React.FC<UserDirectoryToolbarProps> = ({
  searchQuery,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  statusFilter,
  onStatusFilterChange,
  onResetFilters,
}) => {
  return (
    <div className="p-4 border-b border-[#EBE7F5] bg-white flex flex-col sm:flex-row justify-between items-center gap-4">
      {/* Search Input */}
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search users, roles, emails..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#F8F9FA] border border-[#EBE7F5] rounded-xl text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#23055c] focus:ring-1 focus:ring-[#23055c] transition-all"
          />
        </div>
      </div>

      {/* Filter Dropdowns */}
      <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
        {/* Role Filter */}
        <select
          value={roleFilter}
          onChange={(e) => onRoleFilterChange(e.target.value)}
          className="bg-white border border-[#EBE7F5] rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:border-[#23055c] cursor-pointer"
        >
          <option value="ALL">All Roles</option>
          <option value="SUPER_ADMIN">Super Admin</option>
          <option value="OPERATIONS_ADMIN">Operations Admin</option>
          <option value="FINANCE_OFFICER">Finance Officer</option>
          <option value="RECEPTION_OFFICER">Reception Officer</option>
          <option value="SECURITY_OFFICER">Security Officer</option>
          <option value="MANAGEMENT_VIEWER">Management Viewer</option>
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="bg-white border border-[#EBE7F5] rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:border-[#23055c] cursor-pointer"
        >
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="PENDING">Pending</option>
          <option value="DEACTIVATED">Deactivated</option>
        </select>

        {/* Reset Filter Button */}
        <button
          onClick={onResetFilters}
          title="Reset Filters"
          className="p-2 border border-[#EBE7F5] rounded-xl text-slate-500 hover:text-[#23055c] hover:bg-[#F8F9FA] transition-colors flex items-center justify-center cursor-pointer"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
