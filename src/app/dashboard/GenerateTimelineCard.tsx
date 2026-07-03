"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import GenerationProgress from "@/components/GenerationProgress";

export default function GenerateTimelineCard() {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    const res = await fetch("/api/timeline/generate", { method: "POST" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to generate timeline.");
      setGenerating(false);
      return;
    }
    router.refresh();
    setGenerating(false);
  }

  return (
    <div className="bg-card border border-border rounded-2xl px-6 py-7 min-h-[220px]">
      <p className="text-text-gray text-sm mb-4">Coming up on your timeline</p>
      {generating ? (
        <div className="py-1">
          <p className="text-text-gray text-sm animate-pulse">Mapping out your timeline...</p>
          <GenerationProgress />
        </div>
      ) : (
        <>
          <p className="text-text-gray text-sm mb-3">
            No timeline yet — generate one from your matched schools.
          </p>
          {error && <p className="text-red text-xs mb-2">{error}</p>}
          <button
            onClick={handleGenerate}
            className="rounded-xl bg-primary hover:bg-primary-hover transition-colors text-bg text-sm font-medium px-4 py-2"
          >
            Generate Timeline
          </button>
        </>
      )}
    </div>
  );
}
