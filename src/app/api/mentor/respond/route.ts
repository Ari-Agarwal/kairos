import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isTrustedOrigin } from "@/lib/origin-check";
import { requireString, ValidationError } from "@/lib/validate";

export async function POST(req: Request) {
  if (!isTrustedOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let requestId: string;
  let status: string;
  try {
    const body = await req.json();
    requestId = requireString(body.requestId, "requestId", 100);
    status = requireString(body.status, "status", 20);
  } catch (e) {
    if (e instanceof ValidationError) return NextResponse.json({ error: e.message }, { status: 400 });
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (status !== "accepted" && status !== "declined") {
    return NextResponse.json({ error: "status must be 'accepted' or 'declined'." }, { status: 400 });
  }

  // RLS's "mentor_responds" policy already restricts this update to rows
  // where auth.uid() = mentor_id, so a mentee (or anyone else) attempting
  // this against a request they don't own affects zero rows.
  const { error, count } = await supabase
    .from("mentor_requests")
    .update({ status, responded_at: new Date().toISOString() }, { count: "exact" })
    .eq("id", requestId)
    .eq("mentor_id", user.id);

  if (error) return NextResponse.json({ error: "Failed to respond to request." }, { status: 500 });
  if (!count) return NextResponse.json({ error: "Request not found." }, { status: 404 });

  return NextResponse.json({ ok: true });
}
