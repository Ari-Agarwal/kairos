import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireString, rejectScriptTags, ValidationError } from "@/lib/validate";
import { checkRateLimit } from "@/lib/rate-limit";

// Public (no auth cookie) -- same shape as /api/shared/[token]: token
// validated against shared_links via the service-role client, which is the
// only path that can touch war_room_comments for a token-based (parent)
// commenter, since no RLS policy grants direct anon access to that table.
async function validateAndGetOwner(token: string, schoolMatchId: string) {
  if (!token || token.length !== 64 || !/^[0-9a-f]+$/.test(token)) return null;

  const service = createServiceClient();
  const { data: link, error: linkError } = await service
    .from("shared_links")
    .select("user_id, expires_at, revoked_at")
    .eq("token", token)
    .single();

  if (linkError) console.error("war-room parent link query failed:", linkError);
  if (!link || link.revoked_at !== null || new Date(link.expires_at) < new Date()) return null;

  const { data: match, error: matchError } = await service
    .from("school_matches")
    .select("user_id")
    .eq("id", schoolMatchId)
    .single();

  if (matchError) console.error("war-room parent match query failed:", matchError);

  if (!match || match.user_id !== link.user_id) return null;
  return link.user_id;
}

export async function GET(_req: Request, { params }: { params: Promise<{ token: string; schoolMatchId: string }> }) {
  const { token, schoolMatchId } = await params;
  const ownerId = await validateAndGetOwner(token, schoolMatchId);
  if (!ownerId) return NextResponse.json({ error: "Link not found or expired." }, { status: 404 });

  const service = createServiceClient();

  const rl = await checkRateLimit(service, `war-room-parent-read:${token}`, 60, 60 * 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });

  const { data, error } = await service
    .from("war_room_comments")
    .select("id, role, body, created_at")
    .eq("school_match_id", schoolMatchId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: "Failed to fetch comments." }, { status: 500 });
  return NextResponse.json({ comments: data ?? [] });
}

export async function POST(req: Request, { params }: { params: Promise<{ token: string; schoolMatchId: string }> }) {
  const { token, schoolMatchId } = await params;
  const ownerId = await validateAndGetOwner(token, schoolMatchId);
  if (!ownerId) return NextResponse.json({ error: "Link not found or expired." }, { status: 404 });

  const service = createServiceClient();

  // Tighter than the read limit -- this is an unauthenticated write path.
  const rl = await checkRateLimit(service, `war-room-parent-post:${token}`, 15, 60 * 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });

  let body: string;
  try {
    const json = await req.json();
    body = requireString(json.body, "body", 4000);
    rejectScriptTags(body, "body");
  } catch (e) {
    if (e instanceof ValidationError) return NextResponse.json({ error: e.message }, { status: 400 });
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { error } = await service
    .from("war_room_comments")
    .insert({ school_match_id: schoolMatchId, shared_link_token: token, role: "parent", body });

  if (error) return NextResponse.json({ error: "Failed to post comment." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
