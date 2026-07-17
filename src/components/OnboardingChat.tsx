"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { track } from "@/lib/analytics";

interface DraftFields {
  full_name?: string;
  grade_level?: string;
  unweighted_gpa?: number;
  weighted_gpa?: number;
  current_school?: string;
  intended_major?: string[];
  interests?: string;
  extracurriculars?: string[];
  sat_score?: number;
  act_score?: number;
  no_test_yet?: boolean;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const GRADE_LEVELS = ["Freshman", "Sophomore", "Junior", "Senior"];

function isDraftComplete(d: DraftFields): boolean {
  return !!(
    d.grade_level &&
    GRADE_LEVELS.includes(d.grade_level) &&
    d.unweighted_gpa !== undefined &&
    d.current_school &&
    d.intended_major && d.intended_major.length > 0 &&
    d.extracurriculars && d.extracurriculars.length > 0 &&
    (d.no_test_yet || d.sat_score !== undefined || d.act_score !== undefined)
  );
}

export default function OnboardingChat({ onCancel }: { onCancel: () => void }) {
  const router = useRouter();
  const supabase = createClient();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hi! Let's get your profile started -- what's your name, and what grade are you in?",
    },
  ]);
  const [draft, setDraft] = useState<DraftFields>({});
  const [readyToSubmit, setReadyToSubmit] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    track("onboarding_chat_started");
  }, []);

  async function sendMessage() {
    const trimmed = input.trim();
    if (!trimmed || sending) return;
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Something went wrong. Please try again.");
        setSending(false);
        return;
      }
      setDraft(body.fields ?? {});
      setReadyToSubmit(!!body.ready_to_submit && isDraftComplete(body.fields ?? {}));
      setMessages((prev) => [...prev, { role: "assistant", content: body.reply_to_student }]);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  }

  async function handleComplete() {
    setSubmitting(true);
    setError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    if (draft.full_name) {
      await supabase.auth.updateUser({ data: { full_name: draft.full_name } });
    }
    const { error: insertError } = await supabase.from("profiles").insert({
      user_id: user.id,
      grade_level: draft.grade_level,
      unweighted_gpa: draft.unweighted_gpa,
      weighted_gpa: draft.weighted_gpa ?? draft.unweighted_gpa,
      intended_major: draft.intended_major,
      interests: draft.interests || null,
      current_school: draft.current_school,
      extracurriculars: draft.extracurriculars && draft.extracurriculars.length > 0 ? draft.extracurriculars : null,
      sat_score: draft.sat_score ?? null,
      act_score: draft.act_score ?? null,
    });
    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }
    fetch("/api/email/welcome", { method: "POST" }).catch(() => {});
    track("onboarding_completed", { via: "chat" });
    router.push("/matches");
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-4 flex flex-col h-[520px]">
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 mb-3 pr-1">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-xl px-3.5 py-2 text-sm ${
              m.role === "user"
                ? "ml-auto bg-primary text-bg"
                : "bg-bg border border-border text-text"
            }`}
          >
            {m.content}
          </div>
        ))}
        {sending && (
          <div className="bg-bg border border-border text-text-gray rounded-xl px-3.5 py-2 text-sm w-fit">
            Thinking...
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="text-red text-sm mb-2">
          {error}
        </p>
      )}

      {readyToSubmit ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleComplete}
            disabled={submitting}
            className="flex-1 rounded-xl bg-primary hover:bg-primary-hover transition-colors text-bg font-medium py-2.5 disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Looks good, complete my profile"}
          </button>
          <button
            type="button"
            onClick={() => setReadyToSubmit(false)}
            className="rounded-xl border border-border text-text-gray hover:text-text px-4"
          >
            Keep chatting
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Type your reply..."
            disabled={sending || submitting}
            className="flex-1 rounded-xl bg-bg border border-border px-4 py-2.5 text-text outline-none focus:border-primary transition-colors"
          />
          <button
            type="button"
            onClick={sendMessage}
            disabled={sending || submitting || !input.trim()}
            className="rounded-xl bg-primary hover:bg-primary-hover transition-colors text-bg font-medium px-4 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={onCancel}
        className="text-text-gray hover:text-text text-xs underline underline-offset-2 mt-3 self-center"
      >
        Switch back to the form
      </button>
    </div>
  );
}
