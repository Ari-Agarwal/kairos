"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { RosterStudent } from "./page";

const STATUS_STYLES: Record<RosterStudent["status"], string> = {
  "On Track": "bg-green-tint text-green",
  "Needs Attention": "bg-red-tint text-red",
  "No Activity": "bg-secondary-tint text-secondary",
};

const GRADES = ["Freshman", "Sophomore", "Junior", "Senior"] as const;
type SortKey = "deadline" | "lastLogin" | "gpaAsc" | "gpaDesc";

export default function StudentRosterClient({
  students,
  stats,
}: {
  students: RosterStudent[];
  stats: { total: number; incompleteProfiles: number; noMatches: number; overdue: number };
}) {
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [goalQuery, setGoalQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("deadline");

  const filtered = useMemo(() => {
    let result = students;
    if (gradeFilter !== "all") result = result.filter((s) => s.grade_level === gradeFilter);
    if (statusFilter !== "all") result = result.filter((s) => s.status === statusFilter);
    if (goalQuery.trim()) {
      const q = goalQuery.trim().toLowerCase();
      result = result.filter((s) => s.schools_already_considering?.toLowerCase().includes(q));
    }

    const sorted = [...result];
    if (sortKey === "deadline") {
      sorted.sort((a, b) => b.overdueCount - a.overdueCount || b.incompleteTimelineCount - a.incompleteTimelineCount);
    } else if (sortKey === "lastLogin") {
      sorted.sort((a, b) => {
        const aTime = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0;
        const bTime = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0;
        return aTime - bTime;
      });
    } else if (sortKey === "gpaAsc") {
      sorted.sort((a, b) => a.gpa - b.gpa);
    } else if (sortKey === "gpaDesc") {
      sorted.sort((a, b) => b.gpa - a.gpa);
    }
    return sorted;
  }, [students, gradeFilter, statusFilter, goalQuery, sortKey]);

  return (
    <div className="px-5 md:px-8 py-8 max-w-4xl mx-auto w-full">
      <h1 className="font-serif text-2xl text-text mb-6">Student Roster</h1>

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
          onChange={(e) => setGradeFilter(e.target.value)}
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
          onChange={(e) => setStatusFilter(e.target.value)}
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
          onChange={(e) => setSortKey(e.target.value as SortKey)}
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
          value={goalQuery}
          onChange={(e) => setGoalQuery(e.target.value)}
          className="rounded-xl bg-card border border-border px-3 py-2 text-sm text-text outline-none focus:border-primary flex-1 min-w-[180px]"
        />
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="hidden md:grid grid-cols-[1.5fr_0.8fr_0.6fr_0.8fr_0.8fr_1fr] gap-2 px-4 py-3 text-text-gray text-xs border-b border-border">
          <span>Student</span>
          <span>Grade</span>
          <span>GPA</span>
          <span>Matches</span>
          <span>Open Items</span>
          <span>Status</span>
        </div>
        {filtered.map((s) => (
          <Link
            key={s.user_id}
            href={`/counselor/students/${s.user_id}`}
            className="flex flex-col gap-2 px-4 py-3 text-sm text-text border-b border-border last:border-b-0 hover:bg-white/5 transition-colors md:grid md:grid-cols-[1.5fr_0.8fr_0.6fr_0.8fr_0.8fr_1fr] md:gap-2 md:items-center"
          >
            <span className="flex items-center justify-between gap-2 md:contents">
              <span className="truncate font-medium md:font-normal">{s.name}</span>
              <span className={`text-xs font-medium px-2 py-1 rounded-full shrink-0 md:hidden ${STATUS_STYLES[s.status]}`}>
                {s.status}
              </span>
            </span>
            <span className="text-text-gray text-xs md:hidden">
              {s.grade_level} · GPA {s.gpa} · {s.activeMatchCount} matches · {s.incompleteTimelineCount} open
            </span>
            <span className="hidden md:inline text-text-gray">{s.grade_level}</span>
            <span className="hidden md:inline text-text-gray">{s.gpa}</span>
            <span className="hidden md:inline text-text-gray">{s.activeMatchCount}</span>
            <span className="hidden md:inline text-text-gray">{s.incompleteTimelineCount}</span>
            <span className="hidden md:inline">
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_STYLES[s.status]}`}>
                {s.status}
              </span>
            </span>
          </Link>
        ))}
        {filtered.length === 0 && (
          <p className="text-text-gray text-sm text-center py-10">No students match these filters.</p>
        )}
      </div>
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
