"use client";

import React from "react";
import Link from "next/link";

export const AuthFooter: React.FC = () => {
  return (
    <footer className="w-full py-4 px-6 sm:px-12 lg:px-16 flex flex-col sm:flex-row justify-between items-center gap-3 bg-[#f8f9fc] text-xs text-slate-500 border-t border-slate-100">
      <div>
        © {new Date().getFullYear()} DAIH Workspace. All rights reserved.
      </div>
      <nav className="flex items-center gap-4">
        <Link
          href="/privacy"
          className="hover:text-[#23055c] transition-colors"
        >
          Privacy Policy
        </Link>
        <Link href="/terms" className="hover:text-[#23055c] transition-colors">
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
          Support
        </Link>
      </nav>
    </footer>
  );
};
