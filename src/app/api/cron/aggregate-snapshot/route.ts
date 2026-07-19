import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { computeFlags } from "@/lib/at-risk";
import { computeGradeAggregates } from "@/lib/aggregate";

// Triggered by Vercel Cron (see vercel.json) once daily, same bearer-token
// pattern as api/sms/send-nudges. Writes one row per school per grade so
// counselor/aggregate can show a trend vs. ~7 days ago instead of only ever
// a single point-in-time snapshot.
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: schools, error: schoolsError } = await supabase.from("schools").select("school_id");
  if (schoolsError) {
    console.error("aggregate-snapshot schools query failed:", schoolsError);
    return NextResponse.json({ error: "Failed to fetch schools" }, { status: 500 });
  }

  const today = new Date().toISOString().slice(0, 10);
  let written = 0;

  for (const school of schools ?? []) {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, grade_level, unweighted_gpa, intended_major, extracurriculars, schools_already_considering, test_scores, last_login_at")
      .eq("school_id", school.school_id);

    if (profilesError) {
      console.error(`aggregate-snapshot profiles query failed for school ${school.school_id}:`, profilesError);
      continue;
    }
    if (!profiles || profiles.length === 0) continue;

    const studentIds = profiles.map((p) => p.user_id);

    const { data: matches } = await supabase
      .from("school_matches")
      .select("user_id")
      .in("user_id", studentIds)
      .eq("is_active", true);

    const { data: timelineItems } = await supabase
      .from("timeline_items")
      .select("user_id, due_date, completed, is_strategic")
      .in("user_id", studentIds);

    const matchCountByUser = new Map<string, number>();
    for (const m of matches ?? []) {
      matchCountByUser.set(m.user_id, (matchCountByUser.get(m.user_id) ?? 0) + 1);
    }

    const completionByUser = new Map<string, { total: number; done: number }>();
    const overdueByUser = new Map<string, number>();
    const todayForOverdue = today;
    for (const item of timelineItems ?? []) {
      if (item.is_strategic) continue;
      const entry = completionByUser.get(item.user_id) ?? { total: 0, done: 0 };
      entry.total += 1;
      if (item.completed) entry.done += 1;
      completionByUser.set(item.user_id, entry);
      if (!item.completed && item.due_date && item.due_date < todayForOverdue) {
        overdueByUser.set(item.user_id, (overdueByUser.get(item.user_id) ?? 0) + 1);
      }
    }

    const flagged = computeFlags(profiles, matchCountByUser, overdueByUser);
    const atRiskCountByGrade = new Map<string, number>();
    for (const f of flagged) {
      atRiskCountByGrade.set(f.grade_level, (atRiskCountByGrade.get(f.grade_level) ?? 0) + 1);
    }

    const gradeAggregates = computeGradeAggregates(profiles, completionByUser, atRiskCountByGrade);

    for (const g of gradeAggregates) {
      if (g.studentCount === 0) continue;
      const { error: upsertError } = await supabase.from("aggregate_snapshots").upsert(
        {
          school_id: school.school_id,
          grade_level: g.grade,
          snapshot_date: today,
          student_count: g.studentCount,
          avg_gpa: g.avgGpa,
          avg_timeline_completion_pct: g.avgTimelineCompletionPct,
          at_risk_count: g.atRiskCount,
        },
        { onConflict: "school_id,grade_level,snapshot_date" }
      );
      if (upsertError) {
        console.error(`aggregate-snapshot upsert failed for school ${school.school_id}, grade ${g.grade}:`, upsertError);
        continue;
      }
      written++;
    }
  }

  return NextResponse.json({ written });
}
