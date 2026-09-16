"use client";

import React from "react";
import Link from "next/link";
import { SearchX, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
      <div className="w-16 h-16 rounded-2xl bg-purple-50 text-[#23055c] flex items-center justify-center mb-4 border border-purple-100 shadow-xs">
        <SearchX className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
        Page Not Found
      </h1>
      <p className="text-sm text-slate-500 max-w-md mb-6">
        The operational resource or admin console page you requested could not
        be located.
      </p>
      <Link
        href="/"
        className="bg-[#23055c] hover:bg-[#392271] text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs transition-all flex items-center gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Return to Operations Dashboard
      </Link>
    </div>
  );
}
