import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropic, MODEL, NARRATIVE_SYNTHESIS_PROMPT, extractJson } from "@/lib/anthropic";
import { logAiUsage, flagAnomalousUsage } from "@/lib/ai-usage-log";
import { checkRateLimit } from "@/lib/rate-limit";
import { isTrustedOrigin } from "@/lib/origin-check";
import { requireString, rejectScriptTags, ValidationError } from "@/lib/validate";

const QUESTION_KEYS = ["moment", "revealed", "pattern", "struggle", "differentiator", "direction"] as const;
type QuestionKey = (typeof QUESTION_KEYS)[number];
type Answers = Record<QuestionKey, string>;

interface NarrativeSynthesis {
  throughline: string;
  core_values: string[];
  growth_arc: string;
  differentiator: string;
  essay_angles: { title: string; framing: string }[];
  gaps: string[];
}

export async function POST(req: Request) {
  if (!isTrustedOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await checkRateLimit(supabase, `narrative:${user.id}`, 5, 60_000)).ok) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment and try again." }, { status: 429 });
  }

  let answers: Answers;
  try {
    const body = await req.json();
    const parsed = {} as Answers;
    for (const key of QUESTION_KEYS) {
      const value = requireString(body?.answers?.[key], `Answer for "${key}"`, 3000);
      rejectScriptTags(value, `Answer for "${key}"`);
      parsed[key] = value;
    }
    answers = parsed;
  } catch (e) {
    if (e instanceof ValidationError) return NextResponse.json({ error: e.message }, { status: 400 });
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const userMessage = `1. Formative moment: ${answers.moment}
2. What it revealed: ${answers.revealed}
3. Where the same pattern shows up elsewhere: ${answers.pattern}
4. A struggle or setback and what changed: ${answers.struggle}
5. What they do differently from others with similar interests: ${answers.differentiator}
6. Where they want to take this (intended major/future direction): ${answers.direction}`;

  flagAnomalousUsage("narrative/generate", user.id);
  const t0 = Date.now();
  let synthesis: NarrativeSynthesis;
  try {
    const response = await getAnthropic().messages.create({
      model: MODEL,
      max_tokens: 2048,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium" },
      system: NARRATIVE_SYNTHESIS_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });
    if (response.stop_reason === "max_tokens") {
      throw new Error("Response truncated at max_tokens for narrative synthesis");
    }
    logAiUsage("narrative/generate", user.id, MODEL, t0, response);
    const text = response.content.find((b) => b.type === "text")?.text ?? "";
    synthesis = extractJson<NarrativeSynthesis>(text);
  } catch (err) {
    logAiUsage("narrative/generate", user.id, MODEL, t0, err instanceof Error ? err : new Error(String(err)));
    console.error("narrative generate failed:", err);
    return NextResponse.json({ error: "Failed to generate your narrative. Please try again." }, { status: 502 });
  }

  const { error: upsertError } = await supabase.from("narrative_profiles").upsert(
    {
      user_id: user.id,
      answers,
      throughline: synthesis.throughline,
      core_values: synthesis.core_values,
      growth_arc: synthesis.growth_arc,
      differentiator: synthesis.differentiator,
      essay_angles: synthesis.essay_angles,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (upsertError) {
    console.error("narrative generate upsert failed:", upsertError);
    return NextResponse.json({ error: "Generated but failed to save your narrative." }, { status: 500 });
  }

  return NextResponse.json(synthesis);
}
