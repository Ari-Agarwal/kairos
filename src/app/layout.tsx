import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { MotionConfig } from "framer-motion";
import AccentColorSync from "@/components/AccentColorSync";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kairosadmissions.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Kairos — College guidance for every student",
  description: "Personalized college admissions guidance, regardless of what you can afford.",
  openGraph: {
    title: "Kairos — College guidance for every student",
    description: "Personalized college admissions guidance, regardless of what you can afford.",
    url: siteUrl,
    siteName: "Kairos",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Kairos — College guidance for every student",
    description: "Personalized college admissions guidance, regardless of what you can afford.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body
        className="min-h-full flex flex-col bg-bg text-text"
        style={{ fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif" }}
      >
        {/* "user" mode: every framer-motion animation in the app respects the
            OS prefers-reduced-motion setting automatically, instead of relying
            on each component to check useReducedMotion() itself. */}
        <AccentColorSync />
        <MotionConfig reducedMotion="user">{children}</MotionConfig>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
