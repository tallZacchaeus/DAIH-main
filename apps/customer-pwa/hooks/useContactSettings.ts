"use client";

import { useState, useEffect } from "react";
import { api } from "@daih/api-client";
import { SupportContactChannelsDTO } from "@daih/types";

const STORAGE_KEY = "daih:contact_settings";

export function useContactSettings() {
  const [contact, setContact] = useState<SupportContactChannelsDTO | null>(
    () => {
      if (typeof window !== "undefined") {
        try {
          const cached = localStorage.getItem(STORAGE_KEY);
          if (cached) {
            return JSON.parse(cached);
          }
        } catch {
          // ignore parse errors
        }
      }
      return null;
    },
  );
  const [loading, setLoading] = useState<boolean>(!contact);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    api.support
      .get()
      .then((res) => {
        if (!isMounted) return;
        if (res && res.contact) {
          setContact(res.contact);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(res.contact));
          } catch {
            // ignore storage errors
          }
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn(
          "[useContactSettings] Failed to fetch dynamic contact:",
          err?.message,
        );
        setError(err?.message || "Failed to load contact settings");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return { contact, loading, error };
}
