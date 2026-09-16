"use client";

import React from "react";
import { AuthProvider } from "@daih/api-client";
import { ToastProvider } from "@daih/ui";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>{children}</AuthProvider>
    </ToastProvider>
  );
}
