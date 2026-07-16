"use client";

import { useState } from "react";

interface Props {
  matchId: string;
  onClose: () => void;
  onSaved: (matchId: string, decision: string, aidAmount: string) => void;
}

export default function OutcomeLogModal({ matchId, onClose, onSaved }: Props) {
  const [decision, setDecision] = useState("accept");
  const [aid, setAid] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/outcomes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          school_match_id: matchId,
          decision_type: decision,
          aid_offer_amount: aid !== "" ? aid : null,
          decided_at: date,
          notes: notes || null,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Failed to save. Please try again.");
        return;
      }
      onSaved(matchId, decision, aid);
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Log decision"
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/60 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md space-y-4">
        <p className="font-serif text-lg text-text">Log decision</p>

        <div className="space-y-3">
          <div>
            <label className="text-text-gray text-xs block mb-1">Decision</label>
            <select
              value={decision}
              onChange={(e) => setDecision(e.target.value)}
              className="w-full rounded-xl bg-bg border border-border px-4 py-2.5 text-text outline-none focus:border-primary capitalize"
            >
              <option value="accept">Accepted</option>
              <option value="reject">Rejected</option>
              <option value="waitlist">Waitlisted</option>
              <option value="defer">Deferred</option>
            </select>
          </div>

          <div>
            <label className="text-text-gray text-xs block mb-1">Decision date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl bg-bg border border-border px-4 py-2.5 text-text outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="text-text-gray text-xs block mb-1">Aid offer (optional)</label>
            <input
              type="number"
              min="0"
              placeholder="e.g. 24000"
              value={aid}
              onChange={(e) => setAid(e.target.value)}
              className="w-full rounded-xl bg-bg border border-border px-4 py-2.5 text-text outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="text-text-gray text-xs block mb-1">Notes (optional)</label>
            <textarea
              placeholder="Anything worth remembering about this decision…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={1000}
              rows={3}
              className="w-full rounded-xl bg-bg border border-border px-4 py-2.5 text-text outline-none focus:border-primary resize-none"
            />
          </div>
        </div>

        {error && <p role="alert" className="text-red text-sm">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-border text-text-gray hover:text-text text-sm font-medium py-2.5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !date}
            className="flex-1 rounded-xl bg-primary hover:bg-primary-hover text-bg text-sm font-medium py-2.5 transition-colors disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
