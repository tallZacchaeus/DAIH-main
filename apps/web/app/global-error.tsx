"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased">
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            Something went wrong!
          </h2>
          <p className="text-xs text-slate-500 max-w-md mb-6">
            An unexpected error occurred. Our engineers have been alerted.
          </p>
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-[#1f3a68] text-white rounded-lg text-xs font-bold hover:bg-[#152747] transition-colors cursor-pointer"
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
