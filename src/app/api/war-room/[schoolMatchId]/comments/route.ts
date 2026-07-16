import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isTrustedOrigin } from "@/lib/origin-check";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireString, rejectScriptTags, ValidationError } from "@/lib/validate";
import { isBlocked } from "@/lib/safety";

async function resolveRole(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  schoolMatchId: string
): Promise<"student" | "mentor" | "counselor" | null> {
  const { data: match, error: matchError } = await supabase
    .from("school_matches")
    .select("user_id, school_name")
    .eq("id", schoolMatchId)
    .maybeSingle();
  if (matchError) console.error("war-room resolveRole match query failed:", matchError);
  if (!match) return null;

  if (match.user_id === userId) return "student";

  const { data: counselorRow, error: counselorRowError } = await supabase
    .from("counselors")
    .select("counselor_id, school_id, profiles!inner(user_id, school_id)")
    .eq("user_id", userId)
    .eq("profiles.user_id", match.user_id)
    .maybeSingle();
  if (counselorRowError) console.error("war-room resolveRole counselor query failed:", counselorRowError);
  if (counselorRow) return "counselor";

  const { data: mentorRow, error: mentorRowError } = await supabase
    .from("mentor_requests")
    .select("id")
    .eq("mentor_id", userId)
    .eq("mentee_id", match.user_id)
    .eq("school_name", match.school_name)
    .eq("status", "accepted")
    .maybeSingle();
  if (mentorRowError) console.error("war-room resolveRole mentor query failed:", mentorRowError);
  if (mentorRow) return "mentor";

  return null;
}

export async function GET(req: Request, { params }: { params: Promise<{ schoolMatchId: string }> }) {
  if (!isTrustedOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { schoolMatchId } = await params;

  // RLS's "eligible_participants_read" policy restricts this to actual
  // participants; a non-participant's query just returns empty.
  const { data, error } = await supabase
    .from("war_room_comments")
    .select("id, user_id, role, body, created_at")
    .eq("school_match_id", schoolMatchId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: "Failed to fetch comments." }, { status: 500 });
  return NextResponse.json({ comments: data ?? [] });
}

export async function POST(req: Request, { params }: { params: Promise<{ schoolMatchId: string }> }) {
  if (!isTrustedOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await checkRateLimit(supabase, `war-room:${user.id}`, 30, 60_000)).ok) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment and try again." }, { status: 429 });
  }

  const { schoolMatchId } = await params;

  let body: string;
  try {
    const json = await req.json();
    body = requireString(json.body, "body", 4000);
    rejectScriptTags(body, "body");
  } catch (e) {
    if (e instanceof ValidationError) return NextResponse.json({ error: e.message }, { status: 400 });
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const role = await resolveRole(supabase, user.id, schoolMatchId);
  if (!role) return NextResponse.json({ error: "You don't have access to this application's war room." }, { status: 403 });

  if (role !== "student") {
    const { data: match, error: matchError } = await supabase.from("school_matches").select("user_id").eq("id", schoolMatchId).maybeSingle();
    if (matchError) console.error("war-room POST match query failed:", matchError);
    if (match && (await isBlocked(supabase, user.id, match.user_id))) {
      return NextResponse.json({ error: "Unable to post this comment." }, { status: 403 });
    }
  }

  const { error } = await supabase
    .from("war_room_comments")
    .insert({ school_match_id: schoolMatchId, user_id: user.id, role, body });

  if (error) return NextResponse.json({ error: "Failed to post comment." }, { status: 500 });
  return NextResponse.json({ ok: true, role });
}
