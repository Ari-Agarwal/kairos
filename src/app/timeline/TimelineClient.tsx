"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import GenerationProgress from "@/components/GenerationProgress";

interface TimelineItem {
  id: string;
  title: string;
  due_date: string | null;
  school_tags: string[];
  tier: "free" | "premium";
  is_strategic: boolean;
  completed: boolean;
  why_text: string;
}

function sortItems(items: TimelineItem[]): TimelineItem[] {
  return [...items].sort((a, b) => {
    if (!a.due_date && !b.due_date) return 0;
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  });
}

export default function TimelineClient({
  items: initialItems,
  isPremium,
  youAreHereId,
  remaining,
}: {
  items: TimelineItem[];
  isPremium: boolean;
  youAreHereId: string | null;
  remaining: number | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [items, setItems] = useState(initialItems);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    setItems(initialItems);
    setGenerating(false);
  }, [initialItems]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const regenDisabled = !isPremium && remaining === 0;

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    const res = await fetch("/api/timeline/generate", { method: "POST" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to generate timeline.");
      setGenerating(false);
      return;
    }
    router.refresh();
  }

  async function handleDelete(id: string) {
    await supabase.from("timeline_items").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function handleAddItem() {
    if (!newTitle.trim()) return;
    setAdding(true);
    setAddError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setAdding(false);
      return;
    }
    const { data, error: insertError } = await supabase
      .from("timeline_items")
      .insert({
        user_id: user.id,
        title: newTitle.trim(),
        due_date: newDueDate || null,
        school_tags: [],
        tier: "free",
        is_strategic: false,
        why_text: "Added manually by you.",
        what_to_do: [],
      })
      .select()
      .single();

    if (insertError || !data) {
      setAddError("Failed to add item. Please try again.");
      setAdding(false);
      return;
    }

    setItems((prev) => sortItems([...prev, data as TimelineItem]));
    setNewTitle("");
    setNewDueDate("");
    setAdding(false);
  }

  if (generating) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center min-h-[60vh]">
        <p className="font-serif text-2xl text-text mb-2 animate-pulse">Mapping out your timeline...</p>
        <p className="text-text-gray text-sm">Pulling together deadlines and strategic advice.</p>
        <GenerationProgress />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center min-h-[60vh]">
        {error && <p className="text-red text-sm mb-3">{error}</p>}
        <p className="text-text-gray text-sm mb-1">No timeline yet.</p>
        <p className="text-text-gray text-xs mb-4">
          {isPremium ? "Unlimited regenerations" : `${remaining} regeneration${remaining === 1 ? "" : "s"} left this week`}
        </p>
        <button
          onClick={handleGenerate}
          disabled={regenDisabled}
          className="rounded-xl bg-primary hover:bg-primary-hover text-bg font-medium px-6 py-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Generate Timeline
        </button>
      </div>
    );
  }

  return (
    <div className="px-5 md:px-8 py-8 max-w-2xl mx-auto w-full">
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-serif text-2xl text-text">Your Timeline</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerate}
            disabled={regenDisabled}
            className="text-primary text-sm hover:text-primary-hover disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Regenerate
          </button>
          <button
            onClick={() => setEditing((e) => !e)}
            className="rounded-xl border border-border text-text-gray hover:text-text text-sm font-medium px-3 py-1.5 transition-colors"
          >
            {editing ? "Done" : "Edit"}
          </button>
        </div>
      </div>
      <p className="text-text-gray text-xs mb-6">
        {isPremium ? "Unlimited regenerations" : `${remaining} regeneration${remaining === 1 ? "" : "s"} left this week`}
      </p>
      {error && <p className="text-red text-sm mb-4">{error}</p>}

      {editing && (
        <div className="bg-card border border-border rounded-2xl p-4 mb-6 space-y-3">
          <p className="text-text text-sm font-medium">Add an item</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="Title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="flex-1 rounded-xl bg-bg border border-border px-4 py-2.5 text-text outline-none focus:border-primary"
            />
            <input
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="rounded-xl bg-bg border border-border px-4 py-2.5 text-text outline-none focus:border-primary"
            />
            <button
              onClick={handleAddItem}
              disabled={adding || !newTitle.trim()}
              className="rounded-xl bg-primary hover:bg-primary-hover transition-colors text-bg text-sm font-medium px-4 py-2.5 disabled:opacity-40"
            >
              {adding ? "Adding..." : "Add"}
            </button>
          </div>
          {addError && <p className="text-red text-sm">{addError}</p>}
        </div>
      )}

      <div className="relative pl-8">
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
        {items.map((item, i) => {
          const isHere = item.id === youAreHereId;
          const locked = item.is_strategic && !isPremium;
          return (
            <motion.div
              key={item.id}
              className="relative mb-5"
              initial={{ opacity: 1, y: 0 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: Math.min(i * 0.05, 0.5) }}
            >
              {isHere ? (
                <motion.div
                  className="absolute -left-8 top-1.5 w-3.5 h-3.5 rounded-full bg-amber border-2 border-amber"
                  animate={{ boxShadow: ["0 0 0 0 rgba(255,255,255,0.5)", "0 0 0 6px rgba(255,255,255,0)"] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
                />
              ) : (
                <div
                  className={`absolute -left-8 top-1.5 w-3.5 h-3.5 rounded-full border-2 ${
                    item.completed ? "bg-green border-green" : "bg-bg border-border"
                  }`}
                />
              )}
              {editing && (
                <button
                  onClick={() => handleDelete(item.id)}
                  className="absolute top-3 right-3 z-10 text-text-gray hover:text-red text-xs px-2.5 py-2 rounded-lg transition-colors"
                  aria-label="Remove item"
                >
                  Remove
                </button>
              )}
              <Link
                href={locked ? "/upgrade" : `/timeline/${item.id}`}
                className={`block rounded-2xl p-4 border ${
                  item.is_strategic
                    ? "bg-premium-tint border-dashed border-premium"
                    : "bg-card border-border"
                }`}
              >
                <div className={`flex items-center justify-between mb-1 ${editing ? "pr-14" : ""}`}>
                  <p className={`font-medium text-sm ${item.completed ? "text-text-gray line-through" : "text-text"}`}>
                    {item.title}
                  </p>
                  {item.is_strategic && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-premium text-bg">
                      PREMIUM
                    </span>
                  )}
                </div>
                {item.due_date && <p className="text-text-gray text-xs mb-1">Due {item.due_date}</p>}
                {isHere && <p className="text-amber text-xs font-medium mb-1">You are here</p>}
                {locked ? (
                  <p className="text-text-gray text-xs italic">
                    Unlock Premium to see this and other tailored guidance
                  </p>
                ) : (
                  <p className="text-text-gray text-xs">{item.why_text}</p>
                )}
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
