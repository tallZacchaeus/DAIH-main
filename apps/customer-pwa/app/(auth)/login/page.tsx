"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AuthSplitLayout, LoginForm } from "../../../components/auth";

function CustomerLoginPageContent() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams?.get("redirectTo");
  const registerHref = redirectTo
    ? `/register?redirectTo=${encodeURIComponent(redirectTo)}`
    : "/register";

  return (
    <AuthSplitLayout
      bgImage="/images/background/1.jpg"
      showcaseTitle="Welcome to the Workspace of the Future"
      showcaseDescription="Experience enterprise-grade facilities, high-speed connectivity, and modern collaborative spaces tailored for visionary professionals."
      showShowcaseLogo={false}
      headerPromptText="Don't have an account?"
      headerActionText="Sign Up"
      headerActionHref={registerHref}
    >
      <LoginForm />
    </AuthSplitLayout>
  );
}

export default function CustomerLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <Loader2 className="w-8 h-8 text-[#23055c] animate-spin" />
        </div>
      }
    >
      <CustomerLoginPageContent />
    </Suspense>
  );
}
