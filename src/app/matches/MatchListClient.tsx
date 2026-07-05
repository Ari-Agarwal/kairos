"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import GenerationProgress from "@/components/GenerationProgress";
import CountUp from "@/components/CountUp";

const EASE = [0.16, 1, 0.3, 1] as const;

type Category = "reach" | "target" | "safety";

interface Match {
  id: string;
  school_name: string;
  category: Category;
  percentage: number;
  why_text: string;
}

const CATEGORY_STYLES: Record<string, string> = {
  reach: "bg-red-tint text-red",
  target: "bg-amber-tint text-amber-text-on-tint",
  safety: "bg-green-tint text-green",
};

const CATEGORY_ORDER: Record<Category, number> = { reach: 0, target: 1, safety: 2 };
const CATEGORIES: Category[] = ["reach", "target", "safety"];

const MANUAL_NOTE = "This school was added manually, so an AI assessment isn't available.";

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
  const reduceMotion = useReducedMotion();
  const [matches, setMatches] = useState(initialMatches);
  const [regenerating, setRegenerating] = useState(false);
  const [prevInitialMatches, setPrevInitialMatches] = useState(initialMatches);
  if (initialMatches !== prevInitialMatches) {
    setPrevInitialMatches(initialMatches);
    setMatches(initialMatches);
    setRegenerating(false);
  }
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [newSchoolName, setNewSchoolName] = useState("");
  const [newSchoolCategory, setNewSchoolCategory] = useState<Category>("target");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

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
  }

  async function handleRemove(id: string) {
    await supabase.from("school_matches").update({ is_active: false }).eq("id", id);
    setMatches((prev) => prev.filter((m) => m.id !== id));
  }

  async function handleAddSchool() {
    if (!newSchoolName.trim()) return;
    setAdding(true);
    setAddError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setAdding(false);
      return;
    }
    const { data, error: insertError } = await supabase
      .from("school_matches")
      .insert({
        user_id: user.id,
        school_name: newSchoolName.trim(),
        category: newSchoolCategory,
        percentage: 50,
        why_text: "Added manually by you.",
        factors: {
          gpa_comparison: MANUAL_NOTE,
          course_rigor: MANUAL_NOTE,
          ec_strength: MANUAL_NOTE,
          major_fit: MANUAL_NOTE,
          social_fit: MANUAL_NOTE,
        },
        is_active: true,
      })
      .select()
      .single();

    if (insertError || !data) {
      setAddError("Failed to add school. Please try again.");
      setAdding(false);
      return;
    }

    setMatches((prev) => [...prev, data as Match].sort((a, b) => CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category]));
    setNewSchoolName("");
    setNewSchoolCategory("target");
    setAdding(false);
  }

  if (regenerating) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center min-h-[60vh]">
        <p className="font-serif text-2xl text-text mb-2 animate-pulse">Building your personalized list...</p>
        <p className="text-text-gray text-sm">Hang tight while we re-match you against real schools.</p>
        <GenerationProgress />
      </div>
    );
  }

  return (
    <div className="px-5 md:px-8 py-8 max-w-3xl mx-auto w-full">
      <p className="text-text-gray text-xs mb-3">
        Tap any card to see the school&apos;s info, percentage breakdown, and career path.
      </p>

      <div className="flex items-center justify-between mb-6 mt-3">
        <div className="flex items-center gap-2">
          <button
            onClick={handleRegenerate}
            disabled={!isPremium && remaining === 0}
            className="rounded-xl bg-primary hover:bg-primary-hover transition-colors text-bg text-sm font-medium px-4 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Regenerate List
          </button>
          <button
            onClick={() => setEditing((e) => !e)}
            className="rounded-xl border border-border text-text-gray hover:text-text text-sm font-medium px-4 py-2 transition-colors"
          >
            {editing ? "Done" : "Edit"}
          </button>
        </div>
        <span className="text-text-gray text-xs">
          {isPremium ? "Unlimited regenerations" : `${remaining} regeneration${remaining === 1 ? "" : "s"} left this week`}
        </span>
      </div>

      {error && <p role="alert" className="text-red text-sm mb-4">{error}</p>}

      {editing && (
        <div className="bg-card border border-border rounded-2xl p-4 mb-4 space-y-3">
          <p className="text-text text-sm font-medium">Add a school</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              aria-label="School name"
              placeholder="School name"
              value={newSchoolName}
              onChange={(e) => setNewSchoolName(e.target.value)}
              className="flex-1 rounded-xl bg-bg border border-border px-4 py-2.5 text-text outline-none focus:border-primary"
            />
            <select
              aria-label="School category"
              value={newSchoolCategory}
              onChange={(e) => setNewSchoolCategory(e.target.value as Category)}
              className="rounded-xl bg-bg border border-border px-4 py-2.5 text-text outline-none focus:border-primary capitalize"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c} className="capitalize">
                  {c}
                </option>
              ))}
            </select>
            <button
              onClick={handleAddSchool}
              disabled={adding || !newSchoolName.trim()}
              className="rounded-xl bg-primary hover:bg-primary-hover transition-colors text-bg text-sm font-medium px-4 py-2.5 disabled:opacity-40"
            >
              {adding ? "Adding..." : "Add"}
            </button>
          </div>
          {addError && <p className="text-red text-sm">{addError}</p>}
        </div>
      )}

      <div className="space-y-4">
        <AnimatePresence initial={false}>
          {matches.map((m, i) => (
            <motion.div
              key={m.id}
              initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.2, ease: EASE } }}
              transition={{ duration: 0.4, ease: EASE, delay: reduceMotion ? 0 : i * 0.06 }}
              className="bg-card border border-border rounded-2xl p-5 relative hover:border-text-gray/40 hover:-translate-y-0.5 transition-all"
            >
              <Link href={`/schools/${m.id}`} className="absolute inset-0 rounded-2xl" aria-label={`View ${m.school_name} details`} />

              {editing && (
                <button
                  onClick={() => handleRemove(m.id)}
                  className="absolute top-3 right-3 z-10 text-text-gray hover:text-red text-xs px-2.5 py-2 rounded-lg transition-colors"
                  aria-label="Remove school"
                >
                  Remove
                </button>
              )}

              <div className="pointer-events-none">
                <div className={`flex items-start justify-between mb-2 ${editing ? "pr-14" : ""}`}>
                  <div>
                    <span
                      className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full mb-2 capitalize ${CATEGORY_STYLES[m.category]}`}
                    >
                      {m.category}
                    </span>
                    <p className="font-serif text-lg text-text">{m.school_name}</p>
                  </div>
                  <CountUp value={m.percentage} suffix="%" className="font-serif text-2xl text-primary shrink-0" />
                </div>

                <p className="text-text-gray text-sm">{m.why_text}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {matches.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-12">
            <span className="h-1.5 w-1.5 rounded-full bg-text-gray/70 ambient-star" style={{ ["--twinkle-max" as string]: "0.9" }} />
            <p className="text-text-gray text-sm text-center">No active matches. Try regenerating your list.</p>
          </div>
        )}
      </div>

      <p className="text-text-gray text-xs mt-6">
        AI-generated estimates based on your profile and general acceptance data, not a
        guarantee of admission.
      </p>
    </div>
  );
}
