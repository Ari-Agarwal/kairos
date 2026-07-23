import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropic, MODEL, PROMPT_VERSION, ACTIVITY_EVAL_PROMPT, extractJson } from "@/lib/anthropic";
import { logAiUsage, flagAnomalousUsage } from "@/lib/ai-usage-log";
import { canAccessFeature } from "@/lib/access";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireString, rejectScriptTags, ValidationError } from "@/lib/validate";
import { isTrustedOrigin } from "@/lib/origin-check";

export async function GET(req: Request) {
  if (!isTrustedOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("activity_evaluations")
    .select("id, score, score_rationale, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("activity evaluations history query failed:", error);
    return NextResponse.json({ error: "Failed to load history" }, { status: 500 });
  }
  return NextResponse.json({ history: data ?? [] });
}

export async function POST(req: Request) {
  if (!isTrustedOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await checkRateLimit(supabase, `activity-eval:${user.id}`, 5, 60_000)).ok) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment and try again." }, { status: 429 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("user_id", user.id)
    .single();
  if (profileError) {
    console.error("activities evaluate profile query failed:", profileError);
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }
  if (!canAccessFeature(profile, "activity_evaluation")) {
    return NextResponse.json({ error: "Activity evaluation is a Premium feature." }, { status: 403 });
  }

  let activitiesText: string;
  let regenFeedback: string | undefined;
  try {
    const body = await req.json();
    activitiesText = requireString(body.activitiesText, "Activities", 10_000);
    rejectScriptTags(activitiesText, "Activities");
    if (body.regenFeedback !== undefined && body.regenFeedback !== "") {
      regenFeedback = requireString(body.regenFeedback, "Feedback", 1_000);
      rejectScriptTags(regenFeedback, "Feedback");
    }
  } catch (e) {
    if (e instanceof ValidationError) return NextResponse.json({ error: e.message }, { status: 400 });
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const regenBlock = regenFeedback
    ? `\n\nThe student was asked "what should change from the last evaluation?" on a regenerate and said: "${regenFeedback}" -- address this directly rather than repeating a similar evaluation.`
    : "";

  flagAnomalousUsage("activities/evaluate", user.id);
  const t0 = Date.now();
  try {
    const response = await getAnthropic().messages.create({
      model: MODEL,
      max_tokens: 1024,
      thinking: { type: "disabled" },
      system: ACTIVITY_EVAL_PROMPT,
      messages: [{ role: "user", content: activitiesText + regenBlock }],
    });
    logAiUsage("activities/evaluate", user.id, MODEL, t0, response);
    if (response.stop_reason === "max_tokens") {
      throw new Error("Response truncated at max_tokens for activity evaluation");
    }
    const text = response.content.find((b) => b.type === "text")?.text ?? "";
    const parsed = extractJson<{
      score: number;
      score_rationale: string;
      suggestions: { label: string; text: string }[];
      per_activity?: { activity: string; strength: string; note: string }[];
    }>(text);

    const { error: historyError } = await supabase.from("activity_evaluations").insert({
      user_id: user.id,
      activities_text: activitiesText,
      score: parsed.score,
      score_rationale: parsed.score_rationale,
      suggestions: parsed.suggestions,
      per_activity: parsed.per_activity ?? null,
      prompt_version: PROMPT_VERSION,
    });
    if (historyError) console.error("activity evaluation history insert failed:", historyError);

    return NextResponse.json(parsed);
  } catch (err) {
    logAiUsage("activities/evaluate", user.id, MODEL, t0, err instanceof Error ? err : new Error(String(err)));
    return NextResponse.json({ error: "Failed to generate evaluation. Please try again." }, { status: 502 });
  }
}
