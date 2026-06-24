"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

interface TimelineItem {
  id: string;
  title: string;
  due_date: string | null;
  school_tags: string[];
  tier: "free" | "premium";
  is_strategic: boolean;
  completed: boolean;
  why_text: string;
}

export default function TimelineClient({
  items,
  isPremium,
  youAreHereId,
}: {
  items: TimelineItem[];
  isPremium: boolean;
  youAreHereId: string | null;
}) {
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

  if (generating) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center min-h-[60vh]">
        <p className="font-serif text-2xl text-text mb-2 animate-pulse">Mapping out your timeline...</p>
        <p className="text-text-gray text-sm">Pulling together deadlines and strategic advice.</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center min-h-[60vh]">
        {error && <p className="text-red text-sm mb-3">{error}</p>}
        <p className="text-text-gray text-sm mb-4">No timeline yet.</p>
        <button onClick={handleGenerate} className="rounded-xl bg-primary hover:bg-primary-hover text-white font-medium px-6 py-2.5">
          Generate Timeline
        </button>
      </div>
    );
  }

  return (
    <div className="px-5 md:px-8 py-8 max-w-2xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl text-text">Your Timeline</h1>
        <button onClick={handleGenerate} className="text-primary text-sm hover:text-primary-hover">
          Regenerate
        </button>
      </div>
      {error && <p className="text-red text-sm mb-4">{error}</p>}

      <div className="relative pl-8">
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
        {items.map((item) => {
          const isHere = item.id === youAreHereId;
          const locked = item.is_strategic && !isPremium;
          return (
            <motion.div
              key={item.id}
              className="relative mb-5"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {isHere ? (
                <motion.div
                  className="absolute -left-8 top-1.5 w-3.5 h-3.5 rounded-full bg-amber border-2 border-amber"
                  animate={{ boxShadow: ["0 0 0 0 rgba(212,162,76,0.5)", "0 0 0 6px rgba(212,162,76,0)"] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
                />
              ) : (
                <div
                  className={`absolute -left-8 top-1.5 w-3.5 h-3.5 rounded-full border-2 ${
                    item.completed ? "bg-green border-green" : "bg-bg border-border"
                  }`}
                />
              )}
              <Link
                href={locked ? "/upgrade" : `/timeline/${item.id}`}
                className={`block rounded-2xl p-4 border ${
                  item.is_strategic
                    ? "bg-premium-tint border-dashed border-premium"
                    : "bg-card border-border"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className={`font-medium text-sm ${item.completed ? "text-text-gray line-through" : "text-text"}`}>
                    {item.title}
                  </p>
                  {item.is_strategic && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-premium text-white">
                      PREMIUM
                    </span>
                  )}
                </div>
                {item.due_date && <p className="text-text-gray text-xs mb-1">Due {item.due_date}</p>}
                {isHere && <p className="text-amber text-xs font-medium mb-1">You are here</p>}
                {locked ? (
                  <p className="text-text-gray text-xs italic">
                    Unlock Premium to see this and other tailored guidance
                  </p>
                ) : (
                  <p className="text-text-gray text-xs">{item.why_text}</p>
                )}
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
