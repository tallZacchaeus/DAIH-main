"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Client-side hook to sync referral codes from URL search parameters or cookie into localStorage.
 */
export function useReferralSync() {
  const searchParams = useSearchParams();

  useEffect(() => {
    try {
      // 1. Check URL parameters
      const refParam =
        searchParams?.get("ref") || searchParams?.get("referralCode");
      if (refParam) {
        const cleanRef = refParam.trim().toUpperCase();
        if (/^REF-[2-9A-HJ-NP-Z]{6}$/i.test(cleanRef)) {
          localStorage.setItem("daih_referral_code", cleanRef);
          return;
        }
      }

      // 2. Check document.cookie if not already in localStorage
      if (
        typeof document !== "undefined" &&
        !localStorage.getItem("daih_referral_code")
      ) {
        const match = document.cookie.match(
          /(?:^|;\s*)daih_referral_code=([^;]+)/,
        );
        if (match && match[1]) {
          const cookieVal = decodeURIComponent(match[1]).trim().toUpperCase();
          if (/^REF-[2-9A-HJ-NP-Z]{6}$/i.test(cookieVal)) {
            localStorage.setItem("daih_referral_code", cookieVal);
          }
        }
      }
    } catch {
      // Ignore localStorage/cookie access issues in private browsing
    }
  }, [searchParams]);
}
