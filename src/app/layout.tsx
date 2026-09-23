import type { Metadata, Viewport } from "next";
import { Rajdhani, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SiteFooter } from "@/components/site-footer";

const display = Rajdhani({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});

const body = Rajdhani({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-body",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
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
        url: "/opengraph-image",
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
    images: ["/twitter-image"],
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
