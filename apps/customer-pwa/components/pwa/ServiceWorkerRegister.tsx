"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      window.location.protocol.startsWith("http")
    ) {
      const registerSW = () => {
        navigator.serviceWorker
          .register("/sw.js", { scope: "/" })
          .catch(() =>
            navigator.serviceWorker.register("/service-worker.js", {
              scope: "/",
            }),
          )
          .then((registration) => {
            if (registration && process.env.NODE_ENV === "development") {
              console.log(
                "[PWA] Service Worker registered successfully:",
                registration.scope,
              );
            }
          })
          .catch((error) => {
            console.warn("[PWA] Service Worker registration failed:", error);
          });
      };

      if (document.readyState === "complete") {
        registerSW();
      } else {
        window.addEventListener("load", registerSW);
        return () => window.removeEventListener("load", registerSW);
      }
    }
  }, []);

  return null;
}
