"use client";

import React from "react";
import Link from "next/link";
import { Building2, Wifi } from "lucide-react";

interface AuthShowcasePanelProps {
  title?: string;
  description?: string;
  bgImage?: string;
  showLogo?: boolean;
  showFeatures?: boolean;
}

export const AuthShowcasePanel: React.FC<AuthShowcasePanelProps> = ({
  title = "Elevate Your Work Environment",
  description = "Join a premier community of professionals. Access meticulously designed spaces that foster focus, collaboration, and high-tier productivity.",
  bgImage,
  showLogo = false,
  showFeatures = false,
}) => {
  return (
    <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-10 xl:p-14 bg-slate-900 text-white relative overflow-hidden select-none">
      {/* Background Photography Image (if provided) */}
      {bgImage && (
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-700"
          style={{
            backgroundImage: `url('${bgImage}')`,
          }}
        />
      )}

      {/* Smooth Deep Gradient & Radial Glow Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#23055c]/85 via-[#392271]/80 to-[#18023f]/90" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(215,190,255,0.18),transparent_55%)] pointer-events-none" />

      {/* Top Brand Logo (optional) */}
      {showLogo ? (
        <div className="relative z-10">
          <Link href="/" className="inline-block">
            <img
              src="/images/logo-light.png"
              alt="DAIH Workspace"
              className="h-10 lg:h-12 w-auto object-contain"
            />
          </Link>
        </div>
      ) : (
        <div className="relative z-10 h-10" />
      )}

      {/* Showcase Headline & Details */}
      <div className="relative z-10 space-y-4 max-w-md my-auto py-12">
        <h2 className="text-3xl xl:text-4xl font-extrabold leading-tight tracking-tight text-white">
          {title}
        </h2>

        <p className="text-sm xl:text-base text-purple-200/90 leading-relaxed font-normal">
          {description}
        </p>

        {showFeatures && (
          <div className="pt-4 space-y-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/10">
                <Building2 className="w-5 h-5 text-purple-200" />
              </div>
              <span className="text-sm font-medium text-white">
                Premium architectural spaces
              </span>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/10">
                <Wifi className="w-5 h-5 text-purple-200" />
              </div>
              <span className="text-sm font-medium text-white">
                Enterprise-grade connectivity
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Region / Security Indicator */}
      <div className="relative z-10 pt-6 border-t border-white/15 text-xs text-purple-200/70 flex items-center justify-between">
        <span>Redemption City, Ogun State</span>
        <span>24/7 Monitored Access</span>
      </div>
    </div>
  );
};
