"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  AuthSplitLayout,
  RegisterForm,
  VerificationSuccessCard,
} from "../../../components/auth";

function CustomerRegisterPageContent() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams?.get("redirectTo");
  const loginHref = redirectTo
    ? `/login?redirectTo=${encodeURIComponent(redirectTo)}`
    : "/login";

  const [isSuccess, setIsSuccess] = useState(false);
  const [createdEmail, setCreatedEmail] = useState("");

  const handleSuccess = (email: string) => {
    setCreatedEmail(email);
    setIsSuccess(true);
  };

  if (isSuccess) {
    return <VerificationSuccessCard email={createdEmail} />;
  }

  return (
    <AuthSplitLayout
      showcaseTitle="Elevate Your Work Environment"
      showcaseDescription="Join a premier community of professionals. Access meticulously designed spaces that foster focus, collaboration, and high-tier productivity."
      headerPromptText="Already have an account?"
      headerActionText="Sign In"
      headerActionHref={loginHref}
    >
      <RegisterForm onSuccess={handleSuccess} />
    </AuthSplitLayout>
  );
}

export default function CustomerRegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center space-y-2">
          <Loader2 className="w-6 h-6 animate-spin text-[#23055c] mx-auto" />
          <p className="text-xs text-slate-500 font-semibold">
            Loading registration...
          </p>
        </div>
      }
    >
      <CustomerRegisterPageContent />
    </Suspense>
  );
}
