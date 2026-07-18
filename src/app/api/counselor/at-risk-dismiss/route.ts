import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isTrustedOrigin } from "@/lib/origin-check";
import { getCounselorRecord } from "@/lib/access";

const DEFAULT_SNOOZE_DAYS = 14;

async function verifyStudentInSchool(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studentUserId: string,
  schoolId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("user_id", studentUserId)
    .eq("school_id", schoolId)
    .maybeSingle();
  return !!data;
}

export async function POST(req: Request) {
  if (!isTrustedOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const counselor = await getCounselorRecord(supabase, user.id);
  if (!counselor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const studentUserId = body?.studentUserId;
  if (typeof studentUserId !== "string") {
    return NextResponse.json({ error: "studentUserId is required." }, { status: 400 });
  }
  const days = typeof body?.days === "number" && body.days > 0 ? Math.min(body.days, 90) : DEFAULT_SNOOZE_DAYS;

  if (!(await verifyStudentInSchool(supabase, studentUserId, counselor.school_id))) {
    return NextResponse.json({ error: "Student not found." }, { status: 404 });
  }

  const dismissedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from("at_risk_dismissals")
    .upsert(
      { counselor_id: counselor.counselor_id, student_user_id: studentUserId, dismissed_until: dismissedUntil },
      { onConflict: "counselor_id,student_user_id" }
    );

  if (error) {
    console.error("at-risk-dismiss upsert failed:", error);
    return NextResponse.json({ error: "Failed to snooze this flag." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, dismissedUntil });
}

export async function DELETE(req: Request) {
  if (!isTrustedOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const counselor = await getCounselorRecord(supabase, user.id);
  if (!counselor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const studentUserId = body?.studentUserId;
  if (typeof studentUserId !== "string") {
    return NextResponse.json({ error: "studentUserId is required." }, { status: 400 });
  }

  const { error } = await supabase
    .from("at_risk_dismissals")
    .delete()
    .eq("counselor_id", counselor.counselor_id)
    .eq("student_user_id", studentUserId);

  if (error) {
    console.error("at-risk-dismiss delete failed:", error);
    return NextResponse.json({ error: "Failed to un-snooze this flag." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
