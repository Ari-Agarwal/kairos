"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { AlertTriangle, FileDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import SendReminderButton from "@/components/SendReminderButton";

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
  intended_major: string[] | null;
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

const TABS = ["Profile", "School Matches", "Timeline", "Narrative & Essays", "Counselor Notes"] as const;
type Tab = (typeof TABS)[number];

interface NarrativeProfile {
  throughline: string | null;
  core_values: string[] | null;
  growth_arc: string | null;
  differentiator: string | null;
}

interface EssayHistoryEntry {
  id: string;
  school: string | null;
  created_at: string;
  is_rubric: boolean;
}

interface StudentNoteEntry {
  id: string;
  body: string;
  created_at: string;
}

interface ReviewRequestEntry {
  id: string;
  status: "pending" | "in_progress" | "completed";
  review_notes: string;
  created_at: string;
}

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
  initialStudentNotes,
  narrativeProfile,
  essayHistory,
  shareNarrativeWithCounselor,
  riskReasons,
  reviewRequests,
}: {
  studentName: string;
  profile: Profile;
  matches: Match[];
  timelineItems: TimelineItem[];
  counselorId: string;
  studentUserId: string;
  initialNoteText: string;
  initialStudentNotes: StudentNoteEntry[];
  narrativeProfile: NarrativeProfile | null;
  essayHistory: EssayHistoryEntry[];
  shareNarrativeWithCounselor: boolean;
  riskReasons: string[];
  reviewRequests: ReviewRequestEntry[];
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
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              downloadPrepSheet({
                studentName,
                profile,
                matches,
                timelineItems,
                today,
                narrativeProfile,
                essayHistory,
                shareNarrativeWithCounselor,
                riskReasons,
                reviewRequests,
                notes: initialStudentNotes,
              })
            }
            className="flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-xl border border-border text-text hover:border-primary transition-colors"
            title="Download a one-page prep sheet for your next meeting with this student"
          >
            <FileDown className="size-4" />
            Meeting prep sheet
          </button>
          <SendReminderButton studentUserId={studentUserId} />
        </div>
      </div>
      <p className="text-text-gray text-sm mb-6">
        {profile.grade_level} · GPA {profile.unweighted_gpa} unweighted / {profile.weighted_gpa} weighted · {profile.intended_major?.length ? profile.intended_major.join(", ") : "Major undecided"}
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
      {tab === "Narrative & Essays" && (
        <NarrativeEssaysTab
          narrativeProfile={narrativeProfile}
          essayHistory={essayHistory}
          studentUserId={studentUserId}
          shareNarrativeWithCounselor={shareNarrativeWithCounselor}
        />
      )}
      {tab === "Counselor Notes" && (
        <NotesTab
          counselorId={counselorId}
          studentUserId={studentUserId}
          initialNoteText={initialNoteText}
          initialStudentNotes={initialStudentNotes}
        />
      )}
    </div>
  );
}

