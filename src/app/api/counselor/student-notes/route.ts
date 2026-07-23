import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isTrustedOrigin } from "@/lib/origin-check";
import { getCounselorRecord } from "@/lib/access";
import { requireString, rejectScriptTags, ValidationError } from "@/lib/validate";

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

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const counselor = await getCounselorRecord(supabase, user.id);
  if (!counselor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const studentUserId = searchParams.get("studentUserId");
  if (!studentUserId) {
    return NextResponse.json({ error: "studentUserId is required." }, { status: 400 });
  }

  if (!(await verifyStudentInSchool(supabase, studentUserId, counselor.school_id))) {
    return NextResponse.json({ error: "Student not found." }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("counselor_student_notes")
    .select("id, body, created_at")
    .eq("counselor_id", counselor.counselor_id)
    .eq("student_user_id", studentUserId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("student-notes list failed:", error);
    return NextResponse.json({ error: "Failed to load notes." }, { status: 500 });
  }
  return NextResponse.json({ notes: data ?? [] });
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

  let noteBody: string;
  try {
    noteBody = requireString(body?.body, "Note", 5000);
    rejectScriptTags(noteBody, "Note");
  } catch (err) {
    if (err instanceof ValidationError) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }

  if (!(await verifyStudentInSchool(supabase, studentUserId, counselor.school_id))) {
    return NextResponse.json({ error: "Student not found." }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("counselor_student_notes")
    .insert({ counselor_id: counselor.counselor_id, student_user_id: studentUserId, body: noteBody })
    .select("id, body, created_at")
    .single();

  if (error) {
    console.error("student-notes insert failed:", error);
    return NextResponse.json({ error: "Failed to save note." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, note: data });
}
