import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCounselorRecord } from "@/lib/access";
import CounselorNavShell from "@/components/CounselorNavShell";
import AggregateClient, { type GradeAggregate, type SchoolTally } from "./AggregateClient";

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
        .select("user_id, completed, is_strategic")
        .in("user_id", studentIds)
    : { data: [], error: null };

  if (timelineError) console.error("counselor aggregate timeline query failed:", timelineError);

  const completionByUser = new Map<string, { total: number; done: number }>();
  for (const item of timelineItems ?? []) {
    if (item.is_strategic) continue;
    const entry = completionByUser.get(item.user_id) ?? { total: 0, done: 0 };
    entry.total += 1;
    if (item.completed) entry.done += 1;
    completionByUser.set(item.user_id, entry);
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
    };
  });

  const schoolCounts = new Map<string, number>();
  for (const m of matches ?? []) {
    schoolCounts.set(m.school_name, (schoolCounts.get(m.school_name) ?? 0) + 1);
  }
  const topSchools: SchoolTally[] = [...schoolCounts.entries()]
    .map(([name, count]) => ({ name, count }))
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
