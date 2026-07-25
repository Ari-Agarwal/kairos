// Self-serve account deletion for the mobile app (App Store guideline
// 5.1.1(v)). The web app's /api/account/delete route is cookie+origin
// gated, so native clients call this instead: the platform verifies the
// caller's JWT before invoking, we resolve the user from it, then run the
// SAME table-cleanup list as src/app/api/account/delete/route.ts.
// KEEP THE TWO LISTS IN SYNC: every table referencing auth.users without
// "on delete cascade" must be cleared here or deleteUser() fails on a
// foreign-key violation. See the web route's comment for the full
// rationale and the list of tables that cascade on their own.
import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  if (!jwt) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: userData, error: userError } = await admin.auth.getUser(jwt);
  if (userError || !userData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  const uid = userData.user.id;

  await admin.from("reminder_log").delete().eq("student_user_id", uid);
  await admin.from("counselor_notes").delete().eq("student_user_id", uid);
  await admin.from("at_risk_dismissals").delete().eq("student_user_id", uid);
  await admin.from("review_requests").delete().eq("user_id", uid);
  await admin.from("essay_feedback_history").delete().eq("user_id", uid);
  await admin.from("scholarship_tracker").delete().eq("user_id", uid);
  await admin.from("activity_evaluations").delete().eq("user_id", uid);
  await admin.from("generation_jobs").delete().eq("user_id", uid);
  await admin.from("regeneration_log").delete().eq("user_id", uid);
  await admin.from("timeline_items").delete().eq("user_id", uid);
  await admin.from("school_matches").delete().eq("user_id", uid);
  await admin.from("profiles").delete().eq("user_id", uid);

  const { error: deleteError } = await admin.auth.admin.deleteUser(uid);
  if (deleteError) {
    return new Response(JSON.stringify({ error: "Failed to delete account." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
