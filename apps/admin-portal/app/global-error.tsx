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
      <body className="bg-workspace-surface text-on-surface antialiased">
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-error/10 text-error flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-[28px]">error</span>
          </div>
          <h2 className="text-xl font-bold text-on-surface mb-2 font-display">
            Something went wrong
          </h2>
          <p className="text-xs text-on-surface-variant max-w-md mb-6">
            An unexpected error occurred in the DAIH Admin Console. Our
            telemetry system has logged this incident.
          </p>
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-primary text-on-primary rounded-lg text-xs font-bold hover:bg-primary-container transition-colors cursor-pointer"
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
