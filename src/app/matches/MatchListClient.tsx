"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

const EASE = [0.16, 1, 0.3, 1] as const;

interface Match {
  id: string;
  school_name: string;
  category: "reach" | "target" | "safety";
  percentage: number;
  why_text: string;
}

const CATEGORY_STYLES: Record<string, string> = {
  reach: "bg-red-tint text-red",
  target: "bg-amber-tint text-amber-text-on-tint",
  safety: "bg-green-tint text-green",
};

export default function MatchListClient({
  initialMatches,
  remaining,
  isPremium,
}: {
  initialMatches: Match[];
  remaining: number | null;
  isPremium: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [matches, setMatches] = useState(initialMatches);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRegenerate() {
    setRegenerating(true);
    setError(null);
    const res = await fetch("/api/matches/generate", { method: "POST" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to regenerate. Please try again.");
      setRegenerating(false);
      return;
    }
    router.refresh();
    setRegenerating(false);
  }

  async function handleRemove(id: string) {
    await supabase.from("school_matches").update({ is_active: false }).eq("id", id);
    setMatches((prev) => prev.filter((m) => m.id !== id));
  }

  if (regenerating) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center min-h-[60vh]">
        <p className="font-serif text-2xl text-text mb-2 animate-pulse">Building your personalized list...</p>
        <p className="text-text-gray text-sm">Hang tight while we re-match you against real schools.</p>
      </div>
    );
  }

  return (
    <div className="px-5 md:px-8 py-8 max-w-3xl mx-auto w-full">
      <p className="text-text-gray text-sm mb-1">
        Built from your profile. Not set in stone, this evolves as you grow.
      </p>

      <div className="flex items-center justify-between mb-6 mt-3">
        <button
          onClick={handleRegenerate}
          disabled={!isPremium && remaining === 0}
          className="rounded-xl bg-primary hover:bg-primary-hover transition-colors text-bg text-sm font-medium px-4 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Regenerate List
        </button>
        <span className="text-text-gray text-xs">
          {isPremium ? "Unlimited regenerations" : `${remaining} regeneration${remaining === 1 ? "" : "s"} left this week`}
        </span>
      </div>

      {error && <p className="text-red text-sm mb-4">{error}</p>}

      <div className="space-y-4">
        <AnimatePresence initial={false}>
          {matches.map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.2, ease: EASE } }}
              transition={{ duration: 0.35, ease: EASE, delay: i * 0.05 }}
              className="bg-card border border-border rounded-2xl p-5 relative hover:border-text-gray/40 transition-colors"
            >
              <button
                onClick={() => handleRemove(m.id)}
                className="absolute top-3 right-3 text-text-gray hover:text-red text-xs px-2.5 py-2 rounded-lg transition-colors"
                aria-label="Remove school"
              >
                Remove
              </button>

              <div className="flex items-start justify-between pr-14 mb-2">
                <div>
                  <span
                    className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full mb-2 capitalize ${CATEGORY_STYLES[m.category]}`}
                  >
                    {m.category}
                  </span>
                  <Link href={`/schools/${m.id}`} className="block font-serif text-lg text-text hover:text-primary">
                    {m.school_name}
                  </Link>
                </div>
                <Link
                  href={`/matches/${m.id}/breakdown`}
                  className="font-serif text-2xl text-primary shrink-0"
                >
                  {m.percentage}%
                </Link>
              </div>

              <p className="text-text-gray text-sm mb-2">{m.why_text}</p>
              <p className="text-text-gray text-xs">
                Tap % for the breakdown · Tap card for school info &amp; career paths
              </p>
            </motion.div>
          ))}
        </AnimatePresence>
        {matches.length === 0 && (
          <p className="text-text-gray text-sm text-center py-12">
            No active matches. Try regenerating your list.
          </p>
        )}
      </div>
    </div>
  );
}
