import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropic, MODEL, ESSAY_BRAINSTORM_PROMPT, extractJson } from "@/lib/anthropic";
import { logAiUsage, flagAnomalousUsage } from "@/lib/ai-usage-log";
import { canAccessFeature } from "@/lib/access";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireString, rejectScriptTags, ValidationError } from "@/lib/validate";
import { isTrustedOrigin } from "@/lib/origin-check";
import { getNarrativeContextText } from "@/lib/narrative-context";

export async function POST(req: Request) {
  if (!isTrustedOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await checkRateLimit(supabase, `essay-brainstorm:${user.id}`, 5, 60_000)).ok) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment and try again." }, { status: 429 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("subscription_tier, grade_level, unweighted_gpa, intended_major, interests, extracurriculars")
    .eq("user_id", user.id)
    .single();

  if (profileError) {
    console.error("essay brainstorm profile query failed:", profileError);
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }

  if (!canAccessFeature(profile, "essay_feedback")) {
    return NextResponse.json({ error: "Essay feedback is a Premium feature." }, { status: 403 });
  }

  let supplementPrompt: string;
  let school: string | undefined;

  try {
    const body = await req.json();
    supplementPrompt = requireString(body.supplementPrompt, "Supplement prompt", 2_000);
    rejectScriptTags(supplementPrompt, "Supplement prompt");
    if (body.school !== undefined && body.school !== "") {
      school = requireString(body.school, "School name", 200);
      rejectScriptTags(school, "School name");
    }
  } catch (e) {
    if (e instanceof ValidationError) return NextResponse.json({ error: e.message }, { status: 400 });
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const profileSummary = [
    profile?.grade_level ? `Grade: ${profile.grade_level}` : null,
    profile?.unweighted_gpa ? `Unweighted GPA: ${profile.unweighted_gpa}` : null,
    profile?.intended_major?.length ? `Intended major: ${profile.intended_major.join(", ")}` : null,
    profile?.interests ? `Interests: ${profile.interests}` : null,
    profile?.extracurriculars?.length
      ? `Extracurriculars: ${(profile.extracurriculars as string[]).join("; ")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const narrativeContext = await getNarrativeContextText(supabase, user.id);

  const userContent = `Supplement prompt${school ? ` (${school})` : ""}:\n${supplementPrompt}\n\nStudent profile:\n${profileSummary || "No profile data available."}${narrativeContext ? `\n\n${narrativeContext}` : ""}`;

  flagAnomalousUsage("essay/brainstorm", user.id);
  const t0 = Date.now();
  try {
    const response = await getAnthropic().messages.create({
      model: MODEL,
      max_tokens: 1024,
      thinking: { type: "disabled" },
      system: ESSAY_BRAINSTORM_PROMPT,
      messages: [{ role: "user", content: userContent }],
    });
    logAiUsage("essay/brainstorm", user.id, MODEL, t0, response);
    const text = response.content.find((b) => b.type === "text")?.text ?? "";
    const parsed = extractJson<{ angles: { title: string; framing: string }[] }>(text);
    return NextResponse.json(parsed);
  } catch (err) {
    logAiUsage("essay/brainstorm", user.id, MODEL, t0, err instanceof Error ? err : new Error(String(err)));
    return NextResponse.json({ error: "Failed to generate brainstorm. Please try again." }, { status: 502 });
  }
}
