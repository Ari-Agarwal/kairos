import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://telos-zeta.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Telos — College guidance for every student",
  description: "Personalized college admissions guidance, regardless of what you can afford.",
  openGraph: {
    title: "Telos — College guidance for every student",
    description: "Personalized college admissions guidance, regardless of what you can afford.",
    url: siteUrl,
    siteName: "Telos",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Telos — College guidance for every student",
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
        {children}
      </body>
    </html>
  );
}
