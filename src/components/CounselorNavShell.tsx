"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const NAV_LINKS = [
  { href: "/counselor", label: "Roster" },
  { href: "/counselor/at-risk", label: "At-Risk Flags" },
  { href: "/counselor/aggregate", label: "Class Overview" },
];

export default function CounselorNavShell({
  schoolName,
  children,
}: {
  schoolName: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="px-5 md:px-8 py-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <Link href="/counselor" className="font-serif text-lg text-text">
              Kairos Counselor
            </Link>
            <p className="text-text-gray text-xs">{schoolName}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-text-gray hover:text-text text-sm rounded-lg px-3 py-1.5 transition-colors"
          >
            Log Out
          </button>
        </div>
        <nav className="flex gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                pathname === link.href ? "bg-primary text-bg" : "text-text-gray hover:text-text"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
