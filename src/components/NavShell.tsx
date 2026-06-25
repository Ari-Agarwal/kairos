"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Target,
  CalendarClock,
  PenLine,
  Crown,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  User as UserIcon,
  Settings,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const TABS = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/matches", label: "Matches", icon: Target },
  { href: "/timeline", label: "Timeline", icon: CalendarClock },
  { href: "/essay-feedback", label: "Essay", icon: PenLine },
  { href: "/upgrade", label: "Upgrade", icon: Crown },
];

const SIDEBAR_COLLAPSED_KEY = "metam_sidebar_collapsed";

export default function NavShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const [collapsed, setCollapsedState] = useState(
    () => typeof window !== "undefined" && localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true"
  );
  const [dropdownOpen, setDropdownOpen] = useState(false);

  function setCollapsed(value: boolean) {
    setCollapsedState(value);
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(value));
  }
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      const fullName = user.user_metadata?.full_name as string | undefined;
      setName(fullName || user.email || "Student");
    });
  }, [supabase]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen">
      <motion.aside
        initial={{ width: collapsed ? 72 : 240 }}
        animate={{ width: collapsed ? 72 : 240 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className="hidden md:flex flex-col border-r border-border shrink-0 relative z-[60]"
      >
        <div className="relative px-3 py-4 border-b border-border">
          <div className={`flex items-center ${collapsed ? "flex-col gap-2" : "justify-between gap-2"}`}>
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              className="flex items-center gap-2 text-left rounded-xl px-1.5 py-1.5 hover:bg-white/5 transition-colors min-w-0"
            >
              <div className="w-7 h-7 rounded-full bg-primary text-bg flex items-center justify-center shrink-0">
                <UserIcon className="w-4 h-4" />
              </div>
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-sm text-text font-semibold truncate"
                  >
                    {name ?? "..."}
                  </motion.span>
                )}
              </AnimatePresence>
              {!collapsed && (
                <ChevronDown
                  className={`w-4 h-4 text-text shrink-0 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                />
              )}
            </button>

            <button
              onClick={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="shrink-0 rounded-lg p-1.5 text-text-gray hover:text-text hover:bg-white/5 transition-colors"
            >
              {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
          </div>

          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                className={`absolute top-full mt-1 z-30 rounded-xl border border-border bg-bg shadow-lg overflow-hidden ${
                  collapsed ? "left-3 w-48" : "left-3 right-3"
                }`}
              >
                <Link
                  href="/profile"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 text-sm text-text hover:bg-white/5 transition-colors"
                >
                  <UserIcon className="w-4 h-4" /> Profile
                </Link>
                <Link
                  href="/profile?edit=true"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 text-sm text-text hover:bg-white/5 transition-colors"
                >
                  <Settings className="w-4 h-4" /> Settings
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-2.5 text-sm text-text hover:bg-white/5 transition-colors w-full text-left border-t border-border"
                >
                  <LogOut className="w-4 h-4" /> Log Out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {TABS.map((tab) => {
            const active = pathname?.startsWith(tab.href);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors ${
                  active ? "bg-white/10 text-text font-bold" : "text-text-gray hover:text-text hover:bg-white/5"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-sm truncate"
                    >
                      {tab.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );
          })}
        </nav>
      </motion.aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden relative z-[60] flex items-center justify-between px-4 py-3 border-b border-border">
          <Link href="/dashboard" className="text-text font-bold text-sm">
            Metam
          </Link>
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-xl px-2 py-1.5 hover:bg-white/5 transition-colors"
          >
            <div className="w-6 h-6 rounded-full bg-primary text-bg flex items-center justify-center shrink-0">
              <UserIcon className="w-3.5 h-3.5" />
            </div>
            <ChevronDown className={`w-4 h-4 text-text transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
          </button>

          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                className="absolute right-4 top-full mt-1 z-30 w-44 rounded-xl border border-border bg-bg shadow-lg overflow-hidden"
              >
                <p className="px-3 py-2 text-xs text-text-gray truncate border-b border-border">{name ?? "..."}</p>
                <Link
                  href="/profile"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 text-sm text-text hover:bg-white/5 transition-colors"
                >
                  <UserIcon className="w-4 h-4" /> Profile
                </Link>
                <Link
                  href="/profile?edit=true"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 text-sm text-text hover:bg-white/5 transition-colors"
                >
                  <Settings className="w-4 h-4" /> Settings
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-2.5 text-sm text-text hover:bg-white/5 transition-colors w-full text-left border-t border-border"
                >
                  <LogOut className="w-4 h-4" /> Log Out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        <main className="flex-1 pb-20 md:pb-0 min-w-0">{children}</main>

        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-black border-t border-border flex justify-around py-2 z-40">
          {TABS.map((tab) => {
            const active = pathname?.startsWith(tab.href);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 ${active ? "text-text font-bold" : "text-text-gray"}`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[10px]">{tab.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
