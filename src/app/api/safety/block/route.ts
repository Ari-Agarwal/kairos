import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isTrustedOrigin } from "@/lib/origin-check";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireString } from "@/lib/validate";
import { createBlock } from "@/lib/safety";

export async function POST(req: Request) {
  if (!isTrustedOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await checkRateLimit(supabase, `safety-block:${user.id}`, 20, 60_000)).ok) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment and try again." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

  let blockedUserId: string;
  try {
    blockedUserId = requireString(body.blockedUserId, "blockedUserId", 100);
  } catch {
    return NextResponse.json({ error: "blockedUserId is required." }, { status: 400 });
  }

  if (blockedUserId === user.id) {
    return NextResponse.json({ error: "Cannot block yourself." }, { status: 400 });
  }

  const { error } = await createBlock(supabase, user.id, blockedUserId);
  if (error) return NextResponse.json({ error: "Failed to block user." }, { status: 500 });

  return NextResponse.json({ ok: true });
}
