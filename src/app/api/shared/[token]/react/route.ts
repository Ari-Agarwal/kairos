import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

// Public endpoint — no auth cookie required, same trust model as
// GET /api/shared/[token]: the caller only needs a valid, unrevoked,
// unexpired share token. All access goes through the service-role client;
// no anon/public Supabase policy grants writes on shared_list_reactions.
//
// Lets a parent/family member holding the link react to (thumbs up/down)
// or leave a short comment on one of the student's matched schools. The
// student then sees this on their own /matches page. No financial/grades/
// essay content is accepted or exposed here — just a reaction + short note
// tied to a school match the token's own student owns.

const VALID_REACTIONS = new Set(["up", "down"]);

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token || typeof token !== "string" || token.length !== 64 || !/^[0-9a-f]+$/.test(token)) {
    return NextResponse.json({ error: "Invalid token." }, { status: 400 });
  }

  let body: { school_match_id?: unknown; reaction?: unknown; comment?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { school_match_id, reaction, comment } = body;

  if (typeof school_match_id !== "string" || school_match_id.length === 0) {
    return NextResponse.json({ error: "school_match_id is required." }, { status: 400 });
  }

  const reactionValue = reaction === null || reaction === undefined ? null : reaction;
  if (reactionValue !== null && (typeof reactionValue !== "string" || !VALID_REACTIONS.has(reactionValue))) {
    return NextResponse.json({ error: "reaction must be 'up', 'down', or omitted." }, { status: 400 });
  }

  const commentValue = comment === null || comment === undefined ? null : comment;
  if (commentValue !== null && (typeof commentValue !== "string" || commentValue.length > 500)) {
    return NextResponse.json({ error: "comment must be a string of 500 characters or fewer." }, { status: 400 });
  }

  const trimmedComment = commentValue?.trim() || null;
  if (reactionValue === null && !trimmedComment) {
    return NextResponse.json({ error: "Provide a reaction, a comment, or both." }, { status: 400 });
  }

  const service = createServiceClient();

  const rl = await checkRateLimit(service, `shared-react:${token}`, 30, 60 * 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });

  const { data: link, error: linkErr } = await service
    .from("shared_links")
    .select("user_id, expires_at, revoked_at")
    .eq("token", token)
    .single();

  if (linkErr || !link) {
    return NextResponse.json({ error: "Link not found." }, { status: 404 });
  }

  if (link.revoked_at !== null) {
    return NextResponse.json({ error: "This link has been revoked." }, { status: 410 });
  }

  if (new Date(link.expires_at) < new Date()) {
    return NextResponse.json({ error: "This link has expired." }, { status: 410 });
  }

  // Confirm the match actually belongs to this token's own student — stops
  // a valid token from being used to write against an unrelated match id.
  const { data: match, error: matchErr } = await service
    .from("school_matches")
    .select("id")
    .eq("id", school_match_id)
    .eq("user_id", link.user_id)
    .single();

  if (matchErr || !match) {
    return NextResponse.json({ error: "Match not found." }, { status: 404 });
  }

  const { error: insertErr } = await service.from("shared_list_reactions").insert({
    share_token: token,
    school_match_id,
    reaction: reactionValue,
    comment: trimmedComment,
  });

  if (insertErr) {
    console.error("shared reaction insert failed:", insertErr);
    return NextResponse.json({ error: "Could not save reaction." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
