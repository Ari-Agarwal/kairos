// Shared between counselor/aggregate (live view) and the daily snapshot
// cron job, so the two can't compute "avg completion" or "at risk" counts
// differently from each other.

export const GRADES = ["Freshman", "Sophomore", "Junior", "Senior"] as const;

export interface GradeAggregateProfile {
  user_id: string;
  grade_level: string;
  unweighted_gpa: number | null;
}

export interface GradeAggregate {
  grade: string;
  studentCount: number;
  avgGpa: number | null;
  avgTimelineCompletionPct: number | null;
  atRiskCount: number;
  // Delta vs. the closest snapshot to ~7 days ago, when one exists.
  trendCompletionDelta?: number | null;
  trendAtRiskDelta?: number | null;
}

export function computeGradeAggregates(
  profiles: GradeAggregateProfile[],
  completionByUser: Map<string, { total: number; done: number }>,
  atRiskCountByGrade: Map<string, number>
): GradeAggregate[] {
  return GRADES.map((grade) => {
    const gradeProfiles = profiles.filter((p) => p.grade_level === grade);
    const count = gradeProfiles.length;
    const avgGpa = count
      ? gradeProfiles.reduce((sum, p) => sum + (p.unweighted_gpa ?? 0), 0) / count
      : 0;
    const completionRates = gradeProfiles
      .map((p) => {
        const entry = completionByUser.get(p.user_id);
        return entry && entry.total > 0 ? entry.done / entry.total : null;
      })
      .filter((r): r is number => r !== null);
    const avgCompletion = completionRates.length
      ? completionRates.reduce((a, b) => a + b, 0) / completionRates.length
      : null;

    return {
      grade,
      studentCount: count,
      avgGpa: count ? Number(avgGpa.toFixed(2)) : null,
      avgTimelineCompletionPct: avgCompletion !== null ? Math.round(avgCompletion * 100) : null,
      atRiskCount: atRiskCountByGrade.get(grade) ?? 0,
    };
  });
}
