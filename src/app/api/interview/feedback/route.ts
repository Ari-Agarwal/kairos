import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropic, MODEL, extractJson, INTERVIEW_FEEDBACK_PROMPT } from "@/lib/anthropic";
import { logAiUsage, flagAnomalousUsage } from "@/lib/ai-usage-log";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireString, rejectScriptTags, ValidationError } from "@/lib/validate";
import { isTrustedOrigin } from "@/lib/origin-check";
import { canAccessFeature } from "@/lib/access";
import { containsCrisisLanguage, getCrisisResource } from "@/lib/crisis-check";

interface InterviewFeedback {
  score: number;
  strengths: string[];
  improvements: string[];
  one_line_summary: string;
}

export async function GET(req: Request) {
  if (!isTrustedOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("interview_sessions")
    .select("id, question, score, summary, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("interview sessions history query failed:", error);
    return NextResponse.json({ error: "Failed to load history" }, { status: 500 });
  }
  return NextResponse.json({ sessions: data ?? [] });
}

export async function POST(req: Request) {
  if (!isTrustedOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await checkRateLimit(supabase, `interview-feedback:${user.id}`, 15, 60_000)).ok) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment and try again." }, { status: 429 });
  }

  const { data: profile, error: profileError } = await supabase.from("profiles").select("subscription_tier").eq("user_id", user.id).single();
  if (profileError) {
    console.error("interview feedback profile query failed:", profileError);
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }
  if (!canAccessFeature(profile, "mock_interview")) {
    return NextResponse.json({ error: "Mock Interview is a Premium feature." }, { status: 403 });
  }

  const VALID_CATEGORIES = ["General", "Why This School", "Behavioral", "Extracurricular"];
  let question: string;
  let answer: string;
  let category: string | null;
  try {
    const body = await req.json();
    question = requireString(body.question, "Question", 2000);
    answer = requireString(body.answer, "Answer", 10000);
    rejectScriptTags(question, "Question");
    rejectScriptTags(answer, "Answer");
    category = typeof body.category === "string" && VALID_CATEGORIES.includes(body.category) ? body.category : null;
  } catch (e) {
    if (e instanceof ValidationError) return NextResponse.json({ error: e.message }, { status: 400 });
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const crisisResource = containsCrisisLanguage(answer) ? getCrisisResource() : null;

  flagAnomalousUsage("interview-feedback", user.id);
  // Two attempts, same rationale as interview/question -- a single transient
  // Anthropic 5xx shouldn't read as a broken feature.
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const t0 = Date.now();
    try {
      const response = await getAnthropic().messages.create({
        model: MODEL,
        max_tokens: 1024,
        thinking: { type: "disabled" },
        system: INTERVIEW_FEEDBACK_PROMPT,
        messages: [{ role: "user", content: `Question: ${question}\n\nStudent's answer (transcribed from speech): ${answer}` }],
      });
      logAiUsage("interview-feedback", user.id, MODEL, t0, response);
      if (response.stop_reason === "max_tokens") {
        throw new Error("Response truncated at max_tokens for interview feedback");
      }
      const text = response.content.find((b) => b.type === "text")?.text ?? "";
      const feedback = extractJson<InterviewFeedback>(text);

      await supabase.from("interview_sessions").insert({
        user_id: user.id,
        question,
        answer_transcript: answer,
        score: feedback.score,
        strengths: feedback.strengths,
        improvements: feedback.improvements,
        summary: feedback.one_line_summary,
        category,
      });

      return NextResponse.json({ ...feedback, crisis_resource: crisisResource });
    } catch (err) {
      logAiUsage("interview-feedback", user.id, MODEL, t0, err instanceof Error ? err : new Error(String(err)));
      lastErr = err;
    }
  }
  console.error("interview/feedback failed after retry:", lastErr);
  return NextResponse.json({ error: "Failed to generate feedback. Please try again." }, { status: 502 });
}
