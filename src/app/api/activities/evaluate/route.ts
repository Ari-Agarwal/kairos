import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropic, MODEL, ACTIVITY_EVAL_PROMPT, extractJson } from "@/lib/anthropic";
import { logAiUsage, flagAnomalousUsage } from "@/lib/ai-usage-log";
import { canAccessFeature } from "@/lib/access";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireString, rejectScriptTags, ValidationError } from "@/lib/validate";
import { isTrustedOrigin } from "@/lib/origin-check";

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
  try {
    const body = await req.json();
    activitiesText = requireString(body.activitiesText, "Activities", 10_000);
    rejectScriptTags(activitiesText, "Activities");
  } catch (e) {
    if (e instanceof ValidationError) return NextResponse.json({ error: e.message }, { status: 400 });
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  flagAnomalousUsage("activities/evaluate", user.id);
  const t0 = Date.now();
  try {
    const response = await getAnthropic().messages.create({
      model: MODEL,
      max_tokens: 1024,
      thinking: { type: "disabled" },
      system: ACTIVITY_EVAL_PROMPT,
      messages: [{ role: "user", content: activitiesText }],
    });
    logAiUsage("activities/evaluate", user.id, MODEL, t0, response);
    const text = response.content.find((b) => b.type === "text")?.text ?? "";
    const parsed = extractJson<{
      score: number;
      score_rationale: string;
      suggestions: { label: string; text: string }[];
    }>(text);
    return NextResponse.json(parsed);
  } catch (err) {
    logAiUsage("activities/evaluate", user.id, MODEL, t0, err instanceof Error ? err : new Error(String(err)));
    return NextResponse.json({ error: "Failed to generate evaluation. Please try again." }, { status: 502 });
  }
}
