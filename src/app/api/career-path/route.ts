import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropic, MODEL, extractJson } from "@/lib/anthropic";
import { canAccessFeature } from "@/lib/access";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireString, rejectScriptTags, ValidationError } from "@/lib/validate";
import { isTrustedOrigin } from "@/lib/origin-check";

const CAREER_PATH_PROMPT = `You are describing typical post-graduation career patterns for a student with a given intended major considering a specific school. Ground your answer in general, real-world patterns for that major, not specifics about named individuals, and avoid naming specific employers unless they are broadly, publicly known as common hirers for that major (e.g. "large public accounting firms" rather than a specific invented company). Salary ranges should reflect realistic national early-career figures for that major, not the most extreme outcomes. Return JSON:
{
  "internships": ["string", "string", "string"],
  "employer_types": ["string", "string", "string"],
  "median_salary": "string (e.g. '$65,000–$80,000 early career')",
  "summary": "string (2-3 sentences, framed as general patterns, not guarantees)"
}`;

export async function POST(req: Request) {
  if (!isTrustedOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await checkRateLimit(supabase, `career-path:${user.id}`, 10, 60_000)).ok) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment and try again." }, { status: 429 });
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
  if (!canAccessFeature(profile, "career_path_explorer")) {
    return NextResponse.json({ error: "Career Path is a Premium feature." }, { status: 403 });
  }

  let schoolName: string;
  try {
    const body = await req.json();
    schoolName = requireString(body.schoolName, "School name", 200);
    rejectScriptTags(schoolName, "School name");
  } catch (e) {
    if (e instanceof ValidationError) return NextResponse.json({ error: e.message }, { status: 400 });
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const response = await getAnthropic().messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: CAREER_PATH_PROMPT,
      messages: [
        {
          role: "user",
          content: `Major: ${profile.intended_major ?? "Undecided"}\nSchool: ${schoolName}`,
        },
      ],
    });
    const text = response.content.find((b) => b.type === "text")?.text ?? "";
    return NextResponse.json(extractJson(text));
  } catch {
    return NextResponse.json({ error: "Failed to generate career path. Please try again." }, { status: 502 });
  }
}