// Counselor meeting-prep export (Software_Timeline.md 16): a one-click
// summary so the counselor doesn't have to re-derive "where is this student
// in the process" live in the meeting, and the student doesn't have to
// re-explain it. Plain-text .txt via Blob URL, same download pattern as
// lib/ics.ts's downloadIcs.
function buildPrepSheetText({
  studentName,
  profile,
  matches,
  timelineItems,
  today,
  narrativeProfile,
  essayHistory,
  shareNarrativeWithCounselor,
  riskReasons,
  reviewRequests,
  notes,
}: {
  studentName: string;
  profile: Profile;
  matches: Match[];
  timelineItems: TimelineItem[];
  today: string;
  narrativeProfile: NarrativeProfile | null;
  essayHistory: EssayHistoryEntry[];
  shareNarrativeWithCounselor: boolean;
  riskReasons: string[];
  reviewRequests: ReviewRequestEntry[];
  notes: StudentNoteEntry[];
}): string {
  const lines: string[] = [];
  const totalItems = timelineItems.length;
  const completedItems = timelineItems.filter((i) => i.completed).length;
  const completionPct = totalItems ? Math.round((completedItems / totalItems) * 100) : 0;
  const overdue = timelineItems.filter((i) => !i.completed && i.due_date && i.due_date < today);
  const upcoming = timelineItems
    .filter((i) => !i.completed && i.due_date && i.due_date >= today)
    .sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1))
    .slice(0, 5);

  lines.push(`MEETING PREP SHEET — ${studentName}`);
  lines.push(`Generated ${new Date().toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}`);
  lines.push("");
  lines.push(`Grade: ${profile.grade_level}`);
  lines.push(`GPA: ${profile.unweighted_gpa} unweighted / ${profile.weighted_gpa} weighted`);
  lines.push(`Intended major: ${profile.intended_major?.length ? profile.intended_major.join(", ") : "Undecided"}`);
  lines.push("");

  lines.push(`TIMELINE — ${completionPct}% complete (${completedItems}/${totalItems} items)`);
  if (overdue.length) {
    lines.push(`Overdue (${overdue.length}):`);
    for (const i of overdue) lines.push(`  - ${i.title} (was due ${i.due_date})`);
  } else {
    lines.push("Overdue: none");
  }
  if (upcoming.length) {
    lines.push("Upcoming:");
    for (const i of upcoming) lines.push(`  - ${i.title} (due ${i.due_date})`);
  }
  lines.push("");

  lines.push("SCHOOL MATCHES");
  const grouped = ["reach", "target", "safety"] as const;
  if (matches.length === 0) {
    lines.push("  No active school matches.");
  } else {
    for (const cat of grouped) {
      const items = matches.filter((m) => m.category === cat);
      if (!items.length) continue;
      lines.push(`  ${cat.toUpperCase()} (${items.length}): ${items.map((m) => m.school_name).join(", ")}`);
    }
  }
  lines.push("");

  lines.push("OPEN REVIEW REQUESTS");
  if (reviewRequests.length === 0) {
    lines.push("  None open.");
  } else {
    for (const r of reviewRequests) {
      lines.push(`  - [${r.status}] ${r.review_notes}`);
    }
  }
  lines.push("");

  lines.push("AT-RISK FLAGS");
  if (riskReasons.length === 0) {
    lines.push("  None currently flagged.");
  } else {
    for (const reason of riskReasons) lines.push(`  - ${reason}`);
  }
  lines.push("");

  // Only include narrative/essay content when the student has opted in
  // (profiles.share_narrative_with_counselor) -- these queries are already
  // RLS-scoped to that flag, so an empty/null result here also covers "not
  // shared," but we gate on the flag explicitly too since this is an export
  // a counselor may print or forward.
  if (shareNarrativeWithCounselor && (narrativeProfile?.throughline || essayHistory.length > 0)) {
    lines.push("NARRATIVE & ESSAYS (shared by student)");
    if (narrativeProfile?.throughline) {
      lines.push(`  Throughline: ${narrativeProfile.throughline}`);
    }
    if (essayHistory.length) {
      lines.push(`  Essay feedback sessions: ${essayHistory.length} (most recent ${essayHistory[0].school || "unspecified school"})`);
    }
    lines.push("");
  }

  if (notes.length > 0) {
    lines.push("RECENT COUNSELOR NOTES");
    for (const n of notes.slice(0, 5)) {
      lines.push(`  [${formatNoteTimestamp(n.created_at)}] ${n.body}`);
    }
  }

  return lines.join("\n");
}

