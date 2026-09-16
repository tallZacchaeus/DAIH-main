"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { ResetPasswordCard } from "../../../components/auth";

export default function ResetPasswordPage() {
  return (
    <div className="bg-[#f7f9ff] text-[#181c20] font-sans antialiased min-h-screen flex flex-col justify-between relative overflow-hidden">
      {/* Decorative Ambient Background Elements */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none -z-10 opacity-35">
        <div className="w-[800px] h-[800px] rounded-full bg-gradient-to-tr from-[#EBE7F5] to-transparent absolute blur-[100px] -top-[250px] -right-[250px]" />
        <div className="w-[600px] h-[600px] rounded-full bg-gradient-to-bl from-[#bfa9fe]/30 to-transparent absolute blur-[80px] -bottom-[150px] -left-[150px]" />
      </div>

      {/* Main Content Area */}
      <main className="flex-grow flex items-center justify-center p-4 sm:p-6 lg:p-8 relative z-10 w-full min-h-[calc(100vh-80px)]">
        <Suspense
          fallback={
            <div className="min-h-[300px] flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-[#23055c] animate-spin" />
            </div>
          }
        >
          <ResetPasswordCard />
        </Suspense>
      </main>

      {/* Full-width Footer */}
      <footer className="w-full bg-[#ebeef3] border-t border-slate-200/60 mt-auto">
        <div className="w-full py-4 px-4 sm:px-8 lg:px-12 flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-slate-500">
          <div className="font-bold text-[#23055c]">DAIH Workspace</div>
          <div className="flex flex-wrap justify-center gap-5">
            <Link
              href="/privacy"
              className="hover:text-[#23055c] transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="hover:text-[#23055c] transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              href="/security"
              className="hover:text-[#23055c] transition-colors"
            >
              Security
            </Link>
            <Link
              href="/support"
              className="hover:text-[#23055c] transition-colors"
            >
              Contact Support
            </Link>
          </div>
          <div>
            © {new Date().getFullYear()} DAIH Workspace. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
