"use client";

import { useState } from "react";
import { Flag, ShieldOff } from "lucide-react";

// Drop this into any surface where one user sees another user's content
// (e.g. mentor loop messages) -- Section 8's safety policy requires
// report + block available "from message one," not added later.
export default function ReportBlockMenu({
  targetUserId,
  contentType,
  contentId,
}: {
  targetUserId: string;
  contentType: string;
  contentId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"menu" | "report" | "done">("menu");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitReport() {
    if (!reason.trim()) {
      setError("Please describe what happened.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/safety/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportedUserId: targetUserId, contentType, contentId, reason }),
    });
    setSubmitting(false);
    if (!res.ok) {
      setError("Couldn't submit the report. Please try again.");
      return;
    }
    setMode("done");
  }

  async function submitBlock() {
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/safety/block", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blockedUserId: targetUserId }),
    });
    setSubmitting(false);
    if (!res.ok) {
      setError("Couldn't block this user. Please try again.");
      return;
    }
    setMode("done");
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-text-gray hover:text-text text-xs px-2 py-1"
        aria-label="Report or block"
      >
        •••
      </button>
    );
  }

  return (
    <div className="bg-bg border border-border rounded-xl p-3 text-sm">
      {mode === "menu" && (
        <div className="flex flex-col gap-1.5">
          <button
            onClick={() => setMode("report")}
            className="flex items-center gap-2 text-left text-text hover:text-primary px-2 py-1.5 rounded-lg"
          >
            <Flag size={14} /> Report
          </button>
          <button
            onClick={submitBlock}
            disabled={submitting}
            className="flex items-center gap-2 text-left text-text hover:text-red px-2 py-1.5 rounded-lg disabled:opacity-50"
          >
            <ShieldOff size={14} /> Block this user
          </button>
          <button onClick={() => setOpen(false)} className="text-text-gray text-xs px-2 py-1.5">
            Cancel
          </button>
        </div>
      )}
      {mode === "report" && (
        <div className="flex flex-col gap-2">
          <label htmlFor="report-reason" className="text-text-gray text-xs">
            What happened?
          </label>
          <textarea
            id="report-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="w-full rounded-lg bg-card border border-border px-3 py-2 text-text outline-none focus:border-primary text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={submitReport}
              disabled={submitting}
              className="rounded-lg bg-primary hover:bg-primary-hover transition-colors text-bg text-sm font-medium px-3 py-1.5 disabled:opacity-50"
            >
              Submit report
            </button>
            <button onClick={() => setMode("menu")} className="text-text-gray text-sm px-2 py-1.5">
              Back
            </button>
          </div>
        </div>
      )}
      {mode === "done" && <p className="text-text-gray text-sm">Thanks — we&apos;ve received this.</p>}
      {error && <p className="text-red text-xs mt-2">{error}</p>}
    </div>
  );
}
