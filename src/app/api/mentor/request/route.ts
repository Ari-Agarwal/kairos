import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isTrustedOrigin } from "@/lib/origin-check";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireString, rejectScriptTags, ValidationError } from "@/lib/validate";
import { isBlocked } from "@/lib/safety";

export async function POST(req: Request) {
  if (!isTrustedOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await checkRateLimit(supabase, `mentor-request:${user.id}`, 20, 60_000)).ok) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment and try again." }, { status: 429 });
  }

  let mentorId: string;
  let schoolName: string;
  let intro: string;
  try {
    const body = await req.json();
    mentorId = requireString(body.mentorId, "mentorId", 100);
    schoolName = requireString(body.schoolName, "schoolName", 200);
    intro = requireString(body.intro, "intro", 1000);
    rejectScriptTags(schoolName, "schoolName");
    rejectScriptTags(intro, "intro");
  } catch (e) {
    if (e instanceof ValidationError) return NextResponse.json({ error: e.message }, { status: 400 });
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (mentorId === user.id) {
    return NextResponse.json({ error: "Cannot request yourself as a mentor." }, { status: 400 });
  }
  if (await isBlocked(supabase, user.id, mentorId)) {
    return NextResponse.json({ error: "Unable to send this request." }, { status: 403 });
  }

  const { error } = await supabase
    .from("mentor_requests")
    .insert({ mentee_id: user.id, mentor_id: mentorId, school_name: schoolName, intro });

  if (error) return NextResponse.json({ error: "Failed to send mentor request." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
