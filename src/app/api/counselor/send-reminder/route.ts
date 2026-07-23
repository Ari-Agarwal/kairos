import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isTrustedOrigin } from "@/lib/origin-check";
import { getCounselorRecord } from "@/lib/access";
import { requireString, rejectScriptTags, ValidationError } from "@/lib/validate";
import { sendCounselorReminder } from "@/lib/email";

export async function POST(req: Request) {
  if (!isTrustedOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const counselor = await getCounselorRecord(supabase, user.id);
  if (!counselor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  // Bulk send (Software_Timeline.md 5m): studentUserIds takes priority when
  // present, so a counselor can message N flagged students in one action
  // instead of repeating this one at a time. studentUserId (singular) stays
  // supported for the existing single-student flow.
  const studentUserIds: unknown = body.studentUserIds ?? (body.studentUserId ? [body.studentUserId] : undefined);
  if (!Array.isArray(studentUserIds) || studentUserIds.length === 0 || !studentUserIds.every((id) => typeof id === "string")) {
    return NextResponse.json({ error: "studentUserId (or studentUserIds) is required." }, { status: 400 });
  }
  if (studentUserIds.length > 100) {
    return NextResponse.json({ error: "Too many students in one request (max 100)." }, { status: 400 });
  }

  let message: string;
  try {
    message = requireString(body.message, "Message", 2000);
    rejectScriptTags(message, "Message");
  } catch (err) {
    if (err instanceof ValidationError) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }

  const { data: profileRows, error: profileError } = await supabase
    .from("profiles")
    .select("user_id")
    .in("user_id", studentUserIds)
    .eq("school_id", counselor.school_id);
  if (profileError) console.error("send-reminder profile lookup failed:", profileError);
  const validIds = new Set((profileRows ?? []).map((p) => p.user_id));

  const serviceClient = createServiceClient();
  const results: { studentUserId: string; ok: boolean; error?: string }[] = [];

  for (const studentUserId of studentUserIds) {
    if (!validIds.has(studentUserId)) {
      results.push({ studentUserId, ok: false, error: "Student not found." });
      continue;
    }
    const { data: authUser, error: authUserError } = await serviceClient.auth.admin.getUserById(studentUserId);
    if (authUserError || !authUser.user?.email) {
      console.error("send-reminder student lookup failed:", authUserError);
      results.push({ studentUserId, ok: false, error: "Could not find the student's email." });
      continue;
    }
    const studentName = (authUser.user.user_metadata?.full_name as string | undefined) || "there";

    const { error: insertError } = await supabase
      .from("reminder_log")
      .insert({ counselor_id: counselor.counselor_id, student_user_id: studentUserId, message_text: message });
    if (insertError) {
      console.error("send-reminder log insert failed:", insertError);
      results.push({ studentUserId, ok: false, error: "Failed to log reminder." });
      continue;
    }

    try {
      await sendCounselorReminder(authUser.user.email, studentName, counselor.name, message);
      results.push({ studentUserId, ok: true });
    } catch (err) {
      console.error("send-reminder email send failed:", err);
      results.push({ studentUserId, ok: false, error: "Reminder logged but the email failed to send." });
    }
  }

  const sentCount = results.filter((r) => r.ok).length;
  if (sentCount === 0) {
    return NextResponse.json({ error: "Failed to send any reminders. Please try again.", results }, { status: 500 });
  }
  return NextResponse.json({ ok: true, sentCount, total: studentUserIds.length, results });
}
