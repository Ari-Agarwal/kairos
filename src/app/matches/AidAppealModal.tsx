"use client";

import { useState } from "react";

interface Match {
  id: string;
  school_name: string;
}

interface Props {
  matchId: string;
  matches: Match[];
  aidOffers: Record<string, number>;
  onClose: () => void;
}

export default function AidAppealModal({ matchId, matches, aidOffers, onClose }: Props) {
  const [compareId, setCompareId] = useState("");
  const [circumstances, setCircumstances] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ letter: string; caveat: string; appeal_school: string; compare_school: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleDraft() {
    if (!compareId) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/outcomes/appeal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appeal_school_match_id: matchId,
          compare_school_match_id: compareId,
          circumstances: circumstances || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to generate letter. Please try again.");
        return;
      }
      setResult(data);
    } catch {
      setError("Failed to generate letter. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!result) return;
    await navigator.clipboard.writeText(result.letter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Draft aid appeal letter"
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/60 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
        <p className="font-serif text-lg text-text">Draft a financial aid appeal</p>

        {!result ? (
          <>
            <p className="text-text-gray text-sm">
              Pick the school whose offer you&apos;re using as leverage, then optionally describe any special circumstances (job loss, medical expenses, additional siblings in college, etc.).
            </p>

            <div>
              <label className="text-text-gray text-xs block mb-1">Comparison school (better offer)</label>
              <select
                value={compareId}
                onChange={(e) => setCompareId(e.target.value)}
                className="w-full rounded-xl bg-bg border border-border px-4 py-2.5 text-text outline-none focus:border-primary"
              >
                <option value="">Select a school…</option>
                {matches
                  .filter((m) => m.id !== matchId && aidOffers[m.id] !== undefined)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.school_name} (${Number(aidOffers[m.id]).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="text-text-gray text-xs block mb-1">Special circumstances (optional)</label>
              <textarea
                placeholder="e.g. My parent was laid off in January; we have two siblings in college simultaneously."
                value={circumstances}
                onChange={(e) => setCircumstances(e.target.value)}
                maxLength={2000}
                rows={3}
                className="w-full rounded-xl bg-bg border border-border px-4 py-2.5 text-text outline-none focus:border-primary resize-none text-sm"
              />
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
                onClick={handleDraft}
                disabled={loading || !compareId}
                className="flex-1 rounded-xl bg-primary hover:bg-primary-hover text-bg text-sm font-medium py-2.5 transition-colors disabled:opacity-40"
              >
                {loading ? "Drafting…" : "Draft appeal"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="bg-bg border border-border rounded-xl p-4 text-text text-sm whitespace-pre-wrap leading-relaxed">
              {result.letter}
            </div>
            <div className="bg-amber-tint border border-amber/30 rounded-xl px-4 py-3 text-text-gray text-xs">
              <span className="text-amber font-medium">Before sending: </span>
              {result.caveat}
            </div>
            <p className="text-text-gray text-xs">
              AI-generated draft based on your logged aid figures — dollar amounts are taken directly from your records. Review carefully before sending.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => { setResult(null); setError(null); }}
                className="flex-1 rounded-xl border border-border text-text-gray hover:text-text text-sm font-medium py-2.5 transition-colors"
              >
                Redraft
              </button>
              <button
                onClick={handleCopy}
                className="flex-1 rounded-xl bg-primary hover:bg-primary-hover text-bg text-sm font-medium py-2.5 transition-colors"
              >
                {copied ? "Copied!" : "Copy to clipboard"}
              </button>
            </div>
            <button
              onClick={onClose}
              className="w-full rounded-xl border border-border text-text-gray hover:text-text text-sm font-medium py-2 transition-colors"
            >
              Close
            </button>
          </>
        )}
      </div>
    </div>
  );
}
