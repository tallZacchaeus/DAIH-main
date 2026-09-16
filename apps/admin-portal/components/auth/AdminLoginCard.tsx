"use client";

import React from "react";
import Link from "next/link";
import { Lock, ShieldCheck } from "lucide-react";
import { AdminLoginForm } from "./AdminLoginForm";

export const AdminLoginCard: React.FC = () => {
  return (
    <div className="w-full max-w-none md:max-w-md bg-white rounded-none md:rounded-2xl border-0 md:border md:border-[#EBE7F5] shadow-none md:shadow-[0px_12px_32px_rgba(57,34,113,0.08)] overflow-hidden flex flex-col justify-between md:justify-start min-h-screen md:min-h-0">
      {/* Header Section */}
      <div className="p-6 sm:p-8 pb-6 text-center border-b border-slate-100">
        <Link href="/" className="inline-block mb-5">
          <img
            src="/images/logo.png"
            alt="DAIH Workspace Logo"
            className="mx-auto h-11 w-auto object-contain"
          />
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold text-[#181c20] tracking-tight mb-1.5">
          Admin Portal Access
        </h1>
        <p className="text-xs text-slate-500 font-semibold flex items-center justify-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-[#23055c]" />
          Secure Admin Access
        </p>
      </div>

      {/* Form Section */}
      <div className="p-6 sm:p-8 flex-1 md:flex-none">
        <AdminLoginForm />
      </div>

      {/* Footer Area inside card */}
      <div className="bg-[#f1f4f9] px-6 sm:px-8 py-4 border-t border-[#EBE7F5] text-center">
        <p className="text-[11px] text-slate-500 font-medium">
          Internal use only. Unauthorized access is prohibited.
        </p>
      </div>
    </div>
  );
};
