import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Metam — College guidance for every student",
  description: "Personalized college admissions guidance, regardless of what you can afford.",
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
