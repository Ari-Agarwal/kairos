import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isTrustedOrigin } from "@/lib/origin-check";
import { getCounselorRecord } from "@/lib/access";
import { requireString, rejectScriptTags, ValidationError } from "@/lib/validate";

// Counselor-initiated timeline/task assignment (Software_Timeline.md 8):
// lets a counselor add a school-specific or cohort-wide task (e.g. "all
// seniors: financial aid night is Nov 3") directly onto one or many
// students' timelines, alongside the AI-generated items.
export async function POST(req: Request) {
  if (!isTrustedOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const counselor = await getCounselorRecord(supabase, user.id);
  if (!counselor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const studentUserIds: unknown = body.studentUserIds;
  if (!Array.isArray(studentUserIds) || studentUserIds.length === 0 || !studentUserIds.every((id) => typeof id === "string")) {
    return NextResponse.json({ error: "studentUserIds is required." }, { status: 400 });
  }
  if (studentUserIds.length > 200) {
    return NextResponse.json({ error: "Too many students in one request (max 200)." }, { status: 400 });
  }

  let title: string;
  let dueDate: string | null = null;
  try {
    title = requireString(body.title, "Title", 200);
    rejectScriptTags(title, "Title");
    if (body.dueDate !== undefined && body.dueDate !== "") {
      dueDate = requireString(body.dueDate, "Due date", 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
        return NextResponse.json({ error: "Due date must be YYYY-MM-DD." }, { status: 400 });
      }
    }
  } catch (err) {
    if (err instanceof ValidationError) return NextResponse.json({ error: err.message }, { status: 400 });
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { data: validProfiles, error: profileError } = await supabase
    .from("profiles")
    .select("user_id")
    .in("user_id", studentUserIds)
    .eq("school_id", counselor.school_id);
  if (profileError) console.error("assign-task profile lookup failed:", profileError);
  const validIds = (validProfiles ?? []).map((p) => p.user_id);

  if (validIds.length === 0) {
    return NextResponse.json({ error: "No matching students found." }, { status: 404 });
  }

  const rows = validIds.map((studentUserId) => ({
    user_id: studentUserId,
    title,
    due_date: dueDate,
    school_tags: [],
    tier: "free" as const,
    is_strategic: false,
    completed: false,
    why_text: `Assigned by your counselor, ${counselor.name}.`,
    what_to_do: [],
    assigned_by_counselor_id: counselor.counselor_id,
  }));

  const { error: insertError } = await supabase.from("timeline_items").insert(rows);
  if (insertError) {
    console.error("assign-task insert failed:", insertError);
    return NextResponse.json({ error: "Failed to assign task. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, assignedCount: validIds.length });
}
