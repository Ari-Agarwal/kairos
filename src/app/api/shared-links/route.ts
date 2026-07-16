import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { isTrustedOrigin } from "@/lib/origin-check";
import { checkRateLimit } from "@/lib/rate-limit";
import { ValidationError, requireString, rejectScriptTags } from "@/lib/validate";

// 5 link creations per hour per student keeps this from being abused as a
// token-generation spray.
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000;

export async function POST(req: Request) {
  if (!isTrustedOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await checkRateLimit(supabase, `shared-links:${user.id}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  try {
    const b = body as Record<string, unknown>;
    let label: string | null = null;
    if (b.label !== undefined && b.label !== null && b.label !== "") {
      label = requireString(b.label, "label", 80);
      rejectScriptTags(label, "label");
    }

    // 256-bit random token — not guessable, not enumerable
    const token = randomBytes(32).toString("hex");

    const { data, error } = await supabase
      .from("shared_links")
      .insert({ token, user_id: user.id, label })
      .select()
      .single();

    if (error) return NextResponse.json({ error: "Failed to create link." }, { status: 500 });

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    return NextResponse.json({ link: data, url: `${baseUrl}/shared/${token}` }, { status: 201 });
  } catch (err) {
    if (err instanceof ValidationError) return NextResponse.json({ error: err.message }, { status: 400 });
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
}

export async function GET(req: Request) {
  if (!isTrustedOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("shared_links")
    .select("token, label, created_at, expires_at, revoked_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("shared-links GET failed:", error);
    return NextResponse.json({ error: "Failed to fetch links." }, { status: 500 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const links = (data ?? []).map((l) => ({ ...l, url: `${baseUrl}/shared/${l.token}` }));
  return NextResponse.json({ links });
}
