import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isTrustedOrigin } from "@/lib/origin-check";

export async function POST(req: Request) {
  if (!isTrustedOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createServiceClient();

  // Every table here references auth.users WITHOUT "on delete cascade", so
  // Postgres blocks deleteUser() below with a foreign-key violation if any
  // row is left behind -- this list was originally incomplete (missing the
  // six tables added below), meaning self-serve deletion silently failed
  // for any student with essay feedback history, a tracked scholarship, a
  // logged activity evaluation, a pending human-review request, an at-risk
  // dismissal on a counselor's roster, or (almost universally, since it
  // backs Timeline's background-job generation) a generation_jobs row.
  // Tables with an explicit "on delete cascade" to auth.users (narrative_profiles,
  // recommenders, interview_sessions, mentor_requests/messages, shared_links,
  // blocked_users/reports) don't need an entry here -- Postgres removes them
  // automatically. application_outcomes also needs no entry: its FK cascades
  // from school_matches, which is already deleted below.
  await admin.from("reminder_log").delete().eq("student_user_id", user.id);
  await admin.from("counselor_notes").delete().eq("student_user_id", user.id);
  await admin.from("at_risk_dismissals").delete().eq("student_user_id", user.id);
  await admin.from("review_requests").delete().eq("user_id", user.id);
  await admin.from("essay_feedback_history").delete().eq("user_id", user.id);
  await admin.from("scholarship_tracker").delete().eq("user_id", user.id);
  await admin.from("activity_evaluations").delete().eq("user_id", user.id);
  await admin.from("generation_jobs").delete().eq("user_id", user.id);
  await admin.from("regeneration_log").delete().eq("user_id", user.id);
  await admin.from("timeline_items").delete().eq("user_id", user.id);
  await admin.from("school_matches").delete().eq("user_id", user.id);
  await admin.from("profiles").delete().eq("user_id", user.id);

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return NextResponse.json({ error: "Failed to delete account." }, { status: 500 });

  return NextResponse.json({ ok: true });
}
