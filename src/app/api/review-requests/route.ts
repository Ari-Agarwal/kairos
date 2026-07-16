import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isTrustedOrigin } from "@/lib/origin-check";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireString, rejectScriptTags, ValidationError } from "@/lib/validate";

// One request per student per calendar year.
const YEARLY_CAP = 1;

function yearStart(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-01-01`;
}

export async function GET(req: Request) {
  if (!isTrustedOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: requests, error } = await supabase
    .from("review_requests")
    .select("id, status, review_notes, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("review-requests GET failed:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }

  const usedThisCycle = (requests ?? []).filter(
    (r) => r.created_at >= yearStart()
  ).length;

  return NextResponse.json({
    requests: requests ?? [],
    usedThisCycle,
    remainingThisCycle: Math.max(0, YEARLY_CAP - usedThisCycle),
  });
}

export async function POST(req: Request) {
  if (!isTrustedOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await checkRateLimit(supabase, `review-request:${user.id}`, 5, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  let reviewNotes: string;
  try {
    reviewNotes = requireString((body as Record<string, unknown>).review_notes, "Review notes", 2000);
    rejectScriptTags(reviewNotes, "Review notes");
  } catch (e) {
    if (e instanceof ValidationError) return NextResponse.json({ error: e.message }, { status: 422 });
    throw e;
  }

  // Enforce yearly cap — count existing requests in the current calendar year.
  const { count, error: countError } = await supabase
    .from("review_requests")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", yearStart());

  if (countError) return NextResponse.json({ error: "Failed to check eligibility" }, { status: 500 });
  if ((count ?? 0) >= YEARLY_CAP) {
    return NextResponse.json(
      { error: "You have already used your one human review for this admissions cycle." },
      { status: 409 }
    );
  }

  const { data: newRequest, error: insertError } = await supabase
    .from("review_requests")
    .insert({ user_id: user.id, review_notes: reviewNotes })
    .select("id, status, created_at")
    .single();

  if (insertError) return NextResponse.json({ error: "Failed to submit" }, { status: 500 });

  return NextResponse.json({ request: newRequest }, { status: 201 });
}
