"use client";

import { useState } from "react";

interface Props {
  matchId: string;
  onClose: () => void;
}

export default function LociModal({ matchId, onClose }: Props) {
  const [updates, setUpdates] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ letter: string; caveat: string; school: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleDraft() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/outcomes/letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ school_match_id: matchId, updates: updates || null }),
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
      aria-label="Draft letter of continued interest"
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/60 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
        <p className="font-serif text-lg text-text">Draft a letter of continued interest</p>

        {!result ? (
          <>
            <p className="text-text-gray text-sm">
              Add any meaningful updates since you applied — new grades, awards, leadership roles, or other concrete developments. Leave blank if you have no updates.
            </p>
            <textarea
              placeholder="e.g. I earned a 4.0 this semester and was elected president of my robotics club in March."
              value={updates}
              onChange={(e) => setUpdates(e.target.value)}
              maxLength={2000}
              rows={4}
              className="w-full rounded-xl bg-bg border border-border px-4 py-2.5 text-text outline-none focus:border-primary resize-none text-sm"
            />
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
                disabled={loading}
                className="flex-1 rounded-xl bg-primary hover:bg-primary-hover text-bg text-sm font-medium py-2.5 transition-colors disabled:opacity-40"
              >
                {loading ? "Drafting…" : "Draft letter"}
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
              AI-generated draft based on your profile. Review and edit before sending — you know your story better than any AI does.
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
