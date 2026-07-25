import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropic, MODEL, extractJson, INTERVIEW_QUESTION_PROMPT } from "@/lib/anthropic";
import { logAiUsage, flagAnomalousUsage } from "@/lib/ai-usage-log";
import { checkRateLimit } from "@/lib/rate-limit";
import { isTrustedOrigin } from "@/lib/origin-check";
import { canAccessFeature } from "@/lib/access";
import { rejectScriptTags } from "@/lib/validate";
import { getSchoolInterviewPattern } from "@/lib/interview-patterns";

const CATEGORIES = ["General", "Why This School", "Behavioral", "Extracurricular", "Other"] as const;
type Category = (typeof CATEGORIES)[number];

const CATEGORY_GUIDANCE: Record<Category, string> = {
  General: "Ask a broad, general admissions interview question.",
  "Why This School": "Ask a question specifically about why the student is interested in a particular school or program.",
  Behavioral: "Ask a behavioral question (e.g. about a challenge, conflict, or teamwork experience).",
  Extracurricular: "Ask a question specifically about the student's extracurricular activities or interests outside class.",
  // Freeform follow-up choice (Software_Timeline.md item 21) -- the student
  // describes in their own words what they want to practice, rather than
  // being limited to the four fixed categories.
  Other: "Ask a question that fits what the student described they want to practice, staying a genuine admissions-interview-style question.",
};

export async function POST(req: Request) {
  if (!isTrustedOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await checkRateLimit(supabase, `interview-question:${user.id}`, 15, 60_000)).ok) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment and try again." }, { status: 429 });
  }

  const { data: profile, error: profileError } = await supabase.from("profiles").select("intended_major, career_goals, subscription_tier").eq("user_id", user.id).single();
  if (!profile) {
    if (profileError) console.error("interview/question profile lookup failed:", profileError);
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }
  if (!canAccessFeature(profile, "mock_interview")) {
    return NextResponse.json({ error: "Mock Interview is a Premium feature." }, { status: 403 });
  }

  let category: Category = "General";
  let regenFeedback: string | undefined;
  let schoolName: string | undefined;
  let otherDescription: string | undefined;
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.category && CATEGORIES.includes(body.category)) category = body.category;
    if (typeof body?.regenFeedback === "string" && body.regenFeedback.trim() && body.regenFeedback.length <= 500) {
      rejectScriptTags(body.regenFeedback, "Feedback");
      regenFeedback = body.regenFeedback.trim();
    }
    // Specific-school flow (Software_Timeline.md items 21/22): grounds the
    // question in that school's known interview format/pattern when it's in
    // the seed database, never fabricated if the school isn't covered yet.
    if (typeof body?.schoolName === "string" && body.schoolName.trim() && body.schoolName.length <= 200) {
      rejectScriptTags(body.schoolName, "School name");
      schoolName = body.schoolName.trim();
    }
    // "Other" category freeform description of what the student wants to
    // practice (Software_Timeline.md item 21's fifth follow-up choice).
    if (typeof body?.otherDescription === "string" && body.otherDescription.trim() && body.otherDescription.length <= 300) {
      rejectScriptTags(body.otherDescription, "Description");
      otherDescription = body.otherDescription.trim();
    }
  } catch {
    // no body / invalid JSON -- fall back to General
  }

  const schoolPattern = schoolName ? getSchoolInterviewPattern(schoolName) : null;
  const schoolContext = schoolName
    ? schoolPattern
      ? `\n\nThe student is practicing specifically for ${schoolName}. Known interview format/pattern: ${schoolPattern.format}. ${schoolPattern.notes} Ground the question in this pattern where it makes sense, but do not fabricate specifics beyond what's given here.`
      : `\n\nThe student is practicing specifically for ${schoolName}, but no specific interview-format data is available for this school -- ask a genuine "why this school" style question without inventing school-specific interview details you're not confident are real.`
    : "";
  const otherContext = category === "Other" && otherDescription
    ? `\n\nThe student described what they want to practice: "${otherDescription}"`
    : "";

  // Difficulty ramp (Software_Timeline.md 5k): count how many past sessions
  // this student already logged in this exact category so a repeat session
  // gets a harder, more specific question instead of resampling the same
  // pool. count: "exact" avoids fetching row bodies just to get a number.
  const { count: priorCount, error: priorCountError } = await supabase
    .from("interview_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("category", category);
  if (priorCountError) console.error("interview/question prior-count query failed:", priorCountError);
  const difficultyNote =
    priorCount && priorCount >= 5
      ? `\n\nThis student has already practiced ${priorCount} "${category}" questions. Ask something noticeably harder and more specific than a first-timer's question -- push for depth, a tougher follow-up angle, or a less common variant of this category, not a beginner-level prompt.`
      : priorCount && priorCount >= 2
      ? `\n\nThis student has already practiced ${priorCount} "${category}" questions. Ask something a bit more specific or probing than a first attempt, building on the fact that they've done this category before.`
      : "";

  flagAnomalousUsage("interview-question", user.id);
  // Two attempts, matching the retry pattern used for timeline/generate --
  // a single transient Anthropic 5xx (e.g. overloaded_error) shouldn't read
  // as a broken feature when a retry a moment later succeeds fine.
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
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
            content: `${CATEGORY_GUIDANCE[category]}\n\nIntended major: ${profile.intended_major?.length ? profile.intended_major.join(", ") : "Undecided"}\nCareer goals: ${profile.career_goals ?? "not specified"}${
              regenFeedback
                ? `\n\nThe student was asked "what should change about the question?" on a regenerate and said: "${regenFeedback}" -- ask a genuinely different question that addresses this, not a rephrasing of a similar one.`
                : ""
            }${difficultyNote}${schoolContext}${otherContext}`,
          },
        ],
      });
      logAiUsage("interview-question", user.id, MODEL, t0, response);
      if (response.stop_reason === "max_tokens") {
        throw new Error("Response truncated at max_tokens for interview question");
      }
      const text = response.content.find((b) => b.type === "text")?.text ?? "";
      return NextResponse.json(extractJson(text));
    } catch (err) {
      logAiUsage("interview-question", user.id, MODEL, t0, err instanceof Error ? err : new Error(String(err)));
      lastErr = err;
    }
  }
  console.error("interview/question failed after retry:", lastErr);
  return NextResponse.json({ error: "Failed to generate a question. Please try again." }, { status: 502 });
}
