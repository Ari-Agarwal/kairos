"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { RosterStudent } from "./page";
import { StudentsEmptyArt } from "@/components/EmptyStateIllustration";

const STATUS_STYLES: Record<RosterStudent["status"], string> = {
  "On Track": "bg-green-tint text-green",
  "Needs Attention": "bg-red-tint text-red",
  "No Activity": "bg-secondary-tint text-secondary",
};

const GRADES = ["Freshman", "Sophomore", "Junior", "Senior"] as const;
type SortKey = "deadline" | "lastLogin" | "gpaAsc" | "gpaDesc";

// Filter/sort/search now happen server-side against the full roster
// (page.tsx), driven by URL params -- this component just reflects the
// current params in its controls and navigates on change, resetting to
// page 1 since a new filter can change which page a given student lands on.
export default function StudentRosterClient({
  students,
  stats,
  currentPage,
  totalPages,
  gradeFilter,
  statusFilter,
  goalQuery,
  sortKey,
  atRiskCount,
  pendingReviewCount,
}: {
  students: RosterStudent[];
  stats: { total: number; incompleteProfiles: number; noMatches: number; overdue: number };
  currentPage: number;
  totalPages: number;
  gradeFilter: string;
  statusFilter: string;
  goalQuery: string;
  sortKey: SortKey;
  atRiskCount: number;
  pendingReviewCount: number;
}) {
  const router = useRouter();
  const [queryInput, setQueryInput] = useState(goalQuery);
  // First-run help banner (Software_Timeline.md Section 8) -- counselor tools
  // have accumulated real complexity (severity weighting, snoozing, aggregate
  // trends) with no equivalent to the student-facing onboarding flow. A
  // dismissible banner, gated on localStorage, is the lightweight version of
  // that: shown once, gone for good once dismissed, no separate tour/modal
  // flow needed. Lazy initializer only reads localStorage (safe to run twice
  // under Strict Mode) -- no setState-in-effect, matching the pattern already
  // established in MatchesPrepClient/MatchListClient for one-shot flags.
  const [showFirstRunHelp, setShowFirstRunHelp] = useState(
    () => typeof window !== "undefined" && localStorage.getItem("kairos_counselor_help_dismissed") !== "true"
  );

  function dismissFirstRunHelp() {
    localStorage.setItem("kairos_counselor_help_dismissed", "true");
    setShowFirstRunHelp(false);
  }

  function navigate(next: { grade?: string; status?: string; q?: string; sort?: string }) {
    const params = new URLSearchParams({
      grade: next.grade ?? gradeFilter,
      status: next.status ?? statusFilter,
      q: next.q ?? goalQuery,
      sort: next.sort ?? sortKey,
    });
    router.push(`/counselor?${params.toString()}`);
  }

  // Debounced navigation for the free-text search so every keystroke doesn't
  // trigger a full server round-trip.
  useEffect(() => {
    if (queryInput === goalQuery) return;
    const timeout = setTimeout(() => navigate({ q: queryInput }), 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryInput]);

  const filtered = students;

  // Bulk reminders (Software_Timeline.md 5m): select N flagged students on
  // this page and send one message to all of them in a single action,
  // reusing api/counselor/send-reminder's now-array-accepting studentUserIds
  // param instead of the student-detail page's one-at-a-time flow.
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkAction, setBulkAction] = useState<"reminder" | "task">("reminder");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkMessage, setBulkMessage] = useState("");
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkError, setBulkError] = useState("");
  const [bulkSentCount, setBulkSentCount] = useState<number | null>(null);

  // Counselor-initiated task assignment (Software_Timeline.md 8): the other
  // half of this same bulk-select mode -- assign one task (e.g. "financial
  // aid night is Nov 3") to the selected students' timelines instead of
  // sending a reminder message.
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskAssigning, setTaskAssigning] = useState(false);
  const [taskError, setTaskError] = useState("");
  const [taskAssignedCount, setTaskAssignedCount] = useState<number | null>(null);

  async function assignBulkTask() {
    if (!taskTitle.trim() || selectedIds.size === 0) return;
    setTaskAssigning(true);
    setTaskError("");
    setTaskAssignedCount(null);
    try {
      const res = await fetch("/api/counselor/assign-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentUserIds: [...selectedIds],
          title: taskTitle.trim(),
          dueDate: taskDueDate || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to assign task.");
      setTaskAssignedCount(data.assignedCount ?? selectedIds.size);
      setTaskTitle("");
      setTaskDueDate("");
      setSelectedIds(new Set());
    } catch (err) {
      setTaskError(err instanceof Error ? err.message : "Failed to assign task. Please try again.");
    } finally {
      setTaskAssigning(false);
    }
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => (prev.size === filtered.length ? new Set() : new Set(filtered.map((s) => s.user_id))));
  }

  async function sendBulkReminder() {
    if (!bulkMessage.trim() || selectedIds.size === 0) return;
    setBulkSending(true);
    setBulkError("");
    setBulkSentCount(null);
    try {
      const res = await fetch("/api/counselor/send-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentUserIds: [...selectedIds], message: bulkMessage.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send reminders.");
      setBulkSentCount(data.sentCount ?? selectedIds.size);
      setBulkMessage("");
      setSelectedIds(new Set());
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : "Failed to send reminders. Please try again.");
    } finally {
      setBulkSending(false);
    }
  }

  return (
    <div className="px-5 md:px-8 py-8 max-w-4xl mx-auto w-full">
      <h1 className="font-serif text-2xl text-text mb-2">Student Roster</h1>

      {showFirstRunHelp && (
        <div className="bg-card border border-border rounded-2xl p-4 mb-6 text-sm text-text-gray leading-relaxed relative">
          <button
            onClick={dismissFirstRunHelp}
            aria-label="Dismiss"
            className="absolute top-3 right-3 text-text-gray hover:text-text text-xs"
          >
            Dismiss
          </button>
          <p className="text-text font-medium mb-1.5">New here? A few things worth knowing:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>At-risk severity</strong> is weighted, not just a count of flags — never logged in weighs most,
              then long inactivity, then no active matches, then overdue items/incomplete profile, added together.
            </li>
            <li>
              <strong>Snoozing</strong> a flagged student hides them from the main at-risk list for 14 days without
              changing what&apos;s actually flagged — it&apos;s for &ldquo;I&apos;ve handled this,&rdquo; not
              &ldquo;this isn&apos;t a real issue.&rdquo;
            </li>
            <li>
              <strong>Aggregate trends</strong> compare today&apos;s numbers to a snapshot from your chosen window back
              (7/14/30/90 days) — a school with under that much history just won&apos;t show a trend yet, which is
              expected, not a bug.
            </li>
          </ul>
        </div>
      )}

      {/* Home-screen summary (Software_Timeline.md 8) -- previously a counselor
          had to check /counselor/at-risk and /counselor/review-requests
          separately just to get their bearings for the day. */}
      {(atRiskCount > 0 || pendingReviewCount > 0) && (
        <div className="flex flex-wrap gap-3 mb-6">
          {atRiskCount > 0 && (
            <Link
              href="/counselor/at-risk"
              className="flex-1 min-w-[200px] bg-red-tint border border-red/20 rounded-2xl px-4 py-3 hover:border-red/40 transition-colors"
            >
              <p className="text-red font-serif text-xl">{atRiskCount}</p>
              <p className="text-text-gray text-xs">student{atRiskCount === 1 ? "" : "s"} need attention today →</p>
            </Link>
          )}
          {pendingReviewCount > 0 && (
            <Link
              href="/counselor/review-requests"
              className="flex-1 min-w-[200px] bg-amber-tint border border-amber-text-on-tint/20 rounded-2xl px-4 py-3 hover:border-amber-text-on-tint/40 transition-colors"
            >
              <p className="text-amber-text-on-tint font-serif text-xl">{pendingReviewCount}</p>
              <p className="text-text-gray text-xs">pending review request{pendingReviewCount === 1 ? "" : "s"} →</p>
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard label="Total Students" value={stats.total} />
        <StatCard label="Incomplete Profiles" value={stats.incompleteProfiles} />
        <StatCard label="No Active Matches" value={stats.noMatches} />
        <StatCard label="Overdue Items" value={stats.overdue} />
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <select
          aria-label="Filter by grade"
          value={gradeFilter}
          onChange={(e) => navigate({ grade: e.target.value })}
          className="rounded-xl bg-card border border-border px-3 py-2 text-sm text-text outline-none focus:border-primary"
        >
          <option value="all">All Grades</option>
          {GRADES.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(e) => navigate({ status: e.target.value })}
          className="rounded-xl bg-card border border-border px-3 py-2 text-sm text-text outline-none focus:border-primary"
        >
          <option value="all">All Statuses</option>
          <option value="On Track">On Track</option>
          <option value="Needs Attention">Needs Attention</option>
          <option value="No Activity">No Activity</option>
        </select>

        <select
          aria-label="Sort students"
          value={sortKey}
          onChange={(e) => navigate({ sort: e.target.value })}
          className="rounded-xl bg-card border border-border px-3 py-2 text-sm text-text outline-none focus:border-primary"
        >
          <option value="deadline">Sort: Nearest deadline</option>
          <option value="lastLogin">Sort: Last login (oldest first)</option>
          <option value="gpaAsc">Sort: GPA (low to high)</option>
          <option value="gpaDesc">Sort: GPA (high to low)</option>
        </select>

        <input
          type="text"
          aria-label="Search schools considering"
          placeholder="Search schools considering..."
          value={queryInput}
          onChange={(e) => setQueryInput(e.target.value)}
          className="rounded-xl bg-card border border-border px-3 py-2 text-sm text-text outline-none focus:border-primary flex-1 min-w-[180px]"
        />

        <button
          onClick={() => {
            setBulkMode((v) => !v);
            setSelectedIds(new Set());
            setBulkSentCount(null);
          }}
          className={`rounded-xl px-3 py-2 text-sm font-medium border transition-colors ${
            bulkMode ? "bg-primary text-bg border-primary" : "border-border text-text-gray hover:text-text"
          }`}
        >
          {bulkMode ? "Cancel bulk select" : "Bulk actions"}
        </button>
      </div>

      {bulkMode && (
        <div className="bg-card border border-border rounded-2xl p-4 mb-5 space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-text-gray cursor-pointer">
              <input
                type="checkbox"
                checked={filtered.length > 0 && selectedIds.size === filtered.length}
                onChange={toggleSelectAll}
                className="rounded border-border"
              />
              Select all on this page ({filtered.length})
            </label>
            <span className="text-text-gray text-xs">{selectedIds.size} selected</span>
          </div>
          {selectedIds.size > 0 && (
            <div>
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setBulkAction("reminder")}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    bulkAction === "reminder" ? "bg-primary text-bg border-primary" : "border-border text-text-gray hover:text-text"
                  }`}
                >
                  Send reminder
                </button>
                <button
                  onClick={() => setBulkAction("task")}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    bulkAction === "task" ? "bg-primary text-bg border-primary" : "border-border text-text-gray hover:text-text"
                  }`}
                >
                  Assign task
                </button>
              </div>

              {bulkAction === "reminder" ? (
                <>
                  <textarea
                    value={bulkMessage}
                    onChange={(e) => setBulkMessage(e.target.value)}
                    rows={3}
                    aria-label="Bulk reminder message"
                    placeholder="e.g. Don't forget your FAFSA is due Oct 1..."
                    className="w-full rounded-xl bg-bg border border-border px-3 py-2 text-text text-sm outline-none focus:border-primary resize-none mb-2"
                  />
                  {bulkError && <p role="alert" className="text-red text-xs mb-2">{bulkError}</p>}
                  {bulkSentCount !== null && (
                    <p role="status" className="text-green text-xs mb-2">Sent to {bulkSentCount} student{bulkSentCount === 1 ? "" : "s"}.</p>
                  )}
                  <button
                    onClick={sendBulkReminder}
                    disabled={bulkSending || !bulkMessage.trim()}
                    className="rounded-xl bg-primary hover:bg-primary-hover transition-colors text-bg text-sm font-medium px-4 py-2 disabled:opacity-40"
                  >
                    {bulkSending ? "Sending..." : `Send Reminder to ${selectedIds.size}`}
                  </button>
                </>
              ) : (
                <>
                  <div className="flex flex-col sm:flex-row gap-2 mb-2">
                    <input
                      type="text"
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      aria-label="Task title"
                      placeholder="e.g. Financial aid night is Nov 3"
                      maxLength={200}
                      className="flex-1 rounded-xl bg-bg border border-border px-3 py-2 text-text text-sm outline-none focus:border-primary"
                    />
                    <input
                      type="date"
                      value={taskDueDate}
                      onChange={(e) => setTaskDueDate(e.target.value)}
                      aria-label="Task due date (optional)"
                      className="rounded-xl bg-bg border border-border px-3 py-2 text-text text-sm outline-none focus:border-primary"
                    />
                  </div>
                  {taskError && <p role="alert" className="text-red text-xs mb-2">{taskError}</p>}
                  {taskAssignedCount !== null && (
                    <p role="status" className="text-green text-xs mb-2">
                      Assigned to {taskAssignedCount} student{taskAssignedCount === 1 ? "" : "s"}.
                    </p>
                  )}
                  <button
                    onClick={assignBulkTask}
                    disabled={taskAssigning || !taskTitle.trim()}
                    className="rounded-xl bg-primary hover:bg-primary-hover transition-colors text-bg text-sm font-medium px-4 py-2 disabled:opacity-40"
                  >
                    {taskAssigning ? "Assigning..." : `Assign to ${selectedIds.size}`}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="hidden md:grid grid-cols-[1.5fr_0.8fr_0.6fr_0.8fr_0.8fr_1fr] gap-2 px-4 py-3 text-text-gray text-xs border-b border-border">
          <span>Student</span>
          <span>Grade</span>
          <span>GPA</span>
          <span>Matches</span>
          <span>Open Items</span>
          <span>Status</span>
        </div>
        {filtered.map((s) => {
          const rowContent = (
            <>
              <span className="flex items-center justify-between gap-2 md:contents">
                <span className="flex items-center gap-2 min-w-0">
                  {bulkMode && (
                    <input
                      type="checkbox"
                      checked={selectedIds.has(s.user_id)}
                      onChange={() => toggleSelected(s.user_id)}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Select ${s.name}`}
                      className="rounded border-border shrink-0"
                    />
                  )}
                  <span className="truncate font-medium md:font-normal">{s.name}</span>
                </span>
                <span className={`text-xs font-medium px-2 py-1 rounded-full shrink-0 md:hidden ${STATUS_STYLES[s.status]}`}>
                  {s.status}
                </span>
              </span>
              <span className="text-text-gray text-xs md:hidden">
                {s.grade_level} · GPA {s.unweightedGpa} · {s.activeMatchCount} matches · {s.incompleteTimelineCount} open
              </span>
              <span className="hidden md:inline text-text-gray">{s.grade_level}</span>
              <span className="hidden md:inline text-text-gray">{s.unweightedGpa}</span>
              <span className="hidden md:inline text-text-gray">{s.activeMatchCount}</span>
              <span className="hidden md:inline text-text-gray">{s.incompleteTimelineCount}</span>
              <span className="hidden md:inline">
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_STYLES[s.status]}`}>
                  {s.status}
                </span>
              </span>
            </>
          );
          const rowClass =
            "flex flex-col gap-2 px-4 py-3 text-sm text-text border-b border-border last:border-b-0 hover:bg-secondary-tint transition-colors md:grid md:grid-cols-[1.5fr_0.8fr_0.6fr_0.8fr_0.8fr_1fr] md:gap-2 md:items-center";
          return bulkMode ? (
            <div
              key={s.user_id}
              role="button"
              tabIndex={0}
              onClick={() => toggleSelected(s.user_id)}
              onKeyDown={(e) => e.key === "Enter" && toggleSelected(s.user_id)}
              className={`${rowClass} cursor-pointer`}
            >
              {rowContent}
            </div>
          ) : (
            <Link key={s.user_id} href={`/counselor/students/${s.user_id}`} className={rowClass}>
              {rowContent}
            </Link>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-6">
            <StudentsEmptyArt />
            <p className="text-text-gray text-sm mt-1">No students match these filters.</p>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-5 text-sm text-text-gray">
          <Link
            href={
              currentPage > 1
                ? `/counselor?${new URLSearchParams({ grade: gradeFilter, status: statusFilter, q: goalQuery, sort: sortKey, page: String(currentPage - 1) })}`
                : "#"
            }
            aria-disabled={currentPage <= 1}
            className={`px-3 py-2 rounded-xl border border-border ${
              currentPage <= 1 ? "opacity-40 pointer-events-none" : "hover:text-text hover:border-primary/40"
            }`}
          >
            ← Previous
          </Link>
          <span>
            Page {currentPage} of {totalPages}
            <span className="hidden sm:inline"> — filters and search apply across your whole roster</span>
          </span>
          <Link
            href={
              currentPage < totalPages
                ? `/counselor?${new URLSearchParams({ grade: gradeFilter, status: statusFilter, q: goalQuery, sort: sortKey, page: String(currentPage + 1) })}`
                : "#"
            }
            aria-disabled={currentPage >= totalPages}
            className={`px-3 py-2 rounded-xl border border-border ${
              currentPage >= totalPages ? "opacity-40 pointer-events-none" : "hover:text-text hover:border-primary/40"
            }`}
          >
            Next →
          </Link>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 text-center">
      <p className="font-serif text-xl text-primary">{value}</p>
      <p className="text-text-gray text-xs">{label}</p>
    </div>
  );
}
