import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropic, MODEL, schoolMatchingPrompt } from "@/lib/anthropic";
import { canRegenerate, weekStart } from "@/lib/access";
import { checkRateLimit } from "@/lib/rate-limit";
import { isTrustedOrigin } from "@/lib/origin-check";

// Extended thinking at "high" effort has been observed taking 20-50s per
// category call on real requests -- Vercel's default function duration (10s
// on Hobby) isn't enough, so this must be raised explicitly. 60s is the
// Hobby-plan ceiling; a call landing near the high end of that range plus
// network overhead can still brush up against it.
export const maxDuration = 60;

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
    social_fit: string;
  };
}

interface Profile {
  intended_major: string | null;
  interests: string | null;
  current_school: string | null;
  extracurriculars: string[] | null;
  schools_already_considering: string | null;
  test_scores: unknown;
  campus_size_pref: string;
  campus_setting_pref: string;
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

  if (!(await checkRateLimit(supabase, `matches:${user.id}`, 5, 60_000)).ok) {
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
Unweighted GPA: ${profile.unweighted_gpa}
Weighted GPA: ${profile.weighted_gpa}
Intended major: ${profile.intended_major ?? "missing"}
Interests: ${profile.interests ?? "none given"}
Current school: ${profile.current_school ?? "missing"}
Extracurriculars: ${profile.extracurriculars?.join("; ") ?? "missing"}
Schools already considering: ${profile.schools_already_considering ?? "missing"}
Test scores: ${profile.test_scores ? JSON.stringify(profile.test_scores) : "missing"}
Campus size preference: ${profile.campus_size_pref}
Campus setting preference: ${profile.campus_setting_pref}
${missing.length > 0 ? `Missing fields: ${missing.join(", ")}` : ""}`;

  const CATEGORIES = ["reach", "target", "safety"] as const;

  const SCHOOLS_TOOL = {
    name: "submit_schools",
    description: "Submit the generated school list for this category.",
    input_schema: {
      type: "object" as const,
      properties: {
        schools: {
          type: "array" as const,
          items: {
            type: "object" as const,
            properties: {
              name: { type: "string" as const },
              percentage: { type: "number" as const },
              why_text: { type: "string" as const },
              factors: {
                type: "object" as const,
                properties: {
                  gpa_comparison: { type: "string" as const },
                  course_rigor: { type: "string" as const },
                  ec_strength: { type: "string" as const },
                  major_fit: { type: "string" as const },
                  social_fit: { type: "string" as const },
                },
                required: ["gpa_comparison", "course_rigor", "ec_strength", "major_fit", "social_fit"],
              },
            },
            required: ["name", "percentage", "why_text", "factors"],
          },
        },
      },
      required: ["schools"],
    },
  };

  async function generateCategory(category: (typeof CATEGORIES)[number]): Promise<SchoolResult[]> {
    // Forcing tool-use makes the model target a fixed schema instead of free-text
    // JSON, which cuts out most malformed-JSON failures — but tool-use isn't a hard
    // schema lock at the token level, and a "guaranteed inclusion" case (many named
    // schools + full factor writeups) can still run the output close to the token
    // ceiling, so one bounded retry with headroom guards the rare truncated/malformed
    // miss. Capped at 2 attempts, not more: a single attempt can take up to ~50s, and
    // maxDuration is hard-capped at 60s on Vercel's Hobby plan — a 3rd attempt risks
    // the platform killing the whole request mid-retry instead of us returning a
    // clean 502.
    let lastErr: unknown;
    // A retry after an empty-schools miss reuses the identical prompt, so without
    // added pressure the model can repeat the same "too uncertain to commit" empty
    // response (seen in practice on "safety" — its extra "genuinely glad to attend"
    // qualifier makes the model more willing to return nothing than a list it isn't
    // fully confident clears that bar). Telling it plainly that empty is invalid and
    // some real answer is required fixes the retry without touching the base prompt.
    let forceNonEmpty = false;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await getAnthropic().messages.create({
          model: MODEL,
          max_tokens: 8192,
          thinking: { type: "adaptive" },
          output_config: { effort: "high" },
          system: schoolMatchingPrompt(category) + (forceNonEmpty
            ? `\n\nYour previous attempt returned zero schools for this category. That response was invalid — an empty list is never an acceptable answer. Apply your best judgment and return at least 3 real, currently-operating schools that genuinely fit the "${category}" band for this student, even if you are not fully certain about every detail.`
            : ""),
          messages: [{ role: "user", content: userMessage }],
          tools: [SCHOOLS_TOOL],
          tool_choice: { type: "tool", name: "submit_schools" },
        });
        if (response.stop_reason === "max_tokens") {
          throw new Error(`Response truncated at max_tokens for category ${category}`);
        }
        const toolUse = response.content.find((b) => b.type === "tool_use");
        if (!toolUse) throw new Error(`No tool_use block in response for category ${category}`);
        const parsed = toolUse.input as { schools?: Omit<SchoolResult, "category">[] };
        if (!Array.isArray(parsed.schools) || parsed.schools.length === 0) {
          forceNonEmpty = true;
          throw new Error(`tool_use input.schools was not a populated array for category ${category}`);
        }
        // Trust the category the call was scoped to, not the model's echo.
        // Clamp/round the model's percentage so it can't render as e.g. "73.4182%"
        // or drift outside a sane 1-99 admission-chance range.
        return parsed.schools.map((s) => ({
          ...s,
          category,
          percentage: Math.min(99, Math.max(1, Math.round(s.percentage))),
        }));
      } catch (err) {
        lastErr = err;
        console.error(`generateCategory(${category}) attempt ${attempt + 1} failed:`, err);
      }
    }
    throw lastErr;
  }

  let schools: SchoolResult[];
  try {
    // Reach/target/safety run concurrently — ~1/3 the wall-clock of one 15-school call.
    const byCategory = await Promise.all(CATEGORIES.map(generateCategory));
    const seen = new Set<string>();
    schools = byCategory.flat().filter((s) => {
      const key = s.name.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  } catch (err) {
    console.error("Match generation failed:", err);
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
