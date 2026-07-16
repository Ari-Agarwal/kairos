"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const EASE = [0.16, 1, 0.3, 1] as const;

interface TimelineItem {
  id: string;
  title: string;
  due_date: string | null;
  why_text: string;
  what_to_do: string[];
  completed: boolean;
  profile_sync_field: string | null;
}

export default function TaskDetailClient({ item }: { item: TimelineItem }) {
  const router = useRouter();
  const supabase = createClient();
  const [completed, setCompleted] = useState(item.completed);
  const [saving, setSaving] = useState(false);

  async function handleComplete() {
    setSaving(true);
    const { error } = await supabase.from("timeline_items").update({ completed: true }).eq("id", item.id);
    if (error) console.error("TaskDetailClient: failed to mark item complete", error);

    if (item.profile_sync_field) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error: syncError } = await supabase
          .from("profiles")
          .update({ [item.profile_sync_field]: true })
          .eq("user_id", user.id);
        if (syncError) console.error("TaskDetailClient: failed to sync profile field", syncError);
      }
    }

    setCompleted(true);
    setSaving(false);
    router.refresh();
  }

  async function handleMarkIncomplete() {
    setSaving(true);
    const { error } = await supabase.from("timeline_items").update({ completed: false }).eq("id", item.id);
    if (error) console.error("TaskDetailClient: failed to mark item incomplete", error);
    setCompleted(false);
    setSaving(false);
    router.refresh();
  }

  return (
    <motion.div
      initial={{ opacity: 1, y: 0 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: EASE }}
      className="px-5 md:px-8 py-8 max-w-2xl mx-auto w-full"
    >
      <Link href="/timeline" className="text-text-gray text-sm hover:text-text mb-4 inline-block">
        ← Back to timeline
      </Link>

      <h1 className="font-serif text-2xl text-text mb-1">{item.title}</h1>
      {item.due_date && <p className="text-text-gray text-sm mb-6">Due {item.due_date}</p>}

      <div className="bg-card border border-border rounded-2xl p-5 mb-4">
        <p className="text-text font-medium text-sm mb-2">Why this matters</p>
        <p className="text-text-gray text-sm leading-relaxed">{item.why_text}</p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5 mb-6">
        <p className="text-text font-medium text-sm mb-2">What you can do</p>
        <ul className="space-y-1.5">
          {item.what_to_do.map((step, idx) => (
            <li key={idx} className="text-text-gray text-sm">
              {idx + 1}. {step}
            </li>
          ))}
        </ul>
      </div>

      <button
        onClick={completed ? handleMarkIncomplete : handleComplete}
        disabled={saving}
        className={`relative w-full rounded-xl transition-colors font-medium py-3 disabled:opacity-50 overflow-hidden ${
          completed
            ? "border border-border text-text-gray hover:text-text"
            : "bg-primary hover:bg-primary-hover text-bg"
        }`}
      >
        <AnimatePresence mode="wait" initial={false}>
          {completed ? (
            <motion.span
              key="completed"
              initial={{ opacity: 1, scale: 1 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="flex items-center justify-center gap-2"
            >
              <Check className="size-4" />
              {saving ? "Saving..." : "Completed — mark as incomplete"}
            </motion.span>
          ) : (
            <motion.span key="pending" exit={{ opacity: 0 }}>
              {saving ? "Saving..." : "Mark as Complete"}
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    </motion.div>
  );
}
