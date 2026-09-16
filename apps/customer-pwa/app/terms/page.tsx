"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@daih/api-client";
import { PolicyDocument } from "@daih/types";
import { ArrowLeft, FileText, ShieldCheck, Loader2 } from "lucide-react";
import { RichPolicyRenderer } from "../../components/legal/RichPolicyRenderer";

export default function CustomerTermsPage() {
  const [policy, setPolicy] = useState<PolicyDocument | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    api.policies
      .getByType("TERMS_OF_SERVICE")
      .then((data) => {
        if (isMounted) setPolicy(data);
      })
      .catch((err) => {
        console.warn("Could not load Terms of Service from API:", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col pb-16">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 sm:px-6 shadow-xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm font-bold text-slate-700 hover:text-[#23055c] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Hub</span>
          </Link>
          <div className="flex items-center gap-2 text-xs font-semibold px-2.5 py-1 bg-purple-50 text-[#23055c] rounded-full border border-purple-100">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Official Legal Document</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 pt-8 flex-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-[#23055c]" />
            <p className="text-sm font-medium">Loading Terms of Service...</p>
          </div>
        ) : (
          <article className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-xs">
            <div className="border-b border-slate-100 pb-6 mb-8">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#23055c] flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {policy?.title || "DAIH Terms of Service"}
                  </h1>
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500 font-medium">
                    <span className="bg-slate-100 px-2 py-0.5 rounded font-mono">
                      v{policy?.version || "1.0"}
                    </span>
                    <span>•</span>
                    <span>
                      Updated:{" "}
                      {policy?.updatedAt
                        ? new Date(policy.updatedAt).toLocaleDateString(
                            undefined,
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            },
                          )
                        : "Current"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Rich Document Prose */}
            <RichPolicyRenderer
              content={policy?.content || ""}
              className="mt-4"
            />

            {/* Footer Signoff */}
            <div className="mt-12 pt-6 border-t border-slate-100 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-4">
              <p>© {new Date().getFullYear()} DAIH. All rights reserved.</p>
              <div className="flex gap-4">
                <Link
                  href="/privacy"
                  className="font-medium text-[#23055c] hover:underline"
                >
                  Privacy Policy & NDPR
                </Link>
              </div>
            </div>
          </article>
        )}
      </main>
    </div>
  );
}
