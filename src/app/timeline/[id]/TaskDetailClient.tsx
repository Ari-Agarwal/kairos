"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Check, CalendarPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { buildSingleIcs, downloadIcs, googleCalendarUrl } from "@/lib/ics";

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

function formatDue(due: string): string {
  const d = new Date(`${due}T00:00:00`);
  if (Number.isNaN(d.getTime())) return due;
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

export default function TaskDetailClient({ item }: { item: TimelineItem }) {
  const router = useRouter();
  const supabase = createClient();
  const [completed, setCompleted] = useState(item.completed);
  const [saving, setSaving] = useState(false);

  async function handleComplete() {
    setSaving(true);
    await supabase.from("timeline_items").update({ completed: true }).eq("id", item.id);

    if (item.profile_sync_field) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("profiles").update({ [item.profile_sync_field]: true }).eq("user_id", user.id);
      }
    }

    setCompleted(true);
    setSaving(false);
    router.refresh();
  }

  async function handleMarkIncomplete() {
    setSaving(true);
    await supabase.from("timeline_items").update({ completed: false }).eq("id", item.id);
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
      <Link href="/timeline" className="text-text-gray text-sm hover:text-text mb-6 inline-flex items-center gap-1">
        <span aria-hidden>←</span> Back to your application journey
      </Link>

      <div className="mb-1">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-primary/70 mb-2">Step on your timeline</p>
        <h1 className="font-serif text-2xl text-text">{item.title}</h1>
      </div>

      {item.due_date ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 mb-6">
          <p className="text-text-gray text-sm">Due {formatDue(item.due_date)}</p>
          <button
            onClick={() => downloadIcs(
              buildSingleIcs({ id: item.id, title: item.title, due_date: item.due_date!, why_text: item.why_text }),
              `kairos-${item.id}.ics`
            )}
            className="flex items-center gap-1 text-text-gray hover:text-text text-xs transition-colors"
            title="Download .ics — works with Apple Calendar, Outlook, and any calendar app"
          >
            <CalendarPlus className="size-3.5" /> Apple / Outlook
          </button>
          <a
            href={googleCalendarUrl({ id: item.id, title: item.title, due_date: item.due_date!, why_text: item.why_text })}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-text-gray hover:text-text text-xs transition-colors"
            title="Add to Google Calendar"
          >
            <CalendarPlus className="size-3.5" /> Google Calendar
          </a>
        </div>
      ) : (
        <div className="mb-6" />
      )}

      <div className="bg-card border border-border rounded-2xl p-5 mb-4">
        <p className="text-text font-medium text-sm mb-2">Why this matters for your application</p>
        <p className="text-text-gray text-sm leading-relaxed">{item.why_text}</p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5 mb-6">
        <p className="text-text font-medium text-sm mb-3">How to handle this</p>
        <ol className="space-y-2">
          {item.what_to_do.map((step, idx) => (
            <li key={idx} className="flex gap-2.5 text-text-gray text-sm">
              <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold flex items-center justify-center mt-0.5">
                {idx + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      {/COMMON APP|APPLICATION|ESSAY|RECOMMEND|TRANSCRIPT|SUBMIT/i.test(item.title) && (
        <a
          href="https://apply.commonapp.org/dashboard"
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center text-primary hover:text-primary-hover text-sm underline underline-offset-2 mb-6 -mt-3"
        >
          Continue in Common App →
        </a>
      )}

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
