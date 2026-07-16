import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isTrustedOrigin } from "@/lib/origin-check";
import { checkRateLimit } from "@/lib/rate-limit";
import { ValidationError, requireString, rejectScriptTags } from "@/lib/validate";
import { randomBytes } from "crypto";

export async function GET(req: Request) {
  if (!isTrustedOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("recommenders")
    .select("id, recommender_name, recommender_email, relationship, status, share_token, brag_sheet, last_reminded_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: "Failed to load recommenders." }, { status: 500 });
  return NextResponse.json({ recommenders: data ?? [] });
}

export async function POST(req: Request) {
  if (!isTrustedOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await checkRateLimit(supabase, `rec:${user.id}`, 30, 60 * 60 * 1000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  try {
    const b = body as Record<string, unknown>;

    const recommender_name = requireString(b.recommender_name, "recommender_name", 200);
    rejectScriptTags(recommender_name, "recommender_name");

    const relationship = requireString(b.relationship, "relationship", 200);
    rejectScriptTags(relationship, "relationship");

    let recommender_email: string | null = null;
    if (b.recommender_email && typeof b.recommender_email === "string" && b.recommender_email.trim() !== "") {
      recommender_email = b.recommender_email.trim();
      if (recommender_email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recommender_email)) {
        return NextResponse.json({ error: "recommender_email is not a valid email address." }, { status: 400 });
      }
    }

    const share_token = randomBytes(32).toString("hex");

    const { data, error } = await supabase
      .from("recommenders")
      .insert({
        user_id: user.id,
        recommender_name,
        recommender_email,
        relationship,
        share_token,
        brag_sheet: {},
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: "Failed to create recommender." }, { status: 500 });
    return NextResponse.json({ recommender: data }, { status: 201 });
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
}
