"use client";

import React from "react";
import { AuthShowcasePanel } from "./AuthShowcasePanel";
import { AuthHeader } from "./AuthHeader";
import { AuthFooter } from "./AuthFooter";

interface AuthSplitLayoutProps {
  children: React.ReactNode;
  showcaseTitle?: string;
  showcaseDescription?: string;
  bgImage?: string;
  showShowcaseLogo?: boolean;
  showFeatures?: boolean;
  headerPromptText?: string;
  headerActionText?: string;
  headerActionHref?: string;
}

export const AuthSplitLayout: React.FC<AuthSplitLayoutProps> = ({
  children,
  showcaseTitle = "Elevate Your Work Environment",
  showcaseDescription = "Join a premier community of professionals. Access meticulously designed spaces that foster focus, collaboration, and high-tier productivity.",
  bgImage,
  showShowcaseLogo = false,
  showFeatures = false,
  headerPromptText,
  headerActionText,
  headerActionHref,
}) => {
  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-white text-[#181c20] font-sans antialiased">
      {/* 100% Top Header */}
      <AuthHeader
        promptText={headerPromptText}
        actionText={headerActionText}
        actionHref={headerActionHref}
      />

      {/* Main 2-Column Responsive Body */}
      <main className="flex-grow flex flex-col lg:flex-row w-full min-h-[calc(100vh-128px)] bg-white">
        {/* Left Side: 50% Visual Panel */}
        <AuthShowcasePanel
          title={showcaseTitle}
          description={showcaseDescription}
          bgImage={bgImage}
          showLogo={showShowcaseLogo}
          showFeatures={showFeatures}
        />

        {/* Right Side: Form Container (100% Mobile/Tablet, 50% Desktop) */}
        <div className="w-full lg:w-1/2 flex items-center justify-center px-4 py-8 sm:p-10 lg:p-12 xl:p-16 bg-white">
          <div className="w-full max-w-none sm:max-w-md space-y-6">
            {children}
          </div>
        </div>
      </main>

      {/* 100% Bottom Footer */}
      <AuthFooter />
    </div>
  );
};
