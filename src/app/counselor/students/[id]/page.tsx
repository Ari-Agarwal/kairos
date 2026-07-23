import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { getCounselorRecord } from "@/lib/access";
import CounselorNavShell from "@/components/CounselorNavShell";
import StudentDetailClient from "./StudentDetailClient";
import { computeFlags } from "@/lib/at-risk";

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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

  if (schoolError) console.error("student detail school query failed:", schoolError);

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", id)
    .eq("school_id", counselor.school_id)
    .maybeSingle();

  if (profileError) console.error("student detail profile query failed:", profileError);

  if (!profile) notFound();

  const studentName = (profile.display_name as string | null) ?? "Student";

  const { data: matches, error: matchesError } = await supabase
    .from("school_matches")
    .select("*")
    .eq("user_id", id)
    .eq("is_active", true)
    .order("category", { ascending: false })
    .order("percentage", { ascending: false });

  if (matchesError) console.error("student detail matches query failed:", matchesError);

  const { data: timelineItems, error: timelineError } = await supabase
    .from("timeline_items")
    .select("*")
    .eq("user_id", id)
    .order("due_date", { ascending: true, nullsFirst: false });

  if (timelineError) console.error("student detail timeline query failed:", timelineError);

  const { data: note, error: noteError } = await supabase
    .from("counselor_notes")
    .select("*")
    .eq("counselor_id", counselor.counselor_id)
    .eq("student_user_id", id)
    .maybeSingle();

  if (noteError) console.error("student detail note query failed:", noteError);

  const { data: studentNotes, error: studentNotesError } = await supabase
    .from("counselor_student_notes")
    .select("id, body, created_at")
    .eq("counselor_id", counselor.counselor_id)
    .eq("student_user_id", id)
    .order("created_at", { ascending: false });

  if (studentNotesError) console.error("student detail notes log query failed:", studentNotesError);

  // Consent-based narrative/essay visibility (Software_Timeline.md 8) -- RLS
  // ("counselor reads shared student narrative/essay feedback",
  // migration_055) already scopes these to only return rows when the
  // student has explicitly opted in via profiles.share_narrative_with_counselor,
  // so no extra app-level check is needed here: an empty result means either
  // no content or no consent, and the UI treats both the same way (nothing
  // to show yet), never distinguishing "declined" from "hasn't done it."
  const { data: narrativeProfile, error: narrativeError } = await supabase
    .from("narrative_profiles")
    .select("throughline, core_values, growth_arc, differentiator")
    .eq("user_id", id)
    .maybeSingle();
  if (narrativeError) console.error("student detail narrative query failed:", narrativeError);

  const { data: essayHistory, error: essayError } = await supabase
    .from("essay_feedback_history")
    .select("id, school, created_at, is_rubric")
    .eq("user_id", id)
    .order("created_at", { ascending: false })
    .limit(5);
  if (essayError) console.error("student detail essay history query failed:", essayError);

  // Meeting-prep export (Software_Timeline.md 16): reuse the same at-risk
  // definition as /counselor/at-risk and /counselor/aggregate so the export
  // can't disagree with the roster about what "at risk" means.
  const activeMatchCount = (matches ?? []).length;
  const overdueCount = (timelineItems ?? []).filter(
    (i) => !i.completed && i.due_date && i.due_date < new Date().toISOString().slice(0, 10)
  ).length;
  const riskFlags = computeFlags(
    [
      {
        user_id: id,
        grade_level: profile.grade_level,
        last_login_at: (profile.last_login_at as string | null) ?? null,
        intended_major: profile.intended_major,
        extracurriculars: profile.extracurriculars,
        schools_already_considering: profile.schools_already_considering,
        test_scores: profile.test_scores,
      },
    ],
    new Map([[id, activeMatchCount]]),
    new Map([[id, overdueCount]])
  );

  const { data: reviewRequests, error: reviewRequestsError } = await supabase
    .from("review_requests")
    .select("id, status, review_notes, created_at")
    .eq("user_id", id)
    .neq("status", "completed")
    .order("created_at", { ascending: false });
  if (reviewRequestsError) console.error("student detail review requests query failed:", reviewRequestsError);

  return (
    <CounselorNavShell schoolName={school?.name ?? "Your School"}>
      <StudentDetailClient
        studentName={studentName}
        profile={profile}
        matches={matches ?? []}
        timelineItems={timelineItems ?? []}
        counselorId={counselor.counselor_id}
        studentUserId={id}
        initialNoteText={note?.note_text ?? ""}
        initialStudentNotes={studentNotes ?? []}
        narrativeProfile={narrativeProfile ?? null}
        essayHistory={essayHistory ?? []}
        shareNarrativeWithCounselor={Boolean(profile.share_narrative_with_counselor)}
        riskReasons={riskFlags[0]?.reasons ?? []}
        reviewRequests={reviewRequests ?? []}
      />
    </CounselorNavShell>
  );
}
