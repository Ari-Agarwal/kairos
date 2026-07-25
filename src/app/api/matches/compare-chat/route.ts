import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropic, MODEL } from "@/lib/anthropic";
import { logAiUsage, flagAnomalousUsage } from "@/lib/ai-usage-log";
import { checkRateLimit } from "@/lib/rate-limit";
import { isTrustedOrigin } from "@/lib/origin-check";
import { requireString, rejectScriptTags, ValidationError } from "@/lib/validate";

// Follow-up chat for the 3-school comparison table on Matches (Software_Timeline.md
// QA item: "chat box below/beside it for follow-up questions"). Grounded strictly
// in the school rows the student is already looking at -- never fetches outside
// data, never invents facts about a school not already present in their match data.
const COMPARE_CHAT_PROMPT = `You are answering a student's follow-up question about a side-by-side comparison of 2-3 colleges they are already looking at on their college-matching dashboard. You are given each school's name, match category (reach/target/safety), match percentage, and the "why" reasoning already generated for that school.

Answer only using the information given about these specific schools. Do not invent facts about a school (culture, outcomes, specific programs, etc.) that aren't implied by the provided data, if the student asks about something not covered by the given information, say so plainly and suggest they check the school's own site rather than fabricating an answer.

Keep the answer conversational and concise (3-6 sentences, or a short list if comparing multiple attributes). Never invent a numeric statistic that wasn't provided.`;

interface SchoolContext {
  school_name: string;
  category: string;
  percentage: number;
  why_text: string;
}

export async function POST(req: Request) {
  if (!isTrustedOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await checkRateLimit(supabase, `compare-chat:${user.id}`, 15, 60_000)).ok) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment and try again." }, { status: 429 });
  }

  let question: string;
  let schools: SchoolContext[];
  try {
    const body = await req.json();
    question = requireString(body.question, "Question", 500);
    rejectScriptTags(question, "Question");
    if (!Array.isArray(body.schools) || body.schools.length < 2 || body.schools.length > 3) {
      throw new ValidationError("Compare 2-3 schools.");
    }
    schools = body.schools.map((s: unknown) => {
      const school = s as Record<string, unknown>;
      const name = requireString(school.school_name, "School name", 200);
      rejectScriptTags(name, "School name");
      return {
        school_name: name,
        category: typeof school.category === "string" ? school.category : "unknown",
        percentage: typeof school.percentage === "number" ? school.percentage : 0,
        why_text: typeof school.why_text === "string" ? school.why_text.slice(0, 2000) : "",
      };
    });
  } catch (e) {
    if (e instanceof ValidationError) return NextResponse.json({ error: e.message }, { status: 400 });
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const schoolsBlock = schools
    .map((s) => `- ${s.school_name} (${s.category}, ${s.percentage}% match): ${s.why_text || "no additional notes"}`)
    .join("\n");

  flagAnomalousUsage("compare-chat", user.id);
  const t0 = Date.now();
  try {
    const response = await getAnthropic().messages.create({
      model: MODEL,
      max_tokens: 512,
      thinking: { type: "disabled" },
      system: COMPARE_CHAT_PROMPT,
      messages: [
        {
          role: "user",
          content: `Schools being compared:\n${schoolsBlock}\n\nStudent's question: ${question}`,
        },
      ],
    });
    logAiUsage("compare-chat", user.id, MODEL, t0, response);
    if (response.stop_reason === "max_tokens") {
      throw new Error("Response truncated at max_tokens for compare chat");
    }
    const text = response.content.find((b) => b.type === "text")?.text ?? "";
    return NextResponse.json({ answer: text.trim() });
  } catch (err) {
    logAiUsage("compare-chat", user.id, MODEL, t0, err instanceof Error ? err : new Error(String(err)));
    return NextResponse.json({ error: "Failed to answer. Please try again." }, { status: 502 });
  }
}
