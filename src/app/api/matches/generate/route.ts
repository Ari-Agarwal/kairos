import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { anthropic, MODEL, SCHOOL_MATCHING_PROMPT, extractJson } from "@/lib/anthropic";
import { canAccessFeature } from "@/lib/access";

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
  location_preference: string | null;
  college_goals: string | null;
  test_scores: unknown;
}

function missingFields(profile: Profile): string[] {
  const missing: string[] = [];
  if (!profile.intended_major) missing.push("intended major");
  if (!profile.extracurriculars || profile.extracurriculars.length === 0) missing.push("extracurriculars");
  if (!profile.location_preference) missing.push("location preference");
  if (!profile.college_goals) missing.push("college goals");
  if (!profile.test_scores) missing.push("test scores");
  return missing;
}

function weekStart(): string {
  const d = new Date();
  const day = d.getUTCDay();
  const diff = (day + 6) % 7; // days since Monday
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const week = weekStart();
  const { data: regenRow } = await supabase
    .from("regeneration_log")
    .select("count")
    .eq("user_id", user.id)
    .eq("week_start_date", week)
    .maybeSingle();

  const isPremium = canAccessFeature(profile, "unlimited_regenerations");
  const currentCount = regenRow?.count ?? 0;

  if (!isPremium && currentCount >= 3) {
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
Location preference: ${profile.location_preference ?? "missing"}
College goals: ${profile.college_goals ?? "missing"}
Test scores: ${profile.test_scores ? JSON.stringify(profile.test_scores) : "missing"}
${missing.length > 0 ? `Missing fields: ${missing.join(", ")}` : ""}`;

  let schools: SchoolResult[];
  try {
    const response = await anthropic.messages.create({
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
