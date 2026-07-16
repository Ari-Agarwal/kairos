"use client";

import { useState } from "react";
import ReportBlockMenu from "@/components/ReportBlockMenu";

interface Message {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export default function MentorThreadClient({
  requestId,
  schoolName,
  initialMessages,
  currentUserId,
  otherUserId,
}: {
  requestId: string;
  schoolName: string;
  initialMessages: Message[];
  currentUserId: string;
  otherUserId: string;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (!body.trim()) return;
    setSending(true);
    setError(null);
    const res = await fetch("/api/mentor/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, body }),
    });
    setSending(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Couldn't send message.");
      return;
    }
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), sender_id: currentUserId, body, created_at: new Date().toISOString() }]);
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
          <div
            key={m.id}
            className={`rounded-2xl p-3 max-w-[80%] text-sm ${
              m.sender_id === currentUserId ? "bg-primary text-bg ml-auto" : "bg-card border border-border text-text"
            }`}
          >
            {m.body}
          </div>
        ))}
        {messages.length === 0 && <p className="text-text-gray text-sm">No messages yet — say hello.</p>}
      </div>

      <div className="flex gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          placeholder="Write a message…"
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
