import { createClient, createServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCounselorRecord } from "@/lib/access";
import CounselorNavShell from "@/components/CounselorNavShell";
import AggregateClient, { type GradeAggregate, type SchoolTally } from "./AggregateClient";
import { computeFlags } from "@/lib/at-risk";

const GRADES = ["Freshman", "Sophomore", "Junior", "Senior"] as const;

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

  const emailByUser = new Map<string, string>();
  if (studentIds.length) {
    const serviceClient = createServiceClient();
    const results = await Promise.all(
      studentIds.map((id) => serviceClient.auth.admin.getUserById(id))
    );
    results.forEach((res, i) => {
      const name = res.data.user?.user_metadata?.full_name ?? res.data.user?.email;
      if (name) emailByUser.set(studentIds[i], name);
    });
  }

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

  const gradeAggregates: GradeAggregate[] = GRADES.map((grade) => {
    const gradeProfiles = (profiles ?? []).filter((p) => p.grade_level === grade);
    const count = gradeProfiles.length;
    const avgGpa = count
      ? gradeProfiles.reduce((sum, p) => sum + (p.unweighted_gpa ?? 0), 0) / count
      : 0;
    const completionRates = gradeProfiles.map((p) => {
      const entry = completionByUser.get(p.user_id);
      return entry && entry.total > 0 ? entry.done / entry.total : null;
    }).filter((r): r is number => r !== null);
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

  const schoolStudents = new Map<string, { user_id: string; name: string }[]>();
  for (const m of matches ?? []) {
    const list = schoolStudents.get(m.school_name) ?? [];
    list.push({ user_id: m.user_id, name: emailByUser.get(m.user_id) ?? "Student" });
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
