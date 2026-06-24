"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const TABS = [
  { href: "/dashboard", label: "Home" },
  { href: "/matches", label: "Matches" },
  { href: "/timeline", label: "Timeline" },
  { href: "/essay-feedback", label: "Essay" },
  { href: "/profile", label: "Profile" },
  { href: "/upgrade", label: "Upgrade" },
];

export default function NavShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center justify-between px-5 md:px-8 py-3 border-b border-border">
        <Link href="/dashboard" className="font-serif text-lg text-primary">
          Metam
        </Link>
        <button
          onClick={handleLogout}
          className="text-text-gray hover:text-text text-sm rounded-xl border border-border px-3 py-1.5 transition-colors"
        >
          Log Out
        </button>
      </header>

      <nav className="fixed bottom-0 left-0 right-0 md:static bg-card border-t md:border-t-0 md:border-b border-border flex justify-around md:justify-center md:gap-8 py-2 md:py-3 z-40">
        {TABS.map((tab) => {
          const active = pathname?.startsWith(tab.href);
          const isPremium = tab.href === "/upgrade";
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`text-xs md:text-sm px-3 py-1.5 rounded-xl transition-colors ${
                active
                  ? isPremium
                    ? "text-premium font-medium"
                    : "text-primary font-medium"
                  : "text-text-gray hover:text-text"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <main className="flex-1 pb-20 md:pb-0">{children}</main>
    </div>
  );
}
