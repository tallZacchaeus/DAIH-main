"use client";

import React from "react";

export interface CategoryOption {
  id: string;
  label: string;
}

interface CategoryChipsProps {
  categories: CategoryOption[];
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
}

export const CategoryChips: React.FC<CategoryChipsProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
}) => {
  return (
    <div className="flex flex-wrap gap-2 pt-2">
      {categories.map((cat) => {
        const isSelected = selectedCategory === cat.id;
        return (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 shadow-xs cursor-pointer ${
              isSelected
                ? "bg-[#bfa9fe] text-[#4e3a86] border border-transparent font-bold"
                : "bg-white border border-[#EBE7F5] text-slate-700 hover:bg-[#f1f4f9]"
            }`}
          >
            {cat.label}
          </button>
        );
      })}
    </div>
  );
};
