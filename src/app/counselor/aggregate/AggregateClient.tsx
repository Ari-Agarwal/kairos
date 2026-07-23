"use client";

import { useState } from "react";
import Link from "next/link";
import type { GradeAggregate, SchoolWideAggregate } from "@/lib/aggregate";
import { MatchesEmptyArt } from "@/components/EmptyStateIllustration";

export type { GradeAggregate };

export interface SchoolTally {
  name: string;
  count: number;
  students: { user_id: string; name: string }[];
}

export default function AggregateClient({
  totalStudents,
  gradeAggregates,
  schoolWide,
  topSchools,
  trendWindowDays,
  trendWindowOptions,
}: {
  totalStudents: number;
  gradeAggregates: GradeAggregate[];
  schoolWide: SchoolWideAggregate;
  topSchools: SchoolTally[];
  trendWindowDays: number;
  trendWindowOptions: number[];
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const trendLabel = trendWindowDays === 7 ? "vs last week" : `vs ${trendWindowDays} days ago`;

  return (
    <div className="px-5 md:px-8 py-8 max-w-3xl mx-auto w-full">
      <h1 className="font-serif text-2xl text-text mb-1">Class-Level Overview</h1>
      <p className="text-text-gray text-sm mb-6">
        Aggregate patterns across all {totalStudents} student{totalStudents === 1 ? "" : "s"} at your school.
      </p>

      <div className="flex items-center gap-2 mb-8">
        <span className="text-text-gray text-xs">Trend window:</span>
        {trendWindowOptions.map((w) => (
          <Link
            key={w}
            href={`/counselor/aggregate?window=${w}`}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              w === trendWindowDays ? "bg-primary text-bg border-primary" : "border-border text-text-gray hover:text-text"
            }`}
          >
            {w}d
          </Link>
        ))}
      </div>

      {/* Whole-school rollup (Software_Timeline.md 8), distinct from the
          per-grade cards below -- useful for a board presentation or annual
          report where per-grade granularity isn't the point. Cross-*year*
          comparisons aren't possible yet (no admissions-cycle-partitioned
          history), so this is cross-grade only for now. */}
      <div className="bg-card border border-border rounded-2xl p-5 mb-8">
        <p className="text-text font-medium text-sm mb-3">Whole school</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-text-gray text-xs mb-1">Students</p>
            <p className="font-serif text-xl text-text">{schoolWide.studentCount}</p>
          </div>
          <div>
            <p className="text-text-gray text-xs mb-1">Average GPA</p>
            <p className="font-serif text-xl text-text">{schoolWide.avgGpa ?? "—"}</p>
          </div>
          <div>
            <p className="text-text-gray text-xs mb-1">Avg. timeline completion</p>
            <p className="font-serif text-xl text-text">
              {schoolWide.avgTimelineCompletionPct !== null ? `${schoolWide.avgTimelineCompletionPct}%` : "—"}
            </p>
          </div>
          <div>
            <p className="text-text-gray text-xs mb-1">At risk</p>
            <p className={`font-serif text-xl ${schoolWide.atRiskCount > 0 ? "text-red" : "text-text"}`}>
              {schoolWide.atRiskCount}
            </p>
          </div>
        </div>
      </div>

      <h2 className="text-text font-medium text-sm mb-3">By grade</h2>
      <div className="grid sm:grid-cols-2 gap-4 mb-10">
        {gradeAggregates.map((g) => (
          <div key={g.grade} className="bg-card border border-border rounded-2xl p-5">
            <p className="font-serif text-lg text-text mb-3">{g.grade}</p>
            {g.studentCount === 0 ? (
              <p className="text-text-gray text-sm">No students yet</p>
            ) : (
              <div className="space-y-1.5 text-sm">
                <p className="text-text-gray">
                  {g.studentCount} student{g.studentCount === 1 ? "" : "s"}
                </p>
                <p className="text-text-gray">
                  Average GPA: <span className="text-text">{g.avgGpa ?? "—"}</span>
                </p>
                <p className="text-text-gray">
                  Avg. timeline completion:{" "}
                  <span className="text-text">
                    {g.avgTimelineCompletionPct !== null ? `${g.avgTimelineCompletionPct}%` : "—"}
                  </span>
                  {g.trendCompletionDelta != null && g.trendCompletionDelta !== 0 && (
                    <span className={g.trendCompletionDelta > 0 ? "text-green" : "text-red"}>
                      {" "}
                      ({g.trendCompletionDelta > 0 ? "+" : ""}
                      {g.trendCompletionDelta}pt {trendLabel})
                    </span>
                  )}
                </p>
                <p className="text-text-gray">
                  At risk:{" "}
                  <span className={g.atRiskCount > 0 ? "text-red" : "text-text"}>{g.atRiskCount}</span>
                  {g.trendAtRiskDelta != null && g.trendAtRiskDelta !== 0 && (
                    <span className={g.trendAtRiskDelta < 0 ? "text-green" : "text-red"}>
                      {" "}
                      ({g.trendAtRiskDelta > 0 ? "+" : ""}
                      {g.trendAtRiskDelta} {trendLabel})
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      <h2 className="text-text font-medium text-sm mb-3">Most-matched schools across your students</h2>
      {topSchools.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-6 text-center">
          <MatchesEmptyArt />
          <p className="text-text-gray text-sm mt-1">No active matches yet across your roster.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-1">
          {topSchools.map((s) => {
            const isOpen = expanded === s.name;
            return (
              <div key={s.name}>
                <button
                  onClick={() => setExpanded(isOpen ? null : s.name)}
                  className="w-full flex items-center justify-between gap-3 py-2 text-left hover:text-primary transition-colors"
                  aria-expanded={isOpen}
                >
                  <p className="text-text text-sm truncate">{s.name}</p>
                  <span className="text-text-gray text-sm shrink-0">
                    {s.count} student{s.count === 1 ? "" : "s"} {isOpen ? "▲" : "▼"}
                  </span>
                </button>
                {isOpen && (
                  <div className="pl-3 pb-2 space-y-1">
                    {s.students.map((student) => (
                      <Link
                        key={student.user_id}
                        href={`/counselor/students/${student.user_id}`}
                        className="block text-sm text-text-gray hover:text-primary hover:underline"
                      >
                        {student.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
