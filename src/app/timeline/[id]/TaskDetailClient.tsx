"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

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
    await supabase.from("timeline_items").update({ completed: true }).eq("id", item.id);

    if (item.profile_sync_field) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("profiles")
          .update({ [item.profile_sync_field]: true })
          .eq("user_id", user.id);
      }
    }

    setCompleted(true);
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="px-5 md:px-8 py-8 max-w-2xl mx-auto w-full">
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
        onClick={handleComplete}
        disabled={completed || saving}
        className="w-full rounded-xl bg-primary hover:bg-primary-hover transition-colors text-white font-medium py-3 disabled:opacity-50"
      >
        {completed ? "Completed" : saving ? "Saving..." : "Mark as Complete"}
      </button>
    </div>
  );
}
