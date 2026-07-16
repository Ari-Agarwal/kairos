"use client";

import { useState } from "react";

export default function TalkingPointsClient({ token }: { token: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ talking_points: string[]; closing_note: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/recommendations/${token}/talking-points`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError((body as { error?: string }).error ?? "Failed to generate talking points.");
        return;
      }
      const data = await res.json();
      setResult(data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <div className="space-y-3">
        {result.talking_points.map((point, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-4 flex gap-3">
            <span className="text-amber font-medium text-sm shrink-0 mt-0.5">{i + 1}.</span>
            <p className="text-text text-sm leading-relaxed">{point}</p>
          </div>
        ))}
        {result.closing_note && (
          <div className="bg-card border border-amber/20 rounded-xl p-4">
            <p className="text-amber text-xs uppercase tracking-widest mb-1">A note to keep in mind</p>
            <p className="text-text-gray text-sm leading-relaxed">{result.closing_note}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-6 text-center">
      {error && <p role="alert" className="text-red text-sm mb-4">{error}</p>}
      <p className="text-text-gray text-sm mb-4">
        Generate personalized talking points based on the brag sheet above.
      </p>
      <button
        onClick={generate}
        disabled={loading}
        className="rounded-xl bg-amber hover:opacity-90 transition-opacity text-bg font-medium px-6 py-2.5 text-sm disabled:opacity-50"
      >
        {loading ? "Generating…" : "Generate Talking Points"}
      </button>
    </div>
  );
}
