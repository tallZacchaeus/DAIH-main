"use client";

import React, { useState } from "react";
import { Button, Card } from "@daih/ui";
import * as Sentry from "@sentry/nextjs";
import { Bug, AlertTriangle, CheckCircle2 } from "lucide-react";

export default function DebugSentryPage() {
  const [triggered, setTriggered] = useState(false);

  const triggerClientError = () => {
    setTriggered(true);
    try {
      throw new Error(
        "DAIH Customer PWA Test Sentry Exception (Staging Smoke Check)",
      );
    } catch (error) {
      Sentry.captureException(error);
      throw error;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
      <Card className="max-w-md w-full p-6 bg-slate-800 border-slate-700 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-rose-500/20 text-rose-400 rounded-xl">
            <Bug className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold">
              Frontend Observability Smoke Test
            </h1>
            <p className="text-xs text-slate-400">
              Gated for Staging / Non-Production Validation
            </p>
          </div>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-300 flex items-start gap-2 mb-6">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Clicking the button below will trigger a deliberate React test
            exception to verify Sentry event capture.
          </span>
        </div>

        <Button
          onClick={triggerClientError}
          className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2"
        >
          <Bug className="w-4 h-4" />
          Trigger Test Sentry Exception
        </Button>

        {triggered && (
          <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Exception thrown and dispatched to Sentry!</span>
          </div>
        )}
      </Card>
    </div>
  );
}
