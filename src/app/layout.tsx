import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { SiteFooter } from "@/components/site-footer";

const display = localFont({
  src: [
    { path: "./fonts/rajdhani-500-latin.woff2", weight: "500" },
    { path: "./fonts/rajdhani-600-latin.woff2", weight: "600" },
    { path: "./fonts/rajdhani-700-latin.woff2", weight: "700" },
  ],
  display: "swap",
  variable: "--font-display",
});

const body = localFont({
  src: [
    { path: "./fonts/rajdhani-500-latin.woff2", weight: "500" },
    { path: "./fonts/rajdhani-600-latin.woff2", weight: "600" },
    { path: "./fonts/rajdhani-700-latin.woff2", weight: "700" },
  ],
  display: "swap",
  variable: "--font-body",
});

const mono = localFont({
  src: [
    { path: "./fonts/jetbrainsmono-400-latin.woff2", weight: "400" },
    { path: "./fonts/jetbrainsmono-400-latin.woff2", weight: "500" },
    { path: "./fonts/jetbrainsmono-400-latin.woff2", weight: "600" },
  ],
  display: "swap",
  variable: "--font-mono",
});

const siteDescription =
  "Sign in with Discord to report your IGN, attendance and pilot status for Chaos clan squadron ops.";

export const metadata: Metadata = {
  metadataBase: new URL("https://chaosattendance.vercel.app"),
  title: {
    default: "CHAOS Attendance Tracker",
    template: "%s | CHAOS Attendance",
  },
  description: siteDescription,
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
    },
  },
  openGraph: {
    title: "CHAOS Attendance Tracker",
    description: siteDescription,
    url: "https://chaosattendance.vercel.app",
    siteName: "CHAOS Attendance",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "CHAOS / Attendance Tracker",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CHAOS Attendance Tracker",
    description: siteDescription,
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#F97316",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={[display.variable, body.variable, mono.variable].join(" ")}
    >
      <body>
        <div className="site-shell">
          <div className="site-content">{children}</div>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
