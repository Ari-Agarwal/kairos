import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropic, MODEL, ESSAY_FEEDBACK_PROMPT, extractJson } from "@/lib/anthropic";
import { canAccessFeature } from "@/lib/access";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("subscription_tier").eq("user_id", user.id).single();
  if (!canAccessFeature(profile, "essay_feedback")) {
    return NextResponse.json({ error: "Essay feedback is a Premium feature." }, { status: 403 });
  }

  const { essay } = await req.json();
  if (!essay || typeof essay !== "string" || essay.trim().length === 0) {
    return NextResponse.json({ error: "Essay text is required." }, { status: 400 });
  }

  try {
    const response = await getAnthropic().messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: ESSAY_FEEDBACK_PROMPT,
      messages: [{ role: "user", content: essay }],
    });
    const text = response.content.find((b) => b.type === "text")?.text ?? "";
    const parsed = extractJson<{ feedback: { label: string; text: string }[] }>(text);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "Failed to generate feedback. Please try again." }, { status: 502 });
  }
}
