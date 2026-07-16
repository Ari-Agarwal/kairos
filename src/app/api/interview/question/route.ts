import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropic, MODEL, extractJson, INTERVIEW_QUESTION_PROMPT } from "@/lib/anthropic";
import { logAiUsage, flagAnomalousUsage } from "@/lib/ai-usage-log";
import { checkRateLimit } from "@/lib/rate-limit";
import { isTrustedOrigin } from "@/lib/origin-check";

export async function POST(req: Request) {
  if (!isTrustedOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await checkRateLimit(supabase, `interview-question:${user.id}`, 15, 60_000)).ok) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment and try again." }, { status: 429 });
  }

  const { data: profile, error: profileError } = await supabase.from("profiles").select("intended_major, career_goals").eq("user_id", user.id).single();
  if (!profile) {
    if (profileError) console.error("interview/question profile lookup failed:", profileError);
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  flagAnomalousUsage("interview-question", user.id);
  const t0 = Date.now();
  try {
    const response = await getAnthropic().messages.create({
      model: MODEL,
      max_tokens: 512,
      thinking: { type: "disabled" },
      system: INTERVIEW_QUESTION_PROMPT,
      messages: [
        {
          role: "user",
          content: `Intended major: ${profile.intended_major ?? "Undecided"}\nCareer goals: ${profile.career_goals ?? "not specified"}`,
        },
      ],
    });
    logAiUsage("interview-question", user.id, MODEL, t0, response);
    const text = response.content.find((b) => b.type === "text")?.text ?? "";
    return NextResponse.json(extractJson(text));
  } catch (err) {
    logAiUsage("interview-question", user.id, MODEL, t0, err instanceof Error ? err : new Error(String(err)));
    return NextResponse.json({ error: "Failed to generate a question. Please try again." }, { status: 502 });
  }
}
