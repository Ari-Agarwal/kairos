import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCounselorRecord } from "@/lib/access";
import CounselorNavShell from "@/components/CounselorNavShell";
import AtRiskClient, { type FlaggedStudent } from "./AtRiskClient";
import { computeFlags } from "@/lib/at-risk";

export default async function AtRiskPage() {
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

  if (schoolError) console.error("at-risk school query failed:", schoolError);

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("*")
    .eq("school_id", counselor.school_id);

  if (profilesError) console.error("at-risk profiles query failed:", profilesError);

  const studentIds = (profiles ?? []).map((p) => p.user_id);
  const nameByUser = new Map((profiles ?? []).map((p) => [p.user_id, p.display_name as string | null]));

  const { data: matches } = studentIds.length
    ? await supabase.from("school_matches").select("user_id").in("user_id", studentIds).eq("is_active", true)
    : { data: [] };

  const { data: timelineItems } = studentIds.length
    ? await supabase
        .from("timeline_items")
        .select("user_id, due_date, completed, is_strategic")
        .in("user_id", studentIds)
    : { data: [] };

  const matchCountByUser = new Map<string, number>();
  for (const m of matches ?? []) {
    matchCountByUser.set(m.user_id, (matchCountByUser.get(m.user_id) ?? 0) + 1);
  }

  const today = new Date().toISOString().slice(0, 10);
  const overdueByUser = new Map<string, number>();
  for (const item of timelineItems ?? []) {
    if (item.is_strategic || item.completed) continue;
    if (item.due_date && item.due_date < today) {
      overdueByUser.set(item.user_id, (overdueByUser.get(item.user_id) ?? 0) + 1);
    }
  }

  const { data: dismissals, error: dismissalsError } = await supabase
    .from("at_risk_dismissals")
    .select("student_user_id, dismissed_until")
    .eq("counselor_id", counselor.counselor_id)
    .gt("dismissed_until", new Date().toISOString());

  if (dismissalsError) console.error("at-risk dismissals query failed:", dismissalsError);

  const dismissedUntilByUser = new Map((dismissals ?? []).map((d) => [d.student_user_id, d.dismissed_until]));

  const flagged = computeFlags(profiles ?? [], matchCountByUser, overdueByUser);
  const sortedFlagged: FlaggedStudent[] = flagged.map((s) => ({
    user_id: s.user_id,
    name: nameByUser.get(s.user_id) ?? "Student",
    grade_level: s.grade_level,
    reasons: s.reasons,
    snoozedUntil: dismissedUntilByUser.get(s.user_id) ?? null,
  }));

  return (
    <CounselorNavShell schoolName={school?.name ?? "Your School"}>
      <AtRiskClient students={sortedFlagged} />
    </CounselorNavShell>
  );
}
