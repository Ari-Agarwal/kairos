"use client";

import { useState } from "react";

interface Reaction {
  reaction: "up" | "down" | null;
  comment: string | null;
}

export default function ReactionPanel({
  token,
  schoolMatchId,
  initial,
}: {
  token: string;
  schoolMatchId: string;
  initial: Reaction | null;
}) {
  const [reaction, setReaction] = useState<"up" | "down" | null>(initial?.reaction ?? null);
  const [comment, setComment] = useState(initial?.comment ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function save(nextReaction: "up" | "down" | null, nextComment: string) {
    setStatus("saving");
    try {
      const res = await fetch(`/api/shared/${token}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          school_match_id: schoolMatchId,
          reaction: nextReaction,
          comment: nextComment.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("failed");
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }

  function toggleReaction(value: "up" | "down") {
    const next = reaction === value ? null : value;
    setReaction(next);
    save(next, comment);
  }

  function submitComment(e: React.FormEvent) {
    e.preventDefault();
    save(reaction, comment);
  }

  return (
    <div className="border-t border-border pt-3 mt-1">
      <div className="flex items-center gap-2 mb-2">
        <button
          type="button"
          onClick={() => toggleReaction("up")}
          aria-pressed={reaction === "up"}
          className={`text-lg px-2 py-1 rounded-lg transition-colors ${reaction === "up" ? "bg-green-tint" : "hover:bg-border/40"}`}
          aria-label="We like this one"
        >
          👍
        </button>
        <button
          type="button"
          onClick={() => toggleReaction("down")}
          aria-pressed={reaction === "down"}
          className={`text-lg px-2 py-1 rounded-lg transition-colors ${reaction === "down" ? "bg-red-tint" : "hover:bg-border/40"}`}
          aria-label="Not feeling this one"
        >
          👎
        </button>
        {status === "saving" && <span className="text-text-gray text-xs">Saving…</span>}
        {status === "saved" && <span className="text-text-gray text-xs">Saved</span>}
        {status === "error" && <span className="text-red text-xs">Couldn&apos;t save — try again</span>}
      </div>
      <form onSubmit={submitComment} className="flex items-center gap-2">
        <input
          type="text"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={500}
          placeholder="Leave a short note (e.g. &quot;we love this one&quot;)"
          className="flex-1 min-w-0 rounded-lg border border-border bg-bg px-3 py-1.5 text-sm text-text placeholder:text-text-gray"
        />
        <button
          type="submit"
          className="shrink-0 rounded-lg bg-primary hover:bg-primary-hover text-bg text-xs px-3 py-1.5 font-medium transition-colors motion-reduce:transition-none"
        >
          Send
        </button>
      </form>
    </div>
  );
}
