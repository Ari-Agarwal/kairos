import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isTrustedOrigin } from "@/lib/origin-check";
import { checkRateLimit } from "@/lib/rate-limit";
import { ValidationError, requireString, rejectScriptTags } from "@/lib/validate";

const DECISION_TYPES = ["accept", "reject", "waitlist", "defer"] as const;
type DecisionType = (typeof DECISION_TYPES)[number];

function isDecisionType(v: unknown): v is DecisionType {
  return DECISION_TYPES.includes(v as DecisionType);
}

export async function POST(req: Request) {
  if (!isTrustedOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Rate-limit: notes is free text, keep it reasonable (20 submissions/hour)
  const rl = await checkRateLimit(supabase, `outcomes:${user.id}`, 20, 60 * 60 * 1000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  try {
    const b = body as Record<string, unknown>;

    const school_match_id = requireString(b.school_match_id, "school_match_id", 36);

    if (!isDecisionType(b.decision_type)) {
      return NextResponse.json({ error: "decision_type must be accept, reject, waitlist, or defer." }, { status: 400 });
    }
    const decision_type = b.decision_type;

    const decided_at = requireString(b.decided_at, "decided_at", 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(decided_at)) {
      return NextResponse.json({ error: "decided_at must be a date in YYYY-MM-DD format." }, { status: 400 });
    }

    let aid_offer_amount: number | null = null;
    if (b.aid_offer_amount !== undefined && b.aid_offer_amount !== null && b.aid_offer_amount !== "") {
      const parsed = Number(b.aid_offer_amount);
      if (!Number.isFinite(parsed) || parsed < 0) {
        return NextResponse.json({ error: "aid_offer_amount must be a non-negative number." }, { status: 400 });
      }
      aid_offer_amount = parsed;
    }

    let notes: string | null = null;
    if (b.notes !== undefined && b.notes !== null && b.notes !== "") {
      notes = requireString(b.notes, "notes", 1000);
      rejectScriptTags(notes, "notes");
    }

    // Verify the school_match_id belongs to this user before upsert — the RLS
    // with-check enforces it at the DB layer too, but an explicit check gives a
    // clearer 404 rather than a generic constraint error.
    const { data: matchRow, error: matchRowError } = await supabase
      .from("school_matches")
      .select("id")
      .eq("id", school_match_id)
      .eq("user_id", user.id)
      .single();
    if (matchRowError) console.error("outcomes matchRow query failed:", matchRowError);
    if (!matchRow) return NextResponse.json({ error: "Match not found." }, { status: 404 });

    const { data, error } = await supabase
      .from("application_outcomes")
      .upsert(
        {
          user_id: user.id,
          school_match_id,
          decision_type,
          aid_offer_amount,
          decided_at,
          notes,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,school_match_id" }
      )
      .select()
      .single();

    if (error) return NextResponse.json({ error: "Failed to save outcome." }, { status: 500 });
    return NextResponse.json({ outcome: data });
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
}
