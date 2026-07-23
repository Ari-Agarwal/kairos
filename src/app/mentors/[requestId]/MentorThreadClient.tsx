"use client";

import { useState } from "react";
import ReportBlockMenu from "@/components/ReportBlockMenu";

interface Message {
  id: string;
  sender_id: string;
  body: string;
  message_type?: "chat" | "review_feedback";
  created_at: string;
}

export default function MentorThreadClient({
  requestId,
  schoolName,
  initialMessages,
  currentUserId,
  otherUserId,
  isMentor,
}: {
  requestId: string;
  schoolName: string;
  initialMessages: Message[];
  currentUserId: string;
  otherUserId: string;
  isMentor: boolean;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Application-review-style feedback (Software_Timeline.md Section 1, item 4):
  // a mentor can tag a message as structured review feedback, distinct from
  // ordinary back-and-forth chat, without leaving this same accepted thread.
  const [reviewMode, setReviewMode] = useState(false);

  async function send() {
    if (!body.trim()) return;
    setSending(true);
    setError(null);
    const messageType = isMentor && reviewMode ? "review_feedback" : "chat";
    const res = await fetch("/api/mentor/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, body, messageType }),
    });
    setSending(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Couldn't send message.");
      return;
    }
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), sender_id: currentUserId, body, message_type: messageType, created_at: new Date().toISOString() },
    ]);
    setBody("");
  }

  return (
    <div className="px-5 md:px-8 py-8 max-w-2xl mx-auto w-full">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-serif text-xl text-text">{schoolName}</h1>
        <ReportBlockMenu targetUserId={otherUserId} contentType="mentor_thread" contentId={requestId} />
      </div>

      <div className="space-y-3 mb-4">
        {messages.map((m) => (
          <div key={m.id} className={m.sender_id === currentUserId ? "ml-auto max-w-[80%]" : "max-w-[80%]"}>
            {m.message_type === "review_feedback" && (
              <p className="text-xs text-premium font-medium mb-1">Application review feedback</p>
            )}
            <div
              className={`rounded-2xl p-3 text-sm ${
                m.message_type === "review_feedback"
                  ? "bg-premium-tint border border-premium text-text"
                  : m.sender_id === currentUserId
                    ? "bg-primary text-bg"
                    : "bg-card border border-border text-text"
              }`}
            >
              {m.body}
            </div>
          </div>
        ))}
        {messages.length === 0 && <p className="text-text-gray text-sm">No messages yet — say hello.</p>}
      </div>

      {isMentor && (
        <label className="flex items-center gap-2 mb-2 text-sm text-text-gray">
          <input type="checkbox" checked={reviewMode} onChange={(e) => setReviewMode(e.target.checked)} />
          Send as application review feedback (not just chat)
        </label>
      )}

      <div className="flex gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          placeholder={reviewMode ? "Share specific feedback on their application approach…" : "Write a message…"}
          className="flex-1 rounded-xl bg-card border border-border px-4 py-2.5 text-text outline-none focus:border-primary text-sm"
        />
        <button
          onClick={send}
          disabled={sending || !body.trim()}
          className="rounded-xl bg-primary hover:bg-primary-hover transition-colors text-bg font-medium px-4 py-2 disabled:opacity-50 self-end"
        >
          Send
        </button>
      </div>
      {error && <p className="text-red text-sm mt-2">{error}</p>}
    </div>
  );
}
