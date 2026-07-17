"use client";

import { useRouter } from "next/navigation";

export default function GenerateTimelineCard() {
  const router = useRouter();

  return (
    <div className="h-full bg-card border border-border rounded-2xl px-6 py-7 min-h-[220px]">
      <p className="text-text-gray text-sm mb-4">Coming up on your timeline</p>
      <p className="text-text-gray text-sm mb-3">
        No timeline yet, generate one from your matched schools.
      </p>
      <button
        onClick={() => router.push("/timeline/prep")}
        className="rounded-xl bg-primary hover:bg-primary-hover transition-colors text-bg text-sm font-medium px-4 py-2"
      >
        Generate Timeline
      </button>
    </div>
  );
}
