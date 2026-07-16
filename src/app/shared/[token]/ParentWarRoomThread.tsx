"use client";

import { useState } from "react";

interface Comment {
  id: string;
  role: string;
  body: string;
  created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  student: "Student",
  parent: "You",
  mentor: "Mentor",
  counselor: "Counselor",
};

export default function ParentWarRoomThread({ token, schoolMatchId }: { token: string; schoolMatchId: string }) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/war-room/parent/${token}/${schoolMatchId}`);
    setLoading(false);
    if (!res.ok) {
      setError("Couldn't load the war room.");
      return;
    }
    setComments((await res.json()).comments);
  }

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && comments === null) await load();
  }

  async function send() {
    if (!body.trim()) return;
    setSending(true);
    setError(null);
    const res = await fetch(`/api/war-room/parent/${token}/${schoolMatchId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    setSending(false);
    if (!res.ok) {
      setError("Couldn't post your comment.");
      return;
    }
    setComments((prev) => [...(prev ?? []), { id: crypto.randomUUID(), role: "parent", body, created_at: new Date().toISOString() }]);
    setBody("");
  }

  return (
    <div>
      <button onClick={toggle} className="text-primary hover:text-primary-hover text-sm underline underline-offset-2">
        {open ? "Hide war room" : "Open war room"}
      </button>
      {open && (
        <div className="mt-3 bg-bg border border-border rounded-xl p-3">
          {loading && <p className="text-text-gray text-sm">Loading…</p>}
          {comments && comments.length === 0 && <p className="text-text-gray text-sm">No comments yet.</p>}
          {comments && comments.length > 0 && (
            <div className="space-y-2 mb-3">
              {comments.map((c) => (
                <div key={c.id} className="text-sm">
                  <span className="text-text-gray text-xs">{ROLE_LABELS[c.role] ?? c.role}: </span>
                  <span className="text-text">{c.body}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Add a comment…"
              className="flex-1 rounded-lg bg-card border border-border px-3 py-2 text-text outline-none focus:border-primary text-sm"
            />
            <button
              onClick={send}
              disabled={sending || !body.trim()}
              className="rounded-lg bg-primary hover:bg-primary-hover transition-colors text-bg text-sm font-medium px-3 py-2 disabled:opacity-50"
            >
              Send
            </button>
          </div>
          {error && <p className="text-red text-xs mt-2">{error}</p>}
        </div>
      )}
    </div>
  );
}
