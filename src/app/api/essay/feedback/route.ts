import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropic, MODEL, ESSAY_FEEDBACK_PROMPT, ESSAY_RUBRIC_PROMPT, extractJson } from "@/lib/anthropic";
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

  if (!(await checkRateLimit(supabase, `essay:${user.id}`, 5, 60_000)).ok) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment and try again." }, { status: 429 });
  }

  const { data: profile } = await supabase.from("profiles").select("subscription_tier").eq("user_id", user.id).single();
  if (!canAccessFeature(profile, "essay_feedback")) {
    return NextResponse.json({ error: "Essay feedback is a Premium feature." }, { status: 403 });
  }

  let essay: string;
  let school: string | undefined;
  let supplementPrompt: string | undefined;

  try {
    const body = await req.json();
    essay = requireString(body.essay, "Essay text", 20_000);
    rejectScriptTags(essay, "Essay text");
    if (body.school !== undefined && body.school !== "") {
      school = requireString(body.school, "School name", 200);
      rejectScriptTags(school, "School name");
    }
    if (body.supplementPrompt !== undefined && body.supplementPrompt !== "") {
      supplementPrompt = requireString(body.supplementPrompt, "Supplement prompt", 2_000);
      rejectScriptTags(supplementPrompt, "Supplement prompt");
    }
  } catch (e) {
    if (e instanceof ValidationError) return NextResponse.json({ error: e.message }, { status: 400 });
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const useRubric = !!supplementPrompt;

  const userContent = useRubric
    ? `Supplement prompt${school ? ` (${school})` : ""}:\n${supplementPrompt}\n\nStudent draft:\n${essay}`
    : essay;

  flagAnomalousUsage("essay/feedback", user.id);
  const t0 = Date.now();
  try {
    const response = await getAnthropic().messages.create({
      model: MODEL,
      max_tokens: 2048,
      thinking: { type: "disabled" },
      system: useRubric ? ESSAY_RUBRIC_PROMPT : ESSAY_FEEDBACK_PROMPT,
      messages: [{ role: "user", content: userContent }],
    });
    logAiUsage("essay/feedback", user.id, MODEL, t0, response);
    const text = response.content.find((b) => b.type === "text")?.text ?? "";
    const parsed = extractJson<{ feedback: unknown[] }>(text);
    return NextResponse.json({ ...parsed, rubric: useRubric });
  } catch (err) {
    logAiUsage("essay/feedback", user.id, MODEL, t0, err instanceof Error ? err : new Error(String(err)));
    return NextResponse.json({ error: "Failed to generate feedback. Please try again." }, { status: 502 });
  }
}
