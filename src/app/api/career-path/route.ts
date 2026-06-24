import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { anthropic, MODEL, extractJson } from "@/lib/anthropic";
import { canAccessFeature } from "@/lib/access";

const CAREER_PATH_PROMPT = `You are describing typical post-graduation career patterns for a student with a given intended major considering a specific school. Ground your answer in general, real-world patterns for that major, not specifics about named individuals. Return JSON:
{
  "internships": ["string", "string", "string"],
  "employer_types": ["string", "string", "string"],
  "median_salary": "string (e.g. '$65,000–$80,000 early career')",
  "summary": "string (2-3 sentences, framed as general patterns, not guarantees)"
}`;

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
  if (!canAccessFeature(profile, "career_path_explorer")) {
    return NextResponse.json({ error: "Career Path is a Premium feature." }, { status: 403 });
  }

  const { schoolName } = await req.json();

  try {
    const response = await anthropic.messages.create({
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
