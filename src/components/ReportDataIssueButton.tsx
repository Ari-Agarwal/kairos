"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Student-reported corrections (Software_Timeline.md 6g): a lightweight
// "this looks wrong" flag routed somewhere reviewable, rather than a student
// silently distrusting the platform after spotting a stale/wrong figure.
// Reuses the existing `reports` table (content_type/content_id/reason,
// already RLS-scoped to reporter-creates-and-reads-own) rather than a new
// table -- this is structurally the same "flag content for review" need the
// user-safety reports already serve, just a different content_type.
export default function ReportDataIssueButton({ contentType, label }: { contentType: string; label: string }) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function submit() {
    if (!reason.trim()) return;
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSubmitting(false);
      return;
    }
    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      content_type: contentType,
      reason: reason.trim().slice(0, 2000),
    });
    setSubmitting(false);
    if (!error) {
      setSubmitted(true);
      setReason("");
    }
  }

  if (submitted) {
    return <p className="text-text-gray text-xs">Thanks — flagged for review.</p>;
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-text-gray hover:text-text text-xs underline underline-offset-2">
        {label}
      </button>
    );
  }

  return (
    <div className="mt-1">
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        maxLength={2000}
        placeholder="What looks wrong?"
        className="w-full rounded-lg bg-bg border border-border px-3 py-2 text-text text-xs outline-none focus:border-primary resize-none mb-1.5"
      />
      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={submitting || !reason.trim()}
          className="rounded-lg bg-primary hover:bg-primary-hover transition-colors text-bg text-xs font-medium px-3 py-1.5 disabled:opacity-40"
        >
          {submitting ? "Sending…" : "Send"}
        </button>
        <button onClick={() => setOpen(false)} className="text-text-gray hover:text-text text-xs px-1">
          Cancel
        </button>
      </div>
    </div>
  );
}
