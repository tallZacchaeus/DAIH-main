"use client";

import React from "react";
import { AdminLoginCard } from "../../components/auth";

export default function AdminLoginPage() {
  return (
    <div className="bg-white md:bg-[#ebeef3] min-h-screen flex items-stretch md:items-center justify-center p-0 md:p-8 font-sans antialiased text-[#181c20] relative overflow-x-hidden">
      {/* Ambient background decoration */}
      <div className="hidden md:block absolute inset-0 w-full h-full overflow-hidden pointer-events-none -z-10 opacity-30">
        <div className="w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-[#392271]/20 to-transparent absolute blur-[100px] -top-[150px] -right-[150px]" />
        <div className="w-[500px] h-[500px] rounded-full bg-gradient-to-bl from-[#bfa9fe]/30 to-transparent absolute blur-[80px] -bottom-[100px] -left-[100px]" />
      </div>

      <AdminLoginCard />
    </div>
  );
}
