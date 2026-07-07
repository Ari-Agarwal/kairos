"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function formatDue(due: string): string {
  const d = new Date(`${due}T00:00:00`);
  if (Number.isNaN(d.getTime())) return due;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatTestScores(scores: Record<string, unknown> | null): string | null {
  if (!scores) return null;
  if (typeof scores.summary === "string") return scores.summary;
  const parts = Object.entries(scores).map(([key, value]) => `${key}: ${value}`);
  return parts.length ? parts.join(", ") : null;
}

interface Profile {
  grade_level: string;
  unweighted_gpa: number;
  weighted_gpa: number;
  intended_major: string | null;
  extracurriculars: string[] | null;
  schools_already_considering: string | null;
  test_scores: Record<string, unknown> | null;
}

interface Match {
  id: string;
  school_name: string;
  category: "reach" | "target" | "safety";
  percentage: number;
  why_text: string;
  factors: Record<string, string>;
}

interface TimelineItem {
  id: string;
  title: string;
  due_date: string | null;
  completed: boolean;
  why_text: string;
  what_to_do: string[];
}

const TABS = ["Profile", "School Matches", "Timeline", "Counselor Notes"] as const;
type Tab = (typeof TABS)[number];

const CATEGORY_STYLES: Record<string, string> = {
  reach: "bg-red-tint text-red",
  target: "bg-amber-tint text-amber-text-on-tint",
  safety: "bg-green-tint text-green",
};

