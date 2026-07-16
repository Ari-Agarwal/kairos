import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isTrustedOrigin } from "@/lib/origin-check";
import { checkRateLimit } from "@/lib/rate-limit";
import { ValidationError, requireString, rejectScriptTags } from "@/lib/validate";
import { getAnthropic, MODEL, AID_APPEAL_PROMPT, extractJson } from "@/lib/anthropic";
import { logAiUsage, flagAnomalousUsage } from "@/lib/ai-usage-log";

export async function POST(req: Request) {
  if (!isTrustedOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await checkRateLimit(supabase, `appeal:${user.id}`, 5, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests. Please wait a moment and try again." }, { status: 429 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  let appealT0 = 0;
  try {
    const b = body as Record<string, unknown>;

    const appeal_school_match_id = requireString(b.appeal_school_match_id, "appeal_school_match_id", 36);
    const compare_school_match_id = requireString(b.compare_school_match_id, "compare_school_match_id", 36);

    if (appeal_school_match_id === compare_school_match_id) {
      return NextResponse.json({ error: "Appeal school and comparison school must be different." }, { status: 400 });
    }

    let circumstances: string | null = null;
    if (b.circumstances !== undefined && b.circumstances !== null && b.circumstances !== "") {
      circumstances = requireString(b.circumstances, "circumstances", 2000);
      rejectScriptTags(circumstances, "circumstances");
    }

    // Verify both outcomes belong to the caller and have logged aid amounts.
    // Fetching both in parallel.
    const [appealOutcomeRes, compareOutcomeRes] = await Promise.all([
      supabase
        .from("application_outcomes")
        .select("aid_offer_amount, school_match_id")
        .eq("school_match_id", appeal_school_match_id)
        .eq("user_id", user.id)
        .single(),
      supabase
        .from("application_outcomes")
        .select("aid_offer_amount, school_match_id")
        .eq("school_match_id", compare_school_match_id)
        .eq("user_id", user.id)
        .single(),
    ]);

    if (appealOutcomeRes.error) console.error("outcomes appeal appealOutcomeRes query failed:", appealOutcomeRes.error);
    if (compareOutcomeRes.error) console.error("outcomes appeal compareOutcomeRes query failed:", compareOutcomeRes.error);

    if (!appealOutcomeRes.data) {
      return NextResponse.json({ error: "No logged outcome found for the appeal school. Log your decision and aid offer first." }, { status: 404 });
    }
    if (appealOutcomeRes.data.aid_offer_amount === null || appealOutcomeRes.data.aid_offer_amount === undefined) {
      return NextResponse.json({ error: "No aid offer amount logged for the appeal school. Edit your logged decision to add the aid offer before generating an appeal." }, { status: 400 });
    }

    if (!compareOutcomeRes.data) {
      return NextResponse.json({ error: "No logged outcome found for the comparison school. Log your decision and aid offer for that school first." }, { status: 404 });
    }
    if (compareOutcomeRes.data.aid_offer_amount === null || compareOutcomeRes.data.aid_offer_amount === undefined) {
      return NextResponse.json({ error: "No aid offer amount logged for the comparison school. Edit your logged decision to add the aid offer before generating an appeal." }, { status: 400 });
    }

    // Pull school names from match records.
    const [appealMatchRes, compareMatchRes] = await Promise.all([
      supabase.from("school_matches").select("school_name").eq("id", appeal_school_match_id).eq("user_id", user.id).single(),
      supabase.from("school_matches").select("school_name").eq("id", compare_school_match_id).eq("user_id", user.id).single(),
    ]);

    if (appealMatchRes.error) console.error("outcomes appeal appealMatchRes query failed:", appealMatchRes.error);
    if (compareMatchRes.error) console.error("outcomes appeal compareMatchRes query failed:", compareMatchRes.error);
    if (!appealMatchRes.data) return NextResponse.json({ error: "Appeal school match not found." }, { status: 404 });
    if (!compareMatchRes.data) return NextResponse.json({ error: "Comparison school match not found." }, { status: 404 });

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("unweighted_gpa, weighted_gpa, intended_major, extracurriculars, career_goals")
      .eq("user_id", user.id)
      .single();

    if (profileError) console.error("outcomes appeal profile query failed:", profileError);
    if (!profile) return NextResponse.json({ error: "Profile not found." }, { status: 404 });

    const appealSchool = appealMatchRes.data.school_name as string;
    const compareSchool = compareMatchRes.data.school_name as string;
    const appealAmount = Number(appealOutcomeRes.data.aid_offer_amount);
    const compareAmount = Number(compareOutcomeRes.data.aid_offer_amount);

    const context = [
      `Appeal school: ${appealSchool}`,
      `Appeal school aid offer: $${appealAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `Comparison school: ${compareSchool}`,
      `Comparison school aid offer: $${compareAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `Intended major: ${profile.intended_major ?? "not provided"}`,
      `Unweighted GPA: ${profile.unweighted_gpa ?? "not provided"}`,
      profile.weighted_gpa ? `Weighted GPA: ${profile.weighted_gpa}` : null,
      `Extracurriculars: ${Array.isArray(profile.extracurriculars) && profile.extracurriculars.length > 0 ? (profile.extracurriculars as string[]).join("; ") : "not provided"}`,
      profile.career_goals ? `Career goals: ${profile.career_goals}` : null,
      circumstances ? `Special circumstances: ${circumstances}` : "Special circumstances: none provided",
    ]
      .filter(Boolean)
      .join("\n");

    flagAnomalousUsage("outcomes/appeal", user.id);
    appealT0 = Date.now();
    const response = await getAnthropic().messages.create({
      model: MODEL,
      max_tokens: 1024,
      thinking: { type: "disabled" },
      system: AID_APPEAL_PROMPT,
      messages: [{ role: "user", content: context }],
    });
    logAiUsage("outcomes/appeal", user.id, MODEL, appealT0, response);

    const text = response.content.find((b) => b.type === "text")?.text ?? "";
    const parsed = extractJson<{ letter: string; caveat: string }>(text);

    return NextResponse.json({
      letter: parsed.letter,
      caveat: parsed.caveat,
      appeal_school: appealSchool,
      compare_school: compareSchool,
    });
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (appealT0 > 0) logAiUsage("outcomes/appeal", user.id, MODEL, appealT0, err instanceof Error ? err : new Error(String(err)));
    return NextResponse.json({ error: "Failed to generate letter. Please try again." }, { status: 502 });
  }
}
