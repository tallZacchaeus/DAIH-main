"use client";

import React from "react";
import Link from "next/link";
import { Search, SlidersHorizontal, ArrowRight } from "lucide-react";
import { CategoryChips, CategoryOption } from "./CategoryChips";

interface DiscoveryHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  categories: CategoryOption[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  onToggleFilters?: () => void;
  isFilterOpen?: boolean;
}

export const DiscoveryHeader: React.FC<DiscoveryHeaderProps> = ({
  searchQuery,
  onSearchChange,
  categories,
  selectedCategory,
  onSelectCategory,
  onToggleFilters,
  isFilterOpen,
}) => {
  return (
    <header className="bg-white sticky top-0 z-10 border-b border-[#EBE7F5] px-4 sm:px-8 py-6 shadow-xs -mx-4 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-6 lg:-mt-8 mb-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        {/* Title & Subtitle */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#23055c] tracking-tight">
            Discover Spaces
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Find the perfect environment for your next session.
          </p>
        </div>

        {/* Search & Action Controls */}
        <div className="w-full md:w-auto flex flex-row gap-2 sm:gap-3 items-center min-w-0">
          {/* Search Input */}
          <div className="relative group flex-1 sm:w-64 sm:flex-none min-w-0">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#23055c] transition-colors">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search spaces..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#f7f9ff] border border-[#EBE7F5] rounded-lg text-sm text-[#181c20] focus:outline-none focus:border-[#23055c] focus:ring-1 focus:ring-[#23055c] focus:bg-white transition-all shadow-xs"
            />
          </div>

          {/* Filter Button (Mobile toggle) */}
          <button
            onClick={onToggleFilters}
            aria-expanded={isFilterOpen}
            aria-label="Toggle filters"
            className={`md:hidden flex items-center justify-center gap-1.5 px-3.5 py-2 border rounded-lg text-xs font-semibold transition-colors shadow-xs cursor-pointer shrink-0 ${
              isFilterOpen
                ? "bg-[#e8ddff] border-[#23055c] text-[#23055c]"
                : "border-[#EBE7F5] bg-white hover:bg-[#f1f4f9] text-slate-700"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filters</span>
          </button>
        </div>
      </div>

      {/* Quick Filters Chips */}
      <div
        className={`max-w-7xl mx-auto transition-all duration-200 ${
          isFilterOpen ? "mt-4 block" : "hidden md:block md:mt-4"
        }`}
      >
        <CategoryChips
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={onSelectCategory}
        />
      </div>
    </header>
  );
};
