"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, RefreshCw, Loader2 } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string; status?: number; code?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error("Customer PWA Runtime Error:", error);
  }, [error]);

  const is401Unauthorized =
    (error as any)?.status === 401 ||
    (error as any)?.code === "UNAUTHORIZED" ||
    error.message?.includes("401") ||
    error.message?.toLowerCase().includes("unauthorized");

  useEffect(() => {
    if (is401Unauthorized && typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }, [is401Unauthorized]);

  if (is401Unauthorized) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-8 h-8 text-[#23055c] animate-spin mb-3" />
        <p className="text-xs font-bold text-slate-600">
          Session expired. Redirecting to login...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mb-4">
        <AlertCircle className="w-7 h-7 text-rose-600" />
      </div>
      <h2 className="text-xl font-bold text-slate-800 mb-2">
        Something went wrong
      </h2>
      <p className="text-xs text-slate-500 max-w-md mb-6 leading-relaxed">
        {error.message ||
          "An unexpected error occurred. Please try reloading or check your connection."}
      </p>
      <button
        onClick={() => reset()}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#23055c] text-white rounded-xl text-xs font-bold hover:bg-[#35089e] transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        Retry Action
      </button>
    </div>
  );
}
