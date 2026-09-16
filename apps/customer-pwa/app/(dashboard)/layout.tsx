"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@daih/api-client";
import { UserRole } from "@daih/types";
import { SidebarNav, TopAppBar } from "../../components/dashboard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        const fullPath =
          typeof window !== "undefined"
            ? `${window.location.pathname}${window.location.search}`
            : pathname;
        const redirectParam =
          fullPath && fullPath !== "/login" && fullPath !== "/"
            ? `?redirectTo=${encodeURIComponent(fullPath)}`
            : "";
        router.push(`/login${redirectParam}`);
      } else if (user && user.role !== UserRole.CUSTOMER) {
        // Automatically revoke staff sessions from customer dashboard
        logout().then(() => router.push("/login"));
      }
    }
  }, [isLoading, isAuthenticated, user, router, logout, pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f9ff]">
        <Loader2 className="w-8 h-8 text-[#23055c] animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !user || user.role !== UserRole.CUSTOMER) {
    return null;
  }

  const toggleCollapse = () => setIsCollapsed((prev) => !prev);

  return (
    <div className="min-h-screen bg-[#f7f9ff] text-[#181c20] font-sans antialiased flex">
      {/* Sidebar Navigation */}
      <SidebarNav
        isMobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleCollapse}
      />

      {/* Main Content Wrapper */}
      <div
        className={`flex-1 min-w-0 max-w-full flex flex-col min-h-screen overflow-x-hidden transition-all duration-300 ${
          isCollapsed ? "md:ml-20" : "md:ml-64"
        }`}
      >
        {/* Top App Bar with DAIH logo */}
        <TopAppBar
          onMobileMenuToggle={() => setMobileMenuOpen((prev) => !prev)}
        />

        {/* Dashboard Main Area */}
        <main className="flex-1 min-w-0 max-w-full p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
