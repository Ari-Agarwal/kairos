"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function CounselorNavShell({
  schoolName,
  children,
}: {
  schoolName: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-5 md:px-8 py-4 border-b border-border">
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
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
