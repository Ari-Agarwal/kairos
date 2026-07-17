import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isTrustedOrigin } from "@/lib/origin-check";
import { checkRateLimit } from "@/lib/rate-limit";
import { ValidationError, requireString, rejectScriptTags } from "@/lib/validate";
import { getAnthropic, MODEL, LETTER_OF_CONTINUED_INTEREST_PROMPT, extractJson } from "@/lib/anthropic";
import { logAiUsage, flagAnomalousUsage } from "@/lib/ai-usage-log";

export async function POST(req: Request) {
  if (!isTrustedOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 5 drafts per minute — this calls Anthropic, so keep it tight
  const rl = await checkRateLimit(supabase, `loci:${user.id}`, 5, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests. Please wait a moment and try again." }, { status: 429 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  try {
    const b = body as Record<string, unknown>;

    const school_match_id = requireString(b.school_match_id, "school_match_id", 36);

    let updates: string | null = null;
    if (b.updates !== undefined && b.updates !== null && b.updates !== "") {
      updates = requireString(b.updates, "updates", 2000);
      rejectScriptTags(updates, "updates");
    }

    // Verify the outcome belongs to this user and is waitlist or defer
    const { data: outcome, error: outcomeError } = await supabase
      .from("application_outcomes")
      .select("decision_type, school_match_id")
      .eq("school_match_id", school_match_id)
      .eq("user_id", user.id)
      .single();

    if (outcomeError) console.error("outcomes letter outcome query failed:", outcomeError);
    if (!outcome) return NextResponse.json({ error: "Outcome not found." }, { status: 404 });
    if (outcome.decision_type !== "waitlist" && outcome.decision_type !== "defer") {
      return NextResponse.json({ error: "A letter of continued interest is only applicable for waitlist or deferral outcomes." }, { status: 400 });
    }

    // Pull the school name from the match record
    const { data: matchRow, error: matchRowError } = await supabase
      .from("school_matches")
      .select("school_name")
      .eq("id", school_match_id)
      .eq("user_id", user.id)
      .single();

    if (matchRowError) console.error("outcomes letter matchRow query failed:", matchRowError);
    if (!matchRow) return NextResponse.json({ error: "Match not found." }, { status: 404 });

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("unweighted_gpa, weighted_gpa, intended_major, extracurriculars, career_goals")
      .eq("user_id", user.id)
      .single();

    if (profileError) console.error("outcomes letter profile query failed:", profileError);
    if (!profile) return NextResponse.json({ error: "Profile not found." }, { status: 404 });

    const schoolName = matchRow.school_name as string;
    const profileSummary = [
      `School: ${schoolName}`,
      `Intended major: ${profile.intended_major?.length ? profile.intended_major.join(", ") : "not provided"}`,
      `Unweighted GPA: ${profile.unweighted_gpa ?? "not provided"}`,
      profile.weighted_gpa ? `Weighted GPA: ${profile.weighted_gpa}` : null,
      `Extracurriculars: ${Array.isArray(profile.extracurriculars) && profile.extracurriculars.length > 0 ? (profile.extracurriculars as string[]).join("; ") : "not provided"}`,
      profile.career_goals ? `Career goals: ${profile.career_goals}` : null,
      updates ? `Updates to mention: ${updates}` : "Updates to mention: none provided",
    ]
      .filter(Boolean)
      .join("\n");

    flagAnomalousUsage("outcomes/letter", user.id);
    const t0 = Date.now();
    const response = await getAnthropic().messages.create({
      model: MODEL,
      max_tokens: 1024,
      thinking: { type: "disabled" },
      system: LETTER_OF_CONTINUED_INTEREST_PROMPT,
      messages: [{ role: "user", content: profileSummary }],
    });
    logAiUsage("outcomes/letter", user.id, MODEL, t0, response);

    const text = response.content.find((b) => b.type === "text")?.text ?? "";
    const parsed = extractJson<{ letter: string; caveat: string }>(text);
    return NextResponse.json({ letter: parsed.letter, caveat: parsed.caveat, school: schoolName });
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to generate letter. Please try again." }, { status: 502 });
  }
}
