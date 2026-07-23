"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import SendReminderButton from "@/components/SendReminderButton";
import InfoTooltip from "@/components/InfoTooltip";
import { AllClearArt } from "@/components/EmptyStateIllustration";

export interface FlaggedStudent {
  user_id: string;
  name: string;
  grade_level: string;
  reasons: string[];
  snoozedUntil: string | null;
  snoozedBy: string | null;
}

const SNOOZE_DAYS = 14;

export default function AtRiskClient({ students: initialStudents }: { students: FlaggedStudent[] }) {
  const [students, setStudents] = useState(initialStudents);
  const [showSnoozed, setShowSnoozed] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const visible = students.filter((s) => !s.snoozedUntil);
  const snoozed = students.filter((s) => s.snoozedUntil);

  async function snoozeStudent(userId: string) {
    setPendingId(userId);
    const res = await fetch("/api/counselor/at-risk-dismiss", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentUserId: userId, days: SNOOZE_DAYS }),
    });
    setPendingId(null);
    if (!res.ok) return;
    const data = await res.json();
    setStudents((prev) => prev.map((s) => (s.user_id === userId ? { ...s, snoozedUntil: data.dismissedUntil } : s)));
  }

  async function unsnoozeStudent(userId: string) {
    setPendingId(userId);
    const res = await fetch("/api/counselor/at-risk-dismiss", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentUserId: userId }),
    });
    setPendingId(null);
    if (!res.ok) return;
    setStudents((prev) => prev.map((s) => (s.user_id === userId ? { ...s, snoozedUntil: null } : s)));
  }

  function StudentCard({ s, snoozed: isSnoozed }: { s: FlaggedStudent; snoozed: boolean }) {
    return (
      <div
        className={`bg-card rounded-2xl p-5 transition-colors ${
          isSnoozed ? "border border-border" : "border border-red/30 hover:border-red/60"
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <Link href={`/counselor/students/${s.user_id}`} className="font-medium text-text hover:underline">
            {s.name}
          </Link>
          <span className="text-text-gray text-xs">{s.grade_level}</span>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {s.reasons.map((reason) => (
            <span
              key={reason}
              className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${
                isSnoozed ? "bg-secondary-tint text-text-gray" : "bg-red-tint text-red"
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              {reason}
            </span>
          ))}
        </div>
        {isSnoozed ? (
          <div className="flex items-center gap-3">
            <p className="text-text-gray text-xs">
              Snoozed{s.snoozedBy && s.snoozedBy !== "you" ? ` by ${s.snoozedBy}` : ""} until{" "}
              {s.snoozedUntil &&
                new Date(s.snoozedUntil).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </p>
            <button
              onClick={() => unsnoozeStudent(s.user_id)}
              disabled={pendingId === s.user_id}
              className="text-primary text-xs hover:text-primary-hover disabled:opacity-40"
            >
              Un-snooze
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <SendReminderButton studentUserId={s.user_id} />
            <button
              onClick={() => snoozeStudent(s.user_id)}
              disabled={pendingId === s.user_id}
              className="shrink-0 text-sm font-medium px-3.5 py-2 rounded-xl border border-border text-text-gray hover:text-text hover:border-primary/40 transition-colors disabled:opacity-40"
            >
              {pendingId === s.user_id ? "Snoozing..." : `Snooze ${SNOOZE_DAYS}d`}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="px-5 md:px-8 py-8 max-w-3xl mx-auto w-full">
      <h1 className="font-serif text-2xl text-text mb-2 inline-flex items-center gap-2">
        At-Risk Flags
        <InfoTooltip text="Severity weights how cold a student's engagement is: never logged in counts most, then long inactivity, then having no active matches, then overdue timeline items and an incomplete profile (each worth less, and additive). Higher severity means more of these reasons stacked at once." />
      </h1>
      <p className="text-text-gray text-sm mb-6">
        Students with overdue deadlines, no active matches, or extended inactivity, worth a check-in.
      </p>

      {visible.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-6 text-center mb-4">
          <AllClearArt />
          <p className="text-text-gray text-sm mt-1">No students currently flagged. Everyone&apos;s on track.</p>
        </div>
      ) : (
        <div className="space-y-3 mb-4">
          {visible.map((s) => (
            <StudentCard key={s.user_id} s={s} snoozed={false} />
          ))}
        </div>
      )}

      {snoozed.length > 0 && (
        <div>
          <button
            onClick={() => setShowSnoozed((v) => !v)}
            className="text-text-gray text-sm hover:text-text mb-3"
          >
            {showSnoozed ? "Hide" : "Show"} snoozed ({snoozed.length})
          </button>
          {showSnoozed && (
            <div className="space-y-3">
              {snoozed.map((s) => (
                <StudentCard key={s.user_id} s={s} snoozed />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
