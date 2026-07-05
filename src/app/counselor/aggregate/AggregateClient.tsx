"use client";

export interface GradeAggregate {
  grade: string;
  studentCount: number;
  avgGpa: number | null;
  avgTimelineCompletionPct: number | null;
}

export interface SchoolTally {
  name: string;
  count: number;
}

export default function AggregateClient({
  totalStudents,
  gradeAggregates,
  topSchools,
}: {
  totalStudents: number;
  gradeAggregates: GradeAggregate[];
  topSchools: SchoolTally[];
}) {
  return (
    <div className="px-5 md:px-8 py-8 max-w-3xl mx-auto w-full">
      <h1 className="font-serif text-2xl text-text mb-1">Class-Level Overview</h1>
      <p className="text-text-gray text-sm mb-8">
        Aggregate patterns across all {totalStudents} student{totalStudents === 1 ? "" : "s"} at your school.
      </p>

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
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      <h2 className="text-text font-medium text-sm mb-3">Most-matched schools across your students</h2>
      {topSchools.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-6 text-center">
          <p className="text-text-gray text-sm">No active matches yet across your roster.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          {topSchools.map((s) => (
            <div key={s.name} className="flex items-center justify-between gap-3">
              <p className="text-text text-sm truncate">{s.name}</p>
              <span className="text-text-gray text-sm shrink-0">
                {s.count} student{s.count === 1 ? "" : "s"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
