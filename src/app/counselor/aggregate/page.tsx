import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCounselorRecord } from "@/lib/access";
import CounselorNavShell from "@/components/CounselorNavShell";
import AggregateClient, { type SchoolTally } from "./AggregateClient";
import { computeFlags } from "@/lib/at-risk";
import { computeGradeAggregates } from "@/lib/aggregate";

export default async function AggregatePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const counselor = await getCounselorRecord(supabase, user.id);
  if (!counselor) redirect("/dashboard");

  const { data: school, error: schoolError } = await supabase
    .from("schools")
    .select("name")
    .eq("school_id", counselor.school_id)
    .maybeSingle();

  if (schoolError) console.error("counselor aggregate school query failed:", schoolError);

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("*")
    .eq("school_id", counselor.school_id);

  if (profilesError) console.error("counselor aggregate profiles query failed:", profilesError);

  const studentIds = (profiles ?? []).map((p) => p.user_id);
  const nameByUser = new Map((profiles ?? []).map((p) => [p.user_id, p.display_name as string | null]));

  const { data: matches, error: matchesError } = studentIds.length
    ? await supabase
        .from("school_matches")
        .select("user_id, school_name, category")
        .in("user_id", studentIds)
        .eq("is_active", true)
    : { data: [], error: null };

  if (matchesError) console.error("counselor aggregate matches query failed:", matchesError);

  const { data: timelineItems, error: timelineError } = studentIds.length
    ? await supabase
        .from("timeline_items")
        .select("user_id, due_date, completed, is_strategic")
        .in("user_id", studentIds)
    : { data: [], error: null };

  if (timelineError) console.error("counselor aggregate timeline query failed:", timelineError);

  const completionByUser = new Map<string, { total: number; done: number }>();
  const matchCountByUser = new Map<string, number>();
  const overdueByUser = new Map<string, number>();
  const today = new Date().toISOString().slice(0, 10);

  for (const item of timelineItems ?? []) {
    if (item.is_strategic) continue;
    const entry = completionByUser.get(item.user_id) ?? { total: 0, done: 0 };
    entry.total += 1;
    if (item.completed) entry.done += 1;
    completionByUser.set(item.user_id, entry);
    if (!item.completed && item.due_date && item.due_date < today) {
      overdueByUser.set(item.user_id, (overdueByUser.get(item.user_id) ?? 0) + 1);
    }
  }
  for (const m of matches ?? []) {
    matchCountByUser.set(m.user_id, (matchCountByUser.get(m.user_id) ?? 0) + 1);
  }

  // Shared with counselor/at-risk so the two pages can't disagree on what
  // "at risk" means -- this page just needs the count per grade.
  const flagged = computeFlags(profiles ?? [], matchCountByUser, overdueByUser);
  const atRiskCountByGrade = new Map<string, number>();
  for (const f of flagged) {
    atRiskCountByGrade.set(f.grade_level, (atRiskCountByGrade.get(f.grade_level) ?? 0) + 1);
  }

  const gradeAggregates = computeGradeAggregates(profiles ?? [], completionByUser, atRiskCountByGrade);

  // Trend vs. ~7 days ago: pick the closest snapshot at or before that date
  // per grade (cron may not run exactly every day, so don't require an exact
  // date match) and diff against today's live numbers.
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const { data: pastSnapshots, error: snapshotsError } = await supabase
    .from("aggregate_snapshots")
    .select("grade_level, snapshot_date, avg_timeline_completion_pct, at_risk_count")
    .eq("school_id", counselor.school_id)
    .lte("snapshot_date", sevenDaysAgo.toISOString().slice(0, 10))
    .order("snapshot_date", { ascending: false });

  if (snapshotsError) console.error("counselor aggregate snapshots query failed:", snapshotsError);

  const snapshotByGrade = new Map<string, { avg_timeline_completion_pct: number | null; at_risk_count: number }>();
  for (const snap of pastSnapshots ?? []) {
    if (!snapshotByGrade.has(snap.grade_level)) snapshotByGrade.set(snap.grade_level, snap);
  }

  for (const g of gradeAggregates) {
    const past = snapshotByGrade.get(g.grade);
    if (!past) continue;
    g.trendCompletionDelta =
      g.avgTimelineCompletionPct !== null && past.avg_timeline_completion_pct !== null
        ? g.avgTimelineCompletionPct - past.avg_timeline_completion_pct
        : null;
    g.trendAtRiskDelta = g.atRiskCount - past.at_risk_count;
  }

  const schoolStudents = new Map<string, { user_id: string; name: string }[]>();
  for (const m of matches ?? []) {
    const list = schoolStudents.get(m.school_name) ?? [];
    list.push({ user_id: m.user_id, name: nameByUser.get(m.user_id) ?? "Student" });
    schoolStudents.set(m.school_name, list);
  }
  const topSchools: SchoolTally[] = [...schoolStudents.entries()]
    .map(([name, students]) => ({ name, count: students.length, students }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return (
    <CounselorNavShell schoolName={school?.name ?? "Your School"}>
      <AggregateClient
        totalStudents={(profiles ?? []).length}
        gradeAggregates={gradeAggregates}
        topSchools={topSchools}
      />
    </CounselorNavShell>
  );
}
