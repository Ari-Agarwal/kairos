import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { anthropic, MODEL, TIMELINE_PROMPT, extractJson } from "@/lib/anthropic";

interface TimelineEntry {
  title: string;
  due_date: string | null;
  school_tags: string[];
  why_text: string;
  what_to_do: string[];
}

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const { data: matches } = await supabase
    .from("school_matches")
    .select("school_name, category")
    .eq("user_id", user.id)
    .eq("is_active", true);

  if (!matches || matches.length === 0) {
    return NextResponse.json({ error: "Generate your school matches first." }, { status: 400 });
  }

  const userMessage = `Student profile:
Grade level: ${profile.grade_level}
GPA: ${profile.gpa}
Intended major: ${profile.intended_major ?? "not specified"}
College goals: ${profile.college_goals ?? "not specified"}

Matched schools:
${matches.map((m) => `- ${m.school_name} (${m.category})`).join("\n")}`;

  let logistics: TimelineEntry[];
  let strategic_advice: TimelineEntry[];
  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: TIMELINE_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });
    const text = response.content.find((b) => b.type === "text")?.text ?? "";
    const parsed = extractJson<{ logistics: TimelineEntry[]; strategic_advice: TimelineEntry[] }>(text);
    logistics = parsed.logistics;
    strategic_advice = parsed.strategic_advice;
  } catch {
    return NextResponse.json({ error: "Failed to generate timeline. Please try again." }, { status: 502 });
  }

  await supabase.from("timeline_items").delete().eq("user_id", user.id);

  const rows = [
    ...logistics.map((i) => ({
      user_id: user.id,
      title: i.title,
      due_date: i.due_date,
      school_tags: i.school_tags,
      tier: "free" as const,
      is_strategic: false,
      why_text: i.why_text,
      what_to_do: i.what_to_do,
    })),
    ...strategic_advice.map((i) => ({
      user_id: user.id,
      title: i.title,
      due_date: null,
      school_tags: i.school_tags,
      tier: "premium" as const,
      is_strategic: true,
      why_text: i.why_text,
      what_to_do: i.what_to_do,
    })),
  ];

  const { error } = await supabase.from("timeline_items").insert(rows);
  if (error) return NextResponse.json({ error: "Failed to save timeline." }, { status: 500 });

  return NextResponse.json({ ok: true });
}
