"use client";

import React from "react";
import Link from "next/link";
import {
  Users,
  Wifi,
  Mic,
  Maximize2,
  ArrowRight,
  Layers,
  Sparkles,
} from "lucide-react";

export interface SpaceItem {
  id?: string;
  name: string;
  slug: string;
  category: "Private Office" | "Meeting Room" | "Hot Desk" | "Studio" | string;
  categoryBadge: string;
  price: string;
  unit: string;
  description: string;
  capacityText: string;
  specText: string;
  specType: "area" | "wifi" | "audio" | "slots";
  imageUrl: string;
}

interface SpaceCardProps {
  space: SpaceItem;
}

export const SpaceCard: React.FC<SpaceCardProps> = ({ space }) => {
  const getSpecIcon = () => {
    switch (space.specType) {
      case "wifi":
        return <Wifi className="w-4 h-4 text-slate-500" />;
      case "audio":
        return <Mic className="w-4 h-4 text-slate-500" />;
      case "slots":
        return <Layers className="w-4 h-4 text-slate-500" />;
      case "area":
      default:
        return <Maximize2 className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="bg-white border border-[#EBE7F5] rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-shadow duration-300 flex flex-col group">
      {/* Image Container with Zoom & Floating Category Badge */}
      <div className="relative h-56 overflow-hidden bg-slate-100">
        <img
          src={space.imageUrl}
          alt={space.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute top-3 right-3">
          <span className="bg-white/90 backdrop-blur-xs text-[#23055c] font-semibold text-xs px-2.5 py-1 rounded-md shadow-xs border border-[#EBE7F5]">
            {space.categoryBadge}
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-5 flex flex-col flex-1">
        {/* Title & Price */}
        <div className="flex justify-between items-start mb-2 gap-2">
          <h3 className="text-lg font-bold text-[#23055c] tracking-tight">
            {space.name}
          </h3>
          <p className="text-xs font-bold text-[#23055c] bg-[#e9ddff] px-2 py-1 rounded shrink-0">
            {space.price}
            <span className="text-[10px] text-slate-500 font-normal ml-0.5">
              {space.unit}
            </span>
          </p>
        </div>

        {/* Description */}
        <p className="text-sm text-slate-600 mb-4 line-clamp-2 leading-relaxed">
          {space.description}
        </p>

        {/* Capacity & Specs Metadata */}
        <div className="flex items-center space-x-4 text-slate-600 text-xs mb-6 mt-auto">
          <div className="flex items-center space-x-1.5">
            <Users className="w-4 h-4 text-slate-500" />
            <span>{space.capacityText}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            {getSpecIcon()}
            <span>{space.specText}</span>
          </div>
        </div>

        {/* View Details / Book Button */}
        <Link
          href={`/book/${space.slug}`}
          className="w-full py-2.5 border border-[#23055c] text-[#23055c] hover:bg-[#e9ddff] hover:border-[#23055c] rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
        >
          <span>View Details</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};
