"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, MapPin, Phone } from "lucide-react";
import { getPortalBookingUrl } from "../lib/config";

export const Navbar = () => {
  return (
    <header className="sticky top-0 z-50 w-full bg-[#1f3a68]/95 backdrop-blur-md border-b border-white/10 text-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#d56c04] to-amber-400 flex items-center justify-center text-white font-bold text-xl shadow-md group-hover:scale-105 transition-transform">
              D
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight block leading-tight">
                DAIH
              </span>
              <span className="text-[10px] text-amber-300 tracking-wider font-semibold uppercase block">
                Dare Adeboye Innovation Hub
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <Link href="/" className="hover:text-amber-300 transition-colors">
              Home
            </Link>
            <Link
              href="/our-plans"
              className="hover:text-amber-300 transition-colors"
            >
              Our Plans
            </Link>
            <Link
              href="/about-us"
              className="hover:text-amber-300 transition-colors"
            >
              About Us
            </Link>
            <Link
              href="/events"
              className="hover:text-amber-300 transition-colors"
            >
              Events
            </Link>
            <Link
              href="/gallery"
              className="hover:text-amber-300 transition-colors"
            >
              Gallery
            </Link>
            <Link
              href="/jobs"
              className="hover:text-amber-300 transition-colors"
            >
              Careers
            </Link>
            <Link
              href="/contact"
              className="hover:text-amber-300 transition-colors"
            >
              Contact
            </Link>
          </nav>

          {/* Action CTA */}
          <div className="flex items-center gap-3">
            <a
              href={getPortalBookingUrl()}
              className="inline-flex items-center justify-center px-4 py-2.5 text-xs font-semibold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-sm transition-all duration-200"
            >
              Book Space
            </a>
          </div>
        </div>
      </div>
    </header>
  );
};
