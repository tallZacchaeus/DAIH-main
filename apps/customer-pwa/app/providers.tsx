"use client";

import React from "react";
import { AuthProvider } from "@daih/api-client";
import { ToastProvider } from "@daih/ui";
import { NotificationProvider } from "../components/notifications";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <NotificationProvider>{children}</NotificationProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
