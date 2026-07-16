"use client";

import { useState, useEffect } from "react";

interface ReviewRequest {
  id: string;
  status: "pending" | "in_progress" | "completed";
  review_notes: string;
  created_at: string;
}

interface EligibilityData {
  requests: ReviewRequest[];
  usedThisCycle: number;
  remainingThisCycle: number;
}

const STATUS_LABEL: Record<ReviewRequest["status"], string> = {
  pending: "Pending — a counselor will reach out shortly",
  in_progress: "In progress",
  completed: "Completed",
};

export default function HumanReviewCard() {
  const [data, setData] = useState<EligibilityData | null>(null);
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/review-requests")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d && Array.isArray(d.requests) ? d : null))
      .catch(() => null);
  }, []);

  async function submit() {
    if (!notes.trim()) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/review-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ review_notes: notes }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Something went wrong.");
      setSubmitting(false);
      return;
    }
    // Refresh eligibility data.
    const updatedRes = await fetch("/api/review-requests");
    const updated = updatedRes.ok ? await updatedRes.json() : null;
    setData(updated && Array.isArray(updated.requests) ? updated : null);
    setOpen(false);
    setNotes("");
    setSubmitting(false);
  }

  const existing = data?.requests[0];
  const eligible = (data?.remainingThisCycle ?? 0) > 0;

  return (
    <div className="reveal bg-card border border-border rounded-2xl px-6 py-5" style={{ ["--reveal-delay" as string]: "0.24s" }}>
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <p className="text-text font-medium text-sm">AI + Human Review</p>
          <p className="text-text-gray text-xs mt-0.5">
            Get a real counselor&rsquo;s eyes on your application — once per admissions cycle.
          </p>
        </div>
        {data && (
          <span className={`shrink-0 text-xs font-medium px-2 py-1 rounded-full ${eligible ? "bg-amber-tint text-amber-text-on-tint" : "bg-card border border-border text-text-gray"}`}>
            {eligible ? "1 available" : "Used"}
          </span>
        )}
      </div>

      {existing && (
        <p className="text-text-gray text-xs mb-3 border-t border-border pt-3">
          {STATUS_LABEL[existing.status]}
        </p>
      )}

      {eligible && !open && (
        <button
          onClick={() => setOpen(true)}
          className="mt-2 w-full rounded-xl bg-primary hover:bg-primary-hover transition-colors text-bg font-medium text-sm px-4 py-2"
        >
          Request a human review
        </button>
      )}

      {open && (
        <div className="mt-3 space-y-3">
          <textarea
            className="w-full rounded-xl bg-bg border border-border text-text text-sm px-4 py-3 resize-none focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-text-gray"
            rows={4}
            maxLength={2000}
            placeholder="What would you like the counselor to focus on? (e.g. school list balance, essay positioning, timeline priorities)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          {error && <p role="alert" className="text-red text-xs">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => { setOpen(false); setError(null); }}
              className="flex-1 rounded-xl border border-border text-text-gray text-sm px-4 py-2 hover:border-primary/40 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={submitting || !notes.trim()}
              className="flex-1 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 transition-colors text-bg font-medium text-sm px-4 py-2"
            >
              {submitting ? "Submitting…" : "Submit"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
