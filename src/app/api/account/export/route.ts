import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isTrustedOrigin } from "@/lib/origin-check";

// Section 12b: a real, user-facing "export my data" capability -- previously
// the only way to get a student's data out was an internal admin/testing
// script (delete_one_student.sql etc.), not something the student themselves
// could do. Pulls every table scoped to the authenticated user via the
// regular (RLS-enforced) client, not the service-role client -- this route
// should never be able to return more than the student could already see
// in the app themselves.
export async function GET(req: Request) {
  if (!isTrustedOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [
    profile,
    schoolMatches,
    timelineItems,
    narrativeProfile,
    essayFeedbackHistory,
    activityEvaluations,
    scholarshipTracker,
    applicationOutcomes,
    recommenders,
    mentorRequestsSent,
    mentorRequestsReceived,
    interviewSessions,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("school_matches").select("*").eq("user_id", user.id),
    supabase.from("timeline_items").select("*").eq("user_id", user.id),
    supabase.from("narrative_profiles").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("essay_feedback_history").select("*").eq("user_id", user.id),
    supabase.from("activity_evaluations").select("*").eq("user_id", user.id),
    supabase.from("scholarship_tracker").select("*").eq("user_id", user.id),
    supabase.from("application_outcomes").select("*").eq("user_id", user.id),
    supabase.from("recommenders").select("recommender_name, recommender_email, relationship, status, brag_sheet, created_at").eq("user_id", user.id),
    supabase.from("mentor_requests").select("*").eq("mentee_id", user.id),
    supabase.from("mentor_requests").select("*").eq("mentor_id", user.id),
    supabase.from("interview_sessions").select("*").eq("user_id", user.id),
  ]);

  const exportData = {
    exported_at: new Date().toISOString(),
    account_email: user.email,
    profile: profile.data ?? null,
    school_matches: schoolMatches.data ?? [],
    timeline_items: timelineItems.data ?? [],
    narrative_profile: narrativeProfile.data ?? null,
    essay_feedback_history: essayFeedbackHistory.data ?? [],
    activity_evaluations: activityEvaluations.data ?? [],
    scholarship_tracker: scholarshipTracker.data ?? [],
    application_outcomes: applicationOutcomes.data ?? [],
    recommenders: recommenders.data ?? [],
    mentor_requests_sent: mentorRequestsSent.data ?? [],
    mentor_requests_received: mentorRequestsReceived.data ?? [],
    interview_sessions: interviewSessions.data ?? [],
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="kairos-data-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
