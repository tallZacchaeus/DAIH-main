"use client";

import React, { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth, apiClient } from "@daih/api-client";
import { Loader2 } from "lucide-react";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSession, refreshSession } = useAuth();

  useEffect(() => {
    const token = searchParams?.get("token");
    const destination = searchParams?.get("destination") || "/dashboard";
    const error = searchParams?.get("error");

    if (error) {
      router.replace(`/login?error=${encodeURIComponent(error)}`);
      return;
    }

    if (token) {
      apiClient.setAccessToken(token);
      // Fetch user profile and sync state
      apiClient.auth
        .getProfile()
        .then((user) => {
          setSession(token, user);
          router.replace(destination);
        })
        .catch(() => {
          // If direct profile fetch fails, try session refresh
          refreshSession()
            .then(() => router.replace(destination))
            .catch(() =>
              router.replace("/login?error=Session+synchronization+failed"),
            );
        });
    } else {
      // No token directly in query, check for refresh cookie via refreshSession
      refreshSession()
        .then((user) => {
          if (user) {
            router.replace(destination);
          } else {
            router.replace("/login");
          }
        })
        .catch(() => {
          router.replace("/login");
        });
    }
  }, [searchParams, router, setSession, refreshSession]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white space-y-4">
      <Loader2 className="w-10 h-10 text-[#23055c] animate-spin" />
      <p className="text-sm font-medium text-slate-600">
        Completing secure sign-in...
      </p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <Loader2 className="w-8 h-8 text-[#23055c] animate-spin" />
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}
