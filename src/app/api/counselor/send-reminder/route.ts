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
  const studentUserId = body.studentUserId;
  if (typeof studentUserId !== "string") {
    return NextResponse.json({ error: "studentUserId is required." }, { status: 400 });
  }

  let message: string;
  try {
    message = requireString(body.message, "Message", 2000);
    rejectScriptTags(message, "Message");
  } catch (err) {
    if (err instanceof ValidationError) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("user_id", studentUserId)
    .eq("school_id", counselor.school_id)
    .maybeSingle();
  if (profileError) console.error("send-reminder profile lookup failed:", profileError);
  if (!profile) return NextResponse.json({ error: "Student not found." }, { status: 404 });

  const serviceClient = createServiceClient();
  const { data: authUser, error: authUserError } = await serviceClient.auth.admin.getUserById(studentUserId);
  if (authUserError || !authUser.user?.email) {
    console.error("send-reminder student lookup failed:", authUserError);
    return NextResponse.json({ error: "Could not find the student's email." }, { status: 500 });
  }
  const studentName = (authUser.user.user_metadata?.full_name as string | undefined) || "there";

  const { error: insertError } = await supabase
    .from("reminder_log")
    .insert({ counselor_id: counselor.counselor_id, student_user_id: studentUserId, message_text: message });
  if (insertError) {
    console.error("send-reminder log insert failed:", insertError);
    return NextResponse.json({ error: "Failed to send reminder. Please try again." }, { status: 500 });
  }

  try {
    await sendCounselorReminder(authUser.user.email, studentName, counselor.name, message);
  } catch (err) {
    console.error("send-reminder email send failed:", err);
    return NextResponse.json({ error: "Reminder logged but the email failed to send." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
