"use client";

import React from "react";
import Link from "next/link";

interface AuthHeaderProps {
  promptText?: string;
  actionText?: string;
  actionHref?: string;
}

export const AuthHeader: React.FC<AuthHeaderProps> = ({
  promptText = "Already have an account?",
  actionText = "Sign In",
  actionHref = "/login",
}) => {
  return (
    <header className="w-full py-5 px-6 sm:px-12 lg:px-16 flex justify-between items-center border-b border-slate-100 bg-white">
      <Link href="/" className="inline-block">
        <img
          src="/images/logo.png"
          alt="DAIH Workspace"
          className="h-8 sm:h-9 w-auto object-contain"
        />
      </Link>

      <div className="text-xs sm:text-sm text-slate-500">
        {promptText}{" "}
        <Link
          href={actionHref}
          className="font-bold text-[#23055c] hover:text-[#392271] transition-colors"
        >
          {actionText}
        </Link>
      </div>
    </header>
  );
};
