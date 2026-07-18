"use client";

import { useState } from "react";

export default function SendReminderButton({ studentUserId }: { studentUserId: string }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sentAt, setSentAt] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function handleSend() {
    if (!message.trim()) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/counselor/send-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentUserId, message: message.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send reminder.");
    } catch (err) {
      setSending(false);
      setError(err instanceof Error ? err.message : "Failed to send reminder. Please try again.");
      return;
    }
    setSending(false);
    setSentAt(Date.now());
    setMessage("");
    setTimeout(() => setOpen(false), 1200);
  }

  if (!open) {
    return (
      <button
        onClick={() => {
          setOpen(true);
          setSentAt(null);
        }}
        className="shrink-0 text-sm font-medium px-3.5 py-2 rounded-xl border border-border text-text-gray hover:text-text hover:border-primary/40 transition-colors"
      >
        Send Reminder
      </button>
    );
  }

  return (
    <div className="shrink-0 w-full sm:w-64 bg-card border border-border rounded-2xl p-3">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
        aria-label="Reminder message"
        placeholder="e.g. Don't forget your FAFSA is due Oct 1..."
        className="w-full rounded-lg bg-bg border border-border px-3 py-2 text-text text-sm outline-none focus:border-primary resize-none mb-2"
      />
      {error && <p role="alert" className="text-red text-xs mb-2">{error}</p>}
      {sentAt && <p role="status" className="text-green text-xs mb-2">Reminder sent.</p>}
      <div className="flex gap-2">
        <button
          onClick={handleSend}
          disabled={sending || !message.trim()}
          className="flex-1 rounded-lg bg-primary hover:bg-primary-hover transition-colors text-bg text-xs font-medium px-3 py-2 disabled:opacity-40"
        >
          {sending ? "Sending..." : "Send"}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="text-text-gray hover:text-text text-xs px-2"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
