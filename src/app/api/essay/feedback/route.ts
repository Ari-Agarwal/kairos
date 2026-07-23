import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropic, MODEL, PROMPT_VERSION, ESSAY_FEEDBACK_PROMPT, ESSAY_RUBRIC_PROMPT, extractJson } from "@/lib/anthropic";
import { logAiUsage, flagAnomalousUsage } from "@/lib/ai-usage-log";
import { canAccessFeature } from "@/lib/access";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireString, rejectScriptTags, ValidationError } from "@/lib/validate";
import { isTrustedOrigin } from "@/lib/origin-check";
import { getNarrativeContextText } from "@/lib/narrative-context";
import { containsCrisisLanguage, getCrisisResource } from "@/lib/crisis-check";

export async function GET(req: Request) {
  if (!isTrustedOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("essay_feedback_history")
    .select("id, school, essay_text, feedback, is_rubric, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("essay feedback history query failed:", error);
    return NextResponse.json({ error: "Failed to load history" }, { status: 500 });
  }
  return NextResponse.json({ history: data ?? [] });
}

export async function POST(req: Request) {
  if (!isTrustedOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await checkRateLimit(supabase, `essay:${user.id}`, 5, 60_000)).ok) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment and try again." }, { status: 429 });
  }

  const { data: profile, error: profileError } = await supabase.from("profiles").select("subscription_tier").eq("user_id", user.id).single();
  if (profileError) {
    console.error("essay feedback profile query failed:", profileError);
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }
  if (!canAccessFeature(profile, "essay_feedback")) {
    return NextResponse.json({ error: "Essay feedback is a Premium feature." }, { status: 403 });
  }

  let essay: string;
  let school: string | undefined;
  let supplementPrompt: string | undefined;
  let regenFeedback: string | undefined;

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
    if (body.regenFeedback !== undefined && body.regenFeedback !== "") {
      regenFeedback = requireString(body.regenFeedback, "Feedback", 1_000);
      rejectScriptTags(regenFeedback, "Feedback");
    }
  } catch (e) {
    if (e instanceof ValidationError) return NextResponse.json({ error: e.message }, { status: 400 });
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const useRubric = !!supplementPrompt;

  // Crisis/mental-health safety net (Software_Timeline.md Section 12): a
  // conservative, keyword-based check on the student's own raw input. Never
  // blocks or refuses the normal response -- only adds a supportive
  // `crisis_resource` field the client renders as a calm banner above the
  // AI output.
  const crisisResource =
    containsCrisisLanguage(essay) || (regenFeedback ? containsCrisisLanguage(regenFeedback) : false)
      ? getCrisisResource()
      : null;

  // Abuse/misuse prevention (Section 12): the only structural friction
  // beyond the coach-not-ghostwriter disclaimer banner. If a student has
  // submitted the exact same draft for feedback several times in a row
  // without changing anything, gently reinforce that they're the writer --
  // reuses essay_feedback_history, which already exists for this purpose.
  // Never blocks the request.
  let repeatNotice: string | null = null;
  {
    const { data: recentHistory } = await supabase
      .from("essay_feedback_history")
      .select("essay_text")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(3);
    const trimmedEssay = essay.trim();
    if (recentHistory && recentHistory.length === 3 && recentHistory.every((h) => h.essay_text.trim() === trimmedEssay)) {
      repeatNotice =
        "You've submitted this exact draft for feedback a few times in a row — Kairos gives feedback, but you're the one who has to make the changes. Try revising based on what you've already gotten before asking again.";
    }
  }

  const narrativeContext = await getNarrativeContextText(supabase, user.id);
  const narrativeBlock = narrativeContext ? `${narrativeContext}\n\n` : "";
  const regenBlock = regenFeedback
    ? `\n\nThe student was asked "what should change from the last feedback?" on a regenerate and said: "${regenFeedback}" -- address this directly (e.g. if they said a specific issue was missed, cover it this time) rather than repeating similar feedback.`
    : "";

  const userContent = useRubric
    ? `${narrativeBlock}Supplement prompt${school ? ` (${school})` : ""}:\n${supplementPrompt}\n\nStudent draft:\n${essay}${regenBlock}`
    : `${narrativeBlock}${essay}${regenBlock}`;

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
    if (response.stop_reason === "max_tokens") {
      throw new Error("Response truncated at max_tokens for essay feedback");
    }
    const text = response.content.find((b) => b.type === "text")?.text ?? "";
    const parsed = extractJson<{ feedback: unknown[] }>(text);

    const { error: historyError } = await supabase.from("essay_feedback_history").insert({
      user_id: user.id,
      school: school ?? null,
      essay_text: essay,
      feedback: parsed.feedback,
      is_rubric: useRubric,
      prompt_version: PROMPT_VERSION,
    });
    if (historyError) console.error("essay feedback history insert failed:", historyError);

    return NextResponse.json({
      ...parsed,
      rubric: useRubric,
      crisis_resource: crisisResource,
      repeat_notice: repeatNotice,
    });
  } catch (err) {
    logAiUsage("essay/feedback", user.id, MODEL, t0, err instanceof Error ? err : new Error(String(err)));
    return NextResponse.json({ error: "Failed to generate feedback. Please try again." }, { status: 502 });
  }
}
