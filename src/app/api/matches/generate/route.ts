import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropic, MODEL, SCHOOL_MATCHING_PROMPT, extractJson } from "@/lib/anthropic";
import { canRegenerate, weekStart } from "@/lib/access";
import { checkRateLimit } from "@/lib/rate-limit";
import { isTrustedOrigin } from "@/lib/origin-check";

interface SchoolResult {
  name: string;
  category: "reach" | "target" | "safety";
  percentage: number;
  why_text: string;
  factors: {
    gpa_comparison: string;
    course_rigor: string;
    ec_strength: string;
    major_fit: string;
  };
}

interface Profile {
  intended_major: string | null;
  extracurriculars: string[] | null;
  schools_already_considering: string | null;
  test_scores: unknown;
}

function missingFields(profile: Profile): string[] {
  const missing: string[] = [];
  if (!profile.intended_major) missing.push("intended major");
  if (!profile.extracurriculars || profile.extracurriculars.length === 0) missing.push("extracurriculars");
  if (!profile.test_scores) missing.push("test scores");
  return missing;
}

export async function POST(req: Request) {
  if (!isTrustedOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!checkRateLimit(`matches:${user.id}`, 5, 60_000).ok) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment and try again." }, { status: 429 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const week = weekStart(new Date());
  const { data: regenRow } = await supabase
    .from("regeneration_log")
    .select("count")
    .eq("user_id", user.id)
    .eq("week_start_date", week)
    .maybeSingle();

  const currentCount = regenRow?.count ?? 0;

  if (!canRegenerate(profile, currentCount)) {
    return NextResponse.json(
      { error: "Weekly regeneration limit reached. Upgrade to Premium for unlimited regenerations." },
      { status: 403 }
    );
  }

  const missing = missingFields(profile);
  const userMessage = `Student profile:
Grade level: ${profile.grade_level}
GPA: ${profile.gpa}
Intended major: ${profile.intended_major ?? "missing"}
Extracurriculars: ${profile.extracurriculars?.join(", ") ?? "missing"}
Schools already considering: ${profile.schools_already_considering ?? "missing"}
Test scores: ${profile.test_scores ? JSON.stringify(profile.test_scores) : "missing"}
${missing.length > 0 ? `Missing fields: ${missing.join(", ")}` : ""}`;

  let schools: SchoolResult[];
  try {
    const response = await getAnthropic().messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: SCHOOL_MATCHING_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });
    const text = response.content.find((b) => b.type === "text")?.text ?? "";
    const parsed = extractJson<{ schools: SchoolResult[] }>(text);
    schools = parsed.schools;
  } catch {
    return NextResponse.json({ error: "Failed to generate matches. Please try again." }, { status: 502 });
  }

  await supabase.from("school_matches").update({ is_active: false }).eq("user_id", user.id);

  const rows = schools.map((s) => ({
    user_id: user.id,
    school_name: s.name,
    category: s.category,
    percentage: s.percentage,
    why_text: s.why_text,
    factors: s.factors,
    is_active: true,
  }));

  const { error: insertError } = await supabase.from("school_matches").insert(rows);
  if (insertError) {
    return NextResponse.json({ error: "Failed to save matches." }, { status: 500 });
  }

  await supabase
    .from("regeneration_log")
    .upsert({ user_id: user.id, week_start_date: week, count: currentCount + 1 });

  return NextResponse.json({ ok: true });
}
