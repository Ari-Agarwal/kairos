import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropic, MODEL, schoolMatchingPrompt } from "@/lib/anthropic";
import { logAiUsage, flagAnomalousUsage } from "@/lib/ai-usage-log";
import { canRegenerate, weekStart } from "@/lib/access";
import { checkRateLimit } from "@/lib/rate-limit";
import { isTrustedOrigin } from "@/lib/origin-check";
import { rejectScriptTags, ValidationError } from "@/lib/validate";

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
  intended_major: string[] | null;
  interests: string | null;
  current_school: string | null;
  extracurriculars: string[] | null;
  schools_already_considering: string | null;
  test_scores: unknown;
  sat_score: number | null;
  act_score: number | null;
  campus_size_pref: string[] | null;
  campus_setting_pref: string[] | null;
  class_rank: string | null;
  ap_ib_count: number | null;
  career_goals: string | null;
  geographic_pref: string | null;
  financial_aid_need: boolean | null;
  budget_ceiling: number | null;
  first_gen: boolean | null;
  legacy_school: string | null;
  internships_research: string | null;
}

function missingFields(profile: Profile): string[] {
  const missing: string[] = [];
  if (!profile.intended_major?.length) missing.push("intended major");
  if (!profile.extracurriculars || profile.extracurriculars.length === 0) missing.push("extracurriculars");
  if (!profile.test_scores && !profile.sat_score && !profile.act_score) missing.push("test scores");
  if (!profile.campus_size_pref?.length || !profile.campus_setting_pref?.length) missing.push("campus preferences");
  return missing;
}

export async function POST(req: Request) {
  if (!isTrustedOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = user.id;

  // Optional freeform steer ("what am I looking for") from the matches page —
  // unlike every other free-text field in the app this one is allowed to be
  // empty, so it's validated by hand rather than via requireString.
  let feedback: string | null = null;
  try {
    const body = await req.json().catch(() => ({}));
    if (typeof body?.feedback === "string" && body.feedback.trim().length > 0) {
      if (body.feedback.length > 1000) {
        return NextResponse.json({ error: "Feedback must be 1000 characters or fewer." }, { status: 400 });
      }
      rejectScriptTags(body.feedback, "feedback");
      feedback = body.feedback.trim();
    }
  } catch (err) {
    if (err instanceof ValidationError) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }

  if (!(await checkRateLimit(supabase, `matches:${userId}`, 5, 60_000)).ok) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment and try again." }, { status: 429 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (profileError) {
    console.error("matches generate profile query failed:", profileError);
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }

  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const week = weekStart(new Date());
  const { data: regenRow, error: regenRowError } = await supabase
    .from("regeneration_log")
    .select("count")
    .eq("user_id", userId)
    .eq("week_start_date", week)
    .maybeSingle();

  if (regenRowError) console.error("matches generate regeneration_log query failed:", regenRowError);

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
Intended major: ${profile.intended_major?.length ? profile.intended_major.join(", ") : "missing"}
Interests: ${profile.interests ?? "none given"}
Current school: ${profile.current_school ?? "missing"}
Extracurriculars: ${profile.extracurriculars?.join("; ") ?? "missing"}
Schools already considering: ${profile.schools_already_considering ?? "missing"}
SAT score: ${profile.sat_score ?? "not given"}
ACT score: ${profile.act_score ?? "not given"}
Class rank: ${profile.class_rank ?? "not given"}
AP/IB courses: ${profile.ap_ib_count ?? "not given"}
Career goals: ${profile.career_goals ?? "not given"}
Geographic preference: ${profile.geographic_pref ?? "not given"}
Financial aid need: ${profile.financial_aid_need === null ? "not given" : profile.financial_aid_need ? "yes" : "no"}
Annual budget ceiling: ${profile.budget_ceiling ?? "not given"}
First-generation student: ${profile.first_gen === null ? "not given" : profile.first_gen ? "yes" : "no"}
Legacy school: ${profile.legacy_school ?? "none"}
Internships / research experience: ${profile.internships_research ?? "not given"}
Campus size preference: ${profile.campus_size_pref?.length ? profile.campus_size_pref.join(" or ") : "no preference given"}
Campus setting preference: ${profile.campus_setting_pref?.length ? profile.campus_setting_pref.join(" or ") : "no preference given"}
${missing.length > 0 ? `Missing fields: ${missing.join(", ")}` : ""}
${feedback ? `\nThe student was asked "what are you looking for in your matches?" and said: "${feedback}" — weigh this alongside the profile above; don't let it override hard constraints like GPA/test-score realism, but do let it steer emphasis (e.g. toward a specific region, school size, or program strength).` : ""}`;

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
    flagAnomalousUsage("matches/generate", userId);
    let forceNonEmpty = false;
    for (let attempt = 0; attempt < 2; attempt++) {
      const t0 = Date.now();
      try {
        const response = await getAnthropic().messages.create({
          model: MODEL,
          // NOTE: previously raised to 16000 to reduce max_tokens truncation
          // retries, but reverted -- thinking:{type:"adaptive"} draws its
          // thinking budget from this same ceiling, so the higher cap let
          // the model think substantially longer per call instead of just
          // giving cleaner headroom for output, making stalls worse, not
          // better. Left at 8192; truncation retries are the lesser evil.
          max_tokens: 8192,
          thinking: { type: "adaptive" },
          // "medium" rather than "high" -- cuts per-call wall time substantially,
          // which is the dominant driver of the 20-50s-per-category time. Traded
          // against somewhat less exhaustive reasoning per school; the prompt's
          // methodology section is what's carrying most of the accuracy here, not
          // the effort tier, so this should stay close in quality.
          output_config: { effort: "medium" },
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
        logAiUsage("matches/generate", userId, MODEL, t0, response);
        // Trust the category the call was scoped to, not the model's echo.
        // Clamp/round the model's percentage so it can't render as e.g. "73.4182%"
        // or drift outside a sane 1-99 admission-chance range.
        return parsed.schools.map((s) => ({
          ...s,
          category,
          percentage: Math.min(99, Math.max(1, Math.round(s.percentage))),
        }));
      } catch (err) {
        logAiUsage("matches/generate", userId, MODEL, t0, err instanceof Error ? err : new Error(String(err)));
        lastErr = err;
        console.error(`generateCategory(${category}) attempt ${attempt + 1} failed:`, err);
      }
    }
    throw lastErr;
  }

  // Reach/target/safety run concurrently — ~1/3 the wall-clock of one 15-school call.
  // allSettled rather than all: one category (e.g. "safety") failing its retries
  // shouldn't sink the other two categories that succeeded fine.
  const settled = await Promise.allSettled(CATEGORIES.map(generateCategory));
  settled.forEach((result, i) => {
    if (result.status === "rejected") {
      console.error(`Match generation failed for category ${CATEGORIES[i]}:`, result.reason);
    }
  });
  const byCategory = settled
    .filter((r): r is PromiseFulfilledResult<SchoolResult[]> => r.status === "fulfilled")
    .map((r) => r.value);

  if (byCategory.length === 0) {
    return NextResponse.json({ error: "Failed to generate matches. Please try again." }, { status: 502 });
  }

  const seen = new Set<string>();
  const schools = byCategory.flat().filter((s) => {
    const key = s.name.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  await supabase.from("school_matches").update({ is_active: false }).eq("user_id", userId);

  const rows = schools.map((s) => ({
    user_id: userId,
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
    .upsert({ user_id: userId, week_start_date: week, count: currentCount + 1 });

  return NextResponse.json({ ok: true });
}