export default function StudentDetailClient({
  studentName,
  profile,
  matches,
  timelineItems,
  counselorId,
  studentUserId,
  initialNoteText,
}: {
  studentName: string;
  profile: Profile;
  matches: Match[];
  timelineItems: TimelineItem[];
  counselorId: string;
  studentUserId: string;
  initialNoteText: string;
}) {
  const [tab, setTab] = useState<Tab>("Profile");
  const today = new Date().toISOString().slice(0, 10);
  const overdueCount = timelineItems.filter((i) => !i.completed && i.due_date && i.due_date < today).length;

  return (
    <div className="px-5 md:px-8 py-8 max-w-3xl mx-auto w-full">
      <Link href="/counselor" className="text-text-gray text-sm hover:text-text mb-4 inline-block">
        ← Back to roster
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-1">
        <h1 className="font-serif text-2xl text-text">{studentName}</h1>
        <SendReminderButton counselorId={counselorId} studentUserId={studentUserId} />
      </div>
      <p className="text-text-gray text-sm mb-6">
        {profile.grade_level} · GPA {profile.unweighted_gpa} unweighted / {profile.weighted_gpa} weighted · {profile.intended_major || "Major undecided"}
      </p>

      <div className="flex gap-1 mb-6 bg-card border border-border rounded-xl p-1 w-fit overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`relative text-sm px-3.5 py-2 rounded-lg whitespace-nowrap transition-colors ${
              tab === t ? "bg-primary text-bg" : "text-text-gray hover:text-text"
            }`}
          >
            {t}
            {t === "Timeline" && overdueCount > 0 && (
              <span
                className={`ml-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                  tab === t ? "bg-bg/10 text-bg" : "bg-red-tint text-red"
                }`}
              >
                {overdueCount} overdue
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "Profile" && <ProfileTab profile={profile} />}
      {tab === "School Matches" && <MatchesTab matches={matches} />}
      {tab === "Timeline" && <TimelineTab items={timelineItems} today={today} />}
      {tab === "Counselor Notes" && (
        <NotesTab counselorId={counselorId} studentUserId={studentUserId} initialNoteText={initialNoteText} />
      )}
    </div>
  );
}

function SendReminderButton({ counselorId, studentUserId }: { counselorId: string; studentUserId: string }) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sentAt, setSentAt] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function handleSend() {
    if (!message.trim()) return;
    setSending(true);
    setError("");
    const { error: insertError } = await supabase
      .from("reminder_log")
      .insert({ counselor_id: counselorId, student_user_id: studentUserId, message_text: message.trim() });
    setSending(false);
    if (insertError) {
      setError("Failed to send reminder. Please try again.");
      return;
    }
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

function MissingTag() {
  return (
    <span className="inline-flex items-center gap-1 text-amber text-xs ml-2">
      <AlertTriangle className="w-3 h-3" /> Empty
    </span>
  );
}

function ProfileTab({ profile }: { profile: Profile }) {
  const rows: { label: string; value: string | null; isEmpty: boolean }[] = [
    { label: "Intended Major", value: profile.intended_major, isEmpty: !profile.intended_major },
    {
      label: "Extracurriculars",
      value: profile.extracurriculars?.join(", ") || null,
      isEmpty: !profile.extracurriculars?.length,
    },
    {
      label: "Schools Already Considering",
      value: profile.schools_already_considering,
      isEmpty: !profile.schools_already_considering,
    },
    {
      label: "Test Scores",
      value: formatTestScores(profile.test_scores),
      isEmpty: !profile.test_scores,
    },
  ];

  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
      {rows.map((r) => (
        <div key={r.label}>
          <p className="text-text font-medium text-sm">
            {r.label}
            {r.isEmpty && <MissingTag />}
          </p>
          <p className="text-text-gray text-sm">{r.value || "Not provided"}</p>
        </div>
      ))}
    </div>
  );
}

function MatchesTab({ matches }: { matches: Match[] }) {
  if (matches.length === 0) {
    return <p className="text-text-gray text-sm text-center py-10">No active school matches.</p>;
  }
  const grouped = ["reach", "target", "safety"] as const;
  return (
    <div className="space-y-6">
      {grouped.map((cat) => {
        const items = matches.filter((m) => m.category === cat);
        if (items.length === 0) return null;
        return (
          <div key={cat}>
            <p className="text-text-gray text-xs uppercase tracking-wide mb-2">{cat}</p>
            <div className="space-y-3">
              {items.map((m) => (
                <div key={m.id} className="bg-card border border-border rounded-2xl p-4">
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full mb-1 capitalize ${CATEGORY_STYLES[m.category]}`}>
                        {m.category}
                      </span>
                      <p className="font-serif text-lg text-text">{m.school_name}</p>
                    </div>
                    <span className="font-serif text-xl text-primary shrink-0">{m.percentage}%</span>
                  </div>
                  <p className="text-text-gray text-sm">{m.why_text}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TimelineTab({ items, today }: { items: TimelineItem[]; today: string }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (items.length === 0) {
    return <p className="text-text-gray text-sm text-center py-10">No timeline items yet.</p>;
  }

  return (
    <div className="relative pl-8">
      <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
      {items.map((item) => {
        const overdue = !item.completed && item.due_date && item.due_date < today;
        return (
          <div key={item.id} className="relative mb-4">
            <div
              className={`absolute -left-8 top-1.5 w-3.5 h-3.5 rounded-full border-2 ${
                item.completed
                  ? "bg-green border-green"
                  : overdue
                    ? "bg-red border-red"
                    : "bg-bg border-border"
              }`}
            />
            <button
              onClick={() => setExpanded(expanded === item.id ? null : item.id)}
              className={`block w-full text-left rounded-2xl p-4 border bg-card ${
                overdue ? "border-red" : "border-border"
              }`}
            >
              <p className={`font-medium text-sm ${item.completed ? "text-text-gray line-through" : "text-text"}`}>
                {item.title}
              </p>
              {item.due_date && (
                <p className={`text-xs mb-1 ${overdue ? "text-red" : "text-text-gray"}`}>
                  Due {formatDue(item.due_date)}
                  {overdue && " · Overdue"}
                </p>
              )}
              {expanded === item.id && (
                <div className="mt-2 pt-2 border-t border-border space-y-2">
                  <div>
                    <p className="text-text text-xs font-medium mb-0.5">Why this matters</p>
                    <p className="text-text-gray text-xs">{item.why_text}</p>
                  </div>
                  <div>
                    <p className="text-text text-xs font-medium mb-0.5">What to do</p>
                    <ul className="text-text-gray text-xs space-y-0.5">
                      {item.what_to_do.map((step, i) => (
                        <li key={i}>• {step}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}

function NotesTab({
  counselorId,
  studentUserId,
  initialNoteText,
}: {
  counselorId: string;
  studentUserId: string;
  initialNoteText: string;
}) {
  const supabase = createClient();
  const [text, setText] = useState(initialNoteText);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  async function handleBlur() {
    setSaving(true);
    await supabase
      .from("counselor_notes")
      .upsert(
        { counselor_id: counselorId, student_user_id: studentUserId, note_text: text, updated_at: new Date().toISOString() },
        { onConflict: "counselor_id,student_user_id" }
      );
    setSaving(false);
    setSavedAt(Date.now());
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <p className="text-text-gray text-xs mb-2">Visible only to you. Auto-saves when you click away.</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={handleBlur}
        rows={10}
        aria-label="Counselor notes"
        placeholder="Meeting notes, observations, flags..."
        className="w-full rounded-xl bg-bg border border-border px-4 py-3 text-text text-sm outline-none focus:border-primary resize-none"
      />
      {saving && <p role="status" className="text-text-gray text-xs mt-1">Saving...</p>}
      {!saving && savedAt && <p role="status" className="text-text-gray text-xs mt-1">Saved.</p>}
    </div>
  );
}
