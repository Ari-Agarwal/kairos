import { createClient, createServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCounselorRecord } from "@/lib/access";
import CounselorNavShell from "@/components/CounselorNavShell";
import StudentRosterClient from "./StudentRosterClient";

export interface RosterStudent {
  user_id: string;
  name: string;
  grade_level: string;
  gpa: number;
  schools_already_considering: string | null;
  activeMatchCount: number;
  incompleteTimelineCount: number;
  overdueCount: number;
  status: "On Track" | "Needs Attention" | "No Activity";
  lastLoginAt: string | null;
}

function isProfileComplete(profile: {
  intended_major: string | null;
  extracurriculars: string[] | null;
  schools_already_considering: string | null;
  test_scores: unknown;
}): boolean {
  return Boolean(
    profile.intended_major &&
      profile.extracurriculars &&
      profile.extracurriculars.length > 0 &&
      profile.schools_already_considering &&
      profile.test_scores
  );
}

function daysSince(dateString: string | null): number {
  if (!dateString) return Infinity;
  return (Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24);
}

export default async function CounselorHomePage() {
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
      const email = res.data.user?.user_metadata?.full_name ?? res.data.user?.email;
      if (email) emailByUser.set(studentIds[i], email);
    });
  }

  const { data: matches } = studentIds.length
    ? await supabase
        .from("school_matches")
        .select("user_id")
        .in("user_id", studentIds)
        .eq("is_active", true)
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
  const timelineByUser = new Map<string, { incomplete: number; overdue: number }>();
  for (const item of timelineItems ?? []) {
    if (item.is_strategic) continue;
    const entry = timelineByUser.get(item.user_id) ?? { incomplete: 0, overdue: 0 };
    if (!item.completed) {
      entry.incomplete += 1;
      if (item.due_date && item.due_date < today) entry.overdue += 1;
    }
    timelineByUser.set(item.user_id, entry);
  }

  const students: RosterStudent[] = (profiles ?? []).map((p) => {
    const activeMatchCount = matchCountByUser.get(p.user_id) ?? 0;
    const timeline = timelineByUser.get(p.user_id) ?? { incomplete: 0, overdue: 0 };
    const complete = isProfileComplete(p);
    const loginAge = daysSince(p.last_login_at);

    let status: RosterStudent["status"];
    if (loginAge >= 30) {
      status = "No Activity";
    } else if (timeline.overdue > 0 || (!complete && loginAge >= 14) || activeMatchCount === 0) {
      status = "Needs Attention";
    } else {
      status = "On Track";
    }

    return {
      user_id: p.user_id,
      name: emailByUser.get(p.user_id) ?? "Student",
      grade_level: p.grade_level,
      gpa: p.gpa,
      schools_already_considering: p.schools_already_considering,
      activeMatchCount,
      incompleteTimelineCount: timeline.incomplete,
      overdueCount: timeline.overdue,
      status,
      lastLoginAt: p.last_login_at,
    };
  });

  const stats = {
    total: students.length,
    incompleteProfiles: (profiles ?? []).filter((p) => !isProfileComplete(p)).length,
    noMatches: students.filter((s) => s.activeMatchCount === 0).length,
    overdue: students.filter((s) => s.overdueCount > 0).length,
  };

  return (
    <CounselorNavShell schoolName={school?.name ?? "Your School"}>
      <StudentRosterClient students={students} stats={stats} />
    </CounselorNavShell>
  );
}
