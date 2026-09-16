import type { Metadata } from "next";
import "./globals.css";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { ScriptsLoader } from "../components/ScriptsLoader";

export const metadata: Metadata = {
  title: "The Dare Adeboye Innovation Hub",
  description:
    "The Dare Adeboye Innovation Hub — flexible workspaces designed for focus, collaboration, and productivity in Redemption City, Ogun State.",
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="icon"
          href="/images/icon.png"
          type="image/gif"
          sizes="16x16"
        />
        {/* Original CSS Files */}
        <link
          id="bootstrap"
          href="/css/bootstrap.min.css"
          rel="stylesheet"
          type="text/css"
        />
        <link
          id="bootstrap-grid"
          href="/css/bootstrap-grid.min.css"
          rel="stylesheet"
          type="text/css"
        />
        <link
          id="bootstrap-reboot"
          href="/css/bootstrap-reboot.min.css"
          rel="stylesheet"
          type="text/css"
        />
        <link href="/css/animate.css" rel="stylesheet" type="text/css" />
        <link href="/css/owl.carousel.css" rel="stylesheet" type="text/css" />
        <link href="/css/owl.theme.css" rel="stylesheet" type="text/css" />
        <link
          href="/css/owl.transitions.css"
          rel="stylesheet"
          type="text/css"
        />
        <link href="/css/magnific-popup.css" rel="stylesheet" type="text/css" />
        <link
          href="/css/jquery.countdown.css"
          rel="stylesheet"
          type="text/css"
        />
        <link
          id="mdb"
          href="/css/mdb.min.css"
          rel="stylesheet"
          type="text/css"
        />
        <link href="/css/style.css" rel="stylesheet" type="text/css" />
        {/* Color scheme */}
        <link
          id="colors"
          href="/css/colors/scheme-01.css"
          rel="stylesheet"
          type="text/css"
        />
        <link href="/css/coloring.css" rel="stylesheet" type="text/css" />
        <link href="/css/custom.css" rel="stylesheet" type="text/css" />
        {/* Fonts */}
        <link
          href="/fonts/font-awesome/css/font-awesome.css"
          rel="stylesheet"
          type="text/css"
        />
        <link
          href="/fonts/elegant_font/HTML_CSS/style.css"
          rel="stylesheet"
          type="text/css"
        />
        <link
          href="/fonts/et-line-font/style.css"
          rel="stylesheet"
          type="text/css"
        />
        <link
          href="/fonts/icofont/icofont.min.css"
          rel="stylesheet"
          type="text/css"
        />
      </head>
      <body suppressHydrationWarning>
        <div id="wrapper">
          <Header />
          <div className="no-bottom no-top" id="content">
            <div id="top"></div>
            {children}
          </div>
          <Footer />
        </div>
        <ScriptsLoader />
      </body>
    </html>
  );
}