function downloadPrepSheet(args: Parameters<typeof buildPrepSheetText>[0]): void {
  const content = buildPrepSheetText(args);
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `prep-sheet-${args.studentName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.txt`;
  a.click();
  URL.revokeObjectURL(url);
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
    { label: "Intended Major", value: profile.intended_major?.join(", ") || null, isEmpty: !profile.intended_major?.length },
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

function NarrativeEssaysTab({
  narrativeProfile,
  essayHistory,
  studentUserId,
  shareNarrativeWithCounselor,
}: {
  narrativeProfile: NarrativeProfile | null;
  essayHistory: EssayHistoryEntry[];
  studentUserId: string;
  shareNarrativeWithCounselor?: boolean;
}) {
  const hasNarrative = narrativeProfile?.throughline;
  const hasEssays = essayHistory.length > 0;

  if (!hasNarrative && !hasEssays) {
    return (
      <p className="text-text-gray text-sm text-center py-10">
        Nothing shared yet — a student opts into sharing their Narrative Builder throughline and essay
        feedback history from their Profile page.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <ApplicationReviewSection studentUserId={studentUserId} shareNarrativeWithCounselor={shareNarrativeWithCounselor} />
      {hasNarrative && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <p className="text-primary text-xs font-medium uppercase tracking-wide">Narrative throughline</p>
          <p className="font-serif text-lg text-text leading-snug">{narrativeProfile!.throughline}</p>
          {narrativeProfile!.core_values && narrativeProfile!.core_values!.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {narrativeProfile!.core_values!.map((v, i) => (
                <span key={i} className="text-xs text-text-gray bg-secondary-tint rounded-full px-2.5 py-1">
                  {v}
                </span>
              ))}
            </div>
          )}
          {narrativeProfile!.differentiator && (
            <p className="text-text-gray text-sm leading-relaxed">{narrativeProfile!.differentiator}</p>
          )}
        </div>
      )}
      {hasEssays && (
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-text font-medium text-sm mb-2">Essay feedback history</p>
          <div className="space-y-2">
            {essayHistory.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-3 py-1.5 border-b border-border last:border-b-0">
                <span className="text-text-gray text-sm">{e.school || "No school specified"}</span>
                <span className="text-text-gray text-xs shrink-0">
                  {new Date(e.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  {e.is_rubric ? " · rubric" : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface PackagingReview {
  overall_read: string;
  consistent_threads: string[];
  inconsistencies: string[];
  counselor_recommendation: string;
}

// Counselor-facing "how this application reads" AI review (Software_Timeline.md
// Section 17): reuses the essay-feedback rubric-mode machinery at the
// application/profile level. Gated on the same consent flag as the rest of
// this tab -- if the student hasn't opted in, we show a clear message rather
// than a disabled/broken button.
function ApplicationReviewSection({
  studentUserId,
  shareNarrativeWithCounselor,
}: {
  studentUserId: string;
  shareNarrativeWithCounselor?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<PackagingReview | null>(null);

  const handleRequest = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/counselor/application-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentUserId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Failed to generate packaging review.");
        return;
      }
      setReview(data);
    } catch {
      setError("Failed to generate packaging review.");
    } finally {
      setLoading(false);
    }
  }, [studentUserId]);

  if (!shareNarrativeWithCounselor) {
    return (
      <div className="bg-card border border-border rounded-2xl p-4">
        <p className="text-text font-medium text-sm mb-1">AI packaging review</p>
        <p className="text-text-gray text-sm">
          This student hasn&apos;t shared their narrative and essay work with you, so an AI packaging review
          isn&apos;t available yet.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-text font-medium text-sm">AI packaging review</p>
        <button
          onClick={handleRequest}
          disabled={loading}
          className="text-sm font-medium px-3.5 py-2 rounded-xl bg-primary text-bg disabled:opacity-50 shrink-0"
        >
          {loading ? "Reviewing..." : review ? "Regenerate review" : "Get AI packaging review"}
        </button>
      </div>
      <p className="text-text-gray text-xs">
        An AI second opinion on whether this student&apos;s narrative throughline comes through consistently
        across their essays and activities -- for your internal use, not shown to the student.
      </p>
      {error && <p className="text-red text-sm">{error}</p>}
      {review && (
        <div className="space-y-3 pt-2 border-t border-border">
          <div>
            <p className="text-text text-xs font-medium mb-0.5">Overall read</p>
            <p className="text-text-gray text-sm">{review.overall_read}</p>
          </div>
          {review.consistent_threads.length > 0 && (
            <div>
              <p className="text-green text-xs font-medium mb-0.5">Consistent threads</p>
              <ul className="text-text-gray text-sm space-y-0.5">
                {review.consistent_threads.map((t, i) => (
                  <li key={i}>• {t}</li>
                ))}
              </ul>
            </div>
          )}
          {review.inconsistencies.length > 0 && (
            <div>
              <p className="text-red text-xs font-medium mb-0.5">Inconsistencies</p>
              <ul className="text-text-gray text-sm space-y-0.5">
                {review.inconsistencies.map((t, i) => (
                  <li key={i}>• {t}</li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <p className="text-text text-xs font-medium mb-0.5">Recommendation</p>
            <p className="text-text-gray text-sm">{review.counselor_recommendation}</p>
          </div>
        </div>
      )}
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

function formatNoteTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function NotesTab({
  counselorId,
  studentUserId,
  initialNoteText,
  initialStudentNotes,
}: {
  counselorId: string;
  studentUserId: string;
  initialNoteText: string;
  initialStudentNotes: StudentNoteEntry[];
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
    <div className="space-y-6">
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

      <NotesLog studentUserId={studentUserId} initialNotes={initialStudentNotes} />
    </div>
  );
}

function NotesLog({
  studentUserId,
  initialNotes,
}: {
  studentUserId: string;
  initialNotes: StudentNoteEntry[];
}) {
  const [notes, setNotes] = useState<StudentNoteEntry[]>(initialNotes);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = useCallback(async () => {
    const body = draft.trim();
    if (!body) return;
    setPosting(true);
    setError(null);
    try {
      const res = await fetch("/api/counselor/student-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentUserId, body }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Failed to save note.");
        return;
      }
      setNotes((prev) => [data.note, ...prev]);
      setDraft("");
    } catch {
      setError("Failed to save note.");
    } finally {
      setPosting(false);
    }
  }, [draft, studentUserId]);

  return (
    <div>
      <p className="text-text font-medium text-sm mb-2">Notes log</p>
      <p className="text-text-gray text-xs mb-3">
        A running, timestamped log — jot quick context like &quot;talked to parent Tuesday, considering gap year.&quot;
        Visible only to you.
      </p>
      <div className="bg-card border border-border rounded-2xl p-4 mb-4">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          aria-label="New note"
          placeholder="Add a note..."
          className="w-full rounded-xl bg-bg border border-border px-4 py-3 text-text text-sm outline-none focus:border-primary resize-none"
        />
        <div className="flex items-center justify-between mt-2">
          {error ? <p className="text-red text-xs">{error}</p> : <span />}
          <button
            onClick={handleAdd}
            disabled={posting || !draft.trim()}
            className="text-sm font-medium px-4 py-2 rounded-xl bg-primary text-bg disabled:opacity-50"
          >
            {posting ? "Adding..." : "Add note"}
          </button>
        </div>
      </div>

      {notes.length === 0 ? (
        <p className="text-text-gray text-sm text-center py-6">No notes yet.</p>
      ) : (
        <div className="space-y-3">
          {notes.map((n) => (
            <div key={n.id} className="bg-card border border-border rounded-2xl p-4">
              <p className="text-text-gray text-xs mb-1">{formatNoteTimestamp(n.created_at)}</p>
              <p className="text-text text-sm whitespace-pre-wrap">{n.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
