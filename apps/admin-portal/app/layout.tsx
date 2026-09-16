import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { AdminShell } from "./admin-shell";

export const metadata: Metadata = {
  title: "DAIH Workspace - Admin Operations Dashboard",
  description:
    "Manage workspaces, live schedules, bookings, revenue ledger, and audit logs.",
  icons: {
    icon: "/images/icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/images/icon.png" type="image/png" sizes="any" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="bg-background text-on-background antialiased flex flex-col min-h-screen font-sans"
        suppressHydrationWarning
      >
        <Providers>
          <AdminShell>{children}</AdminShell>
        </Providers>
      </body>
    </html>
  );
}
