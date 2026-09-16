"use client";

import React from "react";
import { ForgotPasswordCard } from "../../../components/auth";

export default function ForgotPasswordPage() {
  return (
    <div className="bg-[#f7f9ff] min-h-screen flex flex-col font-sans antialiased text-[#181c20] relative overflow-hidden">
      {/* Decorative Ambient Background Elements */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none -z-10 opacity-35">
        <div className="w-[800px] h-[800px] rounded-full bg-gradient-to-tr from-[#EBE7F5] to-transparent absolute blur-[100px] -top-[250px] -right-[250px]" />
        <div className="w-[600px] h-[600px] rounded-full bg-gradient-to-bl from-[#bfa9fe]/30 to-transparent absolute blur-[80px] -bottom-[150px] -left-[150px]" />
      </div>

      {/* Main Content Area */}
      <main className="flex-grow flex items-center justify-center p-4 sm:p-6 lg:p-8 relative z-10 w-full min-h-screen">
        <ForgotPasswordCard />
      </main>
    </div>
  );
}
