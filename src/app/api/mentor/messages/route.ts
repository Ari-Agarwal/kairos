import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isTrustedOrigin } from "@/lib/origin-check";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireString, rejectScriptTags, ValidationError } from "@/lib/validate";
import { isBlocked } from "@/lib/safety";

export async function GET(req: Request) {
  if (!isTrustedOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const requestId = new URL(req.url).searchParams.get("requestId");
  if (!requestId) return NextResponse.json({ error: "requestId is required." }, { status: 400 });

  // RLS restricts this to participants of the request already; a non-participant's
  // query just returns empty rather than an error.
  const { data, error } = await supabase
    .from("mentor_messages")
    .select("id, sender_id, body, message_type, created_at")
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: "Failed to fetch messages." }, { status: 500 });
  return NextResponse.json({ messages: data ?? [] });
}

export async function POST(req: Request) {
  if (!isTrustedOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await checkRateLimit(supabase, `mentor-message:${user.id}`, 30, 60_000)).ok) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment and try again." }, { status: 429 });
  }

  let requestId: string;
  let body: string;
  let messageType: "chat" | "review_feedback" = "chat";
  try {
    const json = await req.json();
    requestId = requireString(json.requestId, "requestId", 100);
    body = requireString(json.body, "body", 4000);
    rejectScriptTags(body, "body");
    if (json.messageType === "review_feedback") messageType = "review_feedback";
  } catch (e) {
    if (e instanceof ValidationError) return NextResponse.json({ error: e.message }, { status: 400 });
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { data: request, error: requestError } = await supabase
    .from("mentor_requests")
    .select("mentee_id, mentor_id, status")
    .eq("id", requestId)
    .maybeSingle();

  if (requestError) {
    console.error("mentor messages request query failed:", requestError);
    return NextResponse.json({ error: "Failed to load request." }, { status: 500 });
  }

  if (!request) return NextResponse.json({ error: "Request not found." }, { status: 404 });
  const otherUserId = request.mentee_id === user.id ? request.mentor_id : request.mentee_id;
  if (await isBlocked(supabase, user.id, otherUserId)) {
    return NextResponse.json({ error: "Unable to send this message." }, { status: 403 });
  }

  // RLS's "participants_send_messages" policy is the real enforcement (status
  // must be 'accepted', sender must be a participant, and only the mentor
  // side may use message_type "review_feedback"); this app-layer check just
  // gives a clearer error message than a bare RLS denial.
  const { error } = await supabase
    .from("mentor_messages")
    .insert({ request_id: requestId, sender_id: user.id, body, message_type: messageType });
  if (error) return NextResponse.json({ error: "Failed to send message." }, { status: 500 });

  return NextResponse.json({ ok: true });
}
