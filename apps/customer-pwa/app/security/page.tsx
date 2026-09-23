"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@daih/api-client";
import { useContactSettings } from "../../hooks/useContactSettings";
import {
  ShieldCheck,
  Lock,
  KeyRound,
  QrCode,
  Server,
  FileCheck,
  AlertTriangle,
  Mail,
  ArrowLeft,
  ExternalLink,
  CheckCircle2,
  Cpu,
  Globe,
} from "lucide-react";

export default function SecurityPage() {
  const { isAuthenticated } = useAuth();
  const { contact } = useContactSettings();
  const backLink = isAuthenticated ? "/dashboard" : "/login";

  return (
    <div className="min-h-screen bg-[#f7f9ff] text-[#181c20] flex flex-col pb-16">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 sm:px-6 shadow-xs">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link
            href={backLink}
            className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-700 hover:text-[#23055c] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{isAuthenticated ? "Back to Hub" : "Back to Login"}</span>
          </Link>
          <div className="flex items-center gap-2 text-xs font-semibold px-2.5 py-1 bg-purple-50 text-[#23055c] rounded-full border border-purple-100">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Security &amp; Trust Center</span>
          </div>
        </div>
      </header>

      {/* Hero Header */}
      <section className="bg-gradient-to-r from-[#23055c] via-[#2f0b75] to-[#43129e] text-white py-12 px-4 sm:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-bold tracking-wide uppercase">
            <Lock className="w-3.5 h-3.5 text-purple-200" />
            <span>Enterprise-Grade Workspace Protection</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
            Security, Privacy &amp; Trust
          </h1>
          <p className="text-xs sm:text-sm text-purple-100/90 max-w-2xl mx-auto leading-relaxed">
            Dominion Allianze Innovation Hub (DAIH) is built with
            defense-in-depth architecture to safeguard your identity,
            transactions, and physical workspace security.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 -mt-6 flex-1 space-y-8">
        {/* Core Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Card 1: Data Encryption */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 hover:border-[#23055c]/30 transition-all">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#23055c] flex items-center justify-center font-bold">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                End-to-End Transport &amp; Storage Encryption
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                All communications are secured with TLS 1.3 encryption and
                Strict-Transport-Security (HSTS). Data at rest in our
                distributed cloud database is encrypted using industry-standard
                AES-256 cipher blocks.
              </p>
            </div>
            <ul className="space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>TLS 1.3 with Perfect Forward Secrecy</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>AES-256-GCM database volume encryption</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>
                  Zero plaintext storage of sensitive user credentials
                </span>
              </li>
            </ul>
          </div>

          {/* Card 2: Authentication & Sessions */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 hover:border-[#23055c]/30 transition-all">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Strict HttpOnly Session Architecture
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Authentication tokens are isolated in HttpOnly, Secure, SameSite
                cookies. JavaScript execution within the browser cannot access
                or harvest session tokens, shielding users from XSS token theft.
              </p>
            </div>
            <ul className="space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>HttpOnly &amp; SameSite=Lax cookie isolation</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Automated cryptographically signed token refresh</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>OAuth 2.0 PKCE authentication with Google Identity</span>
              </li>
            </ul>
          </div>

          {/* Card 3: Dynamic Physical Access Pass */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 hover:border-[#23055c]/30 transition-all">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Cryptographic Physical Access QR Pass
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Physical entry to DAIH coworking desks, meeting rooms, and
                executive suites is governed by short-lived rotating QR passes.
                Screenshot reuse is actively prevented by reception scanners.
              </p>
            </div>
            <ul className="space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Time-synchronized dynamic QR pass rotation</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Gate &amp; reception camera scanner validation</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Real-time booking hold and check-in revocation</span>
              </li>
            </ul>
          </div>

          {/* Card 4: Network & Edge Defenses */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 hover:border-[#23055c]/30 transition-all">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Perimeter Defense &amp; Security Headers
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                All edge servers enforce strict HTTP headers including
                Content-Security-Policy, X-Frame-Options: DENY, and
                X-Content-Type-Options: nosniff to eliminate clickjacking and
                MIME-type sniffing.
              </p>
            </div>
            <ul className="space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Clickjacking protection (X-Frame-Options: DENY)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>
                  Redis distributed rate-limiting on sensitive endpoints
                </span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>
                  Content-Security-Policy script &amp; style origin boundaries
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Compliance & Payment Safety Section */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-md text-xs font-bold mb-2">
              <FileCheck className="w-3.5 h-3.5" />
              <span>Compliance Standards</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              Regulatory Compliance &amp; Financial Security
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              DAIH strictly adheres to national and international data privacy
              regulations.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
              <span className="font-bold text-slate-900 block">
                NDPA 2023 &amp; NDPR
              </span>
              <p className="text-slate-500 leading-relaxed">
                Full compliance with the Nigeria Data Protection Act (NDPA 2023)
                and NDPR data residency and consent standards.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
              <span className="font-bold text-slate-900 block">
                PCI-DSS Level 1
              </span>
              <p className="text-slate-500 leading-relaxed">
                All card payments and bank transactions are processed via
                Paystack, a certified PCI-DSS Level 1 compliant gateway.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
              <span className="font-bold text-slate-900 block">
                Role-Based Access (RBAC)
              </span>
              <p className="text-slate-500 leading-relaxed">
                Strict principle of least privilege: staff and administrators
                only access necessary audit and booking logs.
              </p>
            </div>
          </div>
        </div>

        {/* Responsible Disclosure Channel */}
        <div className="bg-gradient-to-br from-slate-900 to-[#1e074d] text-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold tracking-wide uppercase">
              <AlertTriangle className="w-4 h-4" />
              <span>Responsible Vulnerability Disclosure</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold">
              Found a Security Vulnerability?
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              We take the security of our members very seriously. If you have
              discovered a potential security vulnerability or misconfiguration,
              please report it to our engineering team for rapid investigation.
            </p>
          </div>
          {contact?.email ? (
            <a
              href={`mailto:${contact.email}?subject=Security%20Vulnerability%20Report`}
              className="px-5 py-2.5 rounded-xl bg-white text-[#23055c] hover:bg-slate-100 text-xs font-bold flex items-center gap-2 shrink-0 shadow-sm transition-all"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>{contact.email}</span>
            </a>
          ) : (
            <Link
              href="/support"
              className="px-5 py-2.5 rounded-xl bg-white text-[#23055c] hover:bg-slate-100 text-xs font-bold flex items-center gap-2 shrink-0 shadow-sm transition-all"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Contact Security Desk</span>
            </Link>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="pt-4 border-t border-slate-200 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-4">
          <p>
            &copy; {new Date().getFullYear()} DAIH Workspace. All rights
            reserved.
          </p>
          <div className="flex gap-4">
            <Link
              href="/privacy"
              className="font-medium text-[#23055c] hover:underline"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="font-medium text-[#23055c] hover:underline"
            >
              Terms of Service
            </Link>
            <Link
              href="/support"
              className="font-medium text-[#23055c] hover:underline"
            >
              Support Center
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
