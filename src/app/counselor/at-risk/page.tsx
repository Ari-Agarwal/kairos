import { createClient, createServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCounselorRecord } from "@/lib/access";
import CounselorNavShell from "@/components/CounselorNavShell";
import AtRiskClient, { type FlaggedStudent } from "./AtRiskClient";

function daysSince(dateString: string | null): number {
  if (!dateString) return Infinity;
  return (Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24);
}

export default async function AtRiskPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const counselor = await getCounselorRecord(supabase, user.id);
  if (!counselor) redirect("/dashboard");

  const { data: school } = await supabase
    .from("schools")
    .select("name")
    .eq("school_id", counselor.school_id)
    .maybeSingle();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .eq("school_id", counselor.school_id);

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

  const flagged: FlaggedStudent[] = [];
  for (const p of profiles ?? []) {
    const reasons: string[] = [];
    const overdueCount = overdueByUser.get(p.user_id) ?? 0;
    const activeMatchCount = matchCountByUser.get(p.user_id) ?? 0;
    const loginAge = daysSince(p.last_login_at);
    const incompleteProfile = !(
      p.intended_major &&
      p.extracurriculars?.length > 0 &&
      p.schools_already_considering &&
      p.test_scores
    );

    if (overdueCount > 0) reasons.push(`${overdueCount} overdue timeline item${overdueCount > 1 ? "s" : ""}`);
    if (activeMatchCount === 0) reasons.push("No active school matches");
    if (p.last_login_at === null) reasons.push("Never logged in");
    else if (loginAge >= 30) reasons.push(`No login in ${Math.floor(loginAge)}+ days`);
    else if (incompleteProfile && loginAge >= 14) reasons.push("Profile incomplete for 2+ weeks");

    if (reasons.length > 0) {
      flagged.push({
        user_id: p.user_id,
        name: emailByUser.get(p.user_id) ?? "Student",
        grade_level: p.grade_level,
        reasons,
      });
    }
  }

  flagged.sort((a, b) => b.reasons.length - a.reasons.length);

  return (
    <CounselorNavShell schoolName={school?.name ?? "Your School"}>
      <AtRiskClient students={flagged} />
    </CounselorNavShell>
  );
}
