import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropic, MODEL, PROMPT_VERSION, schoolMatchingPrompt } from "@/lib/anthropic";
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
  confidence: "low" | "moderate" | "high";
  merit_aid_likelihood: "low" | "moderate" | "high" | "not applicable";
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
  applicant_type: string | null;
  accessibility_pref: string | null;
  financial_aid_info_consent: boolean | null;
  financial_aid_income_bracket: string | null;
  financial_aid_state: string | null;
  financial_aid_family_size: number | null;
}

const INCOME_BRACKET_LABELS: Record<string, string> = {
  under_30k: "under $30,000",
  "30k_60k": "$30,000–$60,000",
  "60k_100k": "$60,000–$100,000",
  "100k_150k": "$100,000–$150,000",
  "150k_250k": "$150,000–$250,000",
  over_250k: "over $250,000",
  prefer_not_to_say: "prefer not to say",
};

// Only built when the student has actually opted in AND given a usable
// income bracket -- "financial_aid_info_consent" alone (with every value
// still null) is not enough to build a real signal. "prefer_not_to_say" is
// explicit consent to share nothing further, so it also yields no signal.
function affordabilitySignal(profile: Profile): string | null {
  if (!profile.financial_aid_info_consent) return null;
  const bracket = profile.financial_aid_income_bracket;
  if (!bracket || bracket === "prefer_not_to_say") return null;
  const label = INCOME_BRACKET_LABELS[bracket] ?? bracket;
  const parts = [`household income ${label}`];
  if (profile.financial_aid_family_size) parts.push(`family size ${profile.financial_aid_family_size}`);
  if (profile.financial_aid_state) parts.push(`home state ${profile.financial_aid_state}`);
  return parts.join(", ");
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
  let isRegenerate = false;
  try {
    const body = await req.json().catch(() => ({}));
    if (typeof body?.feedback === "string" && body.feedback.trim().length > 0) {
      if (body.feedback.length > 1000) {
        return NextResponse.json({ error: "Feedback must be 1000 characters or fewer." }, { status: 400 });
      }
      rejectScriptTags(body.feedback, "feedback");
      feedback = body.feedback.trim();
    }
    isRegenerate = body?.isRegenerate === true;
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

  // Schools the student locked stay untouched by this regenerate -- fetched
  // up front so the prompt tells the model not to re-suggest them (it would
  // otherwise duplicate a school already staying on the list) and so the
  // insert below can skip re-adding them under a fresh, possibly-conflicting
  // assessment.
  const { data: lockedRows, error: lockedRowsError } = await supabase
    .from("school_matches")
    .select("school_name")
    .eq("user_id", userId)
    .eq("is_active", true)
    .eq("locked", true);
  if (lockedRowsError) console.error("matches generate locked-rows query failed:", lockedRowsError);
  const lockedNamesOriginal = (lockedRows ?? []).map((r) => r.school_name);
  const lockedNames = new Set(lockedNamesOriginal.map((n) => n.trim().toLowerCase()));

  const missing = missingFields(profile);
  const affordability = affordabilitySignal(profile);
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
Applicant type: ${profile.applicant_type ?? "standard (first-time freshman/senior applicant)"}
Accessibility/accommodation needs: ${profile.accessibility_pref ?? "not given"}
${affordability ? `Estimated affordability: ${affordability} (student opted in to share this)` : ""}
${missing.length > 0 ? `Missing fields: ${missing.join(", ")}` : ""}
${lockedNames.size > 0 ? `\nThe student has locked in the following schools already on their list -- they are staying regardless of this generation, so do NOT include them in your results: ${lockedNamesOriginal.join(", ")}.` : ""}
${feedback ? `\n${isRegenerate ? `The student was asked "what should change from your last list?" and said: "${feedback}" — this is feedback on the list they just saw, so treat it as a direct correction (e.g. if they said "too many reach schools," shift the new list's balance accordingly), not just a general preference.` : `The student was asked "what are you looking for in your matches?" and said: "${feedback}"`} Weigh this alongside the profile above; don't let it override hard constraints like GPA/test-score realism, but do let it steer emphasis (e.g. toward a specific region, school size, or program strength).` : ""}`;

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
              confidence: {
                type: "string" as const,
                enum: ["low", "moderate", "high"],
                description:
                  "How confident this specific estimate is, based on how much real data backs it -- 'low' when key inputs (test scores, GPA, or a clear major) are missing or the school's admitted-range data is thin/uncertain; 'high' only when GPA, test scores, and major are all known and the school's real acceptance data is well-established; 'moderate' otherwise.",
              },
              merit_aid_likelihood: {
                type: "string" as const,
                enum: ["low", "moderate", "high", "not applicable"],
                description:
                  "Distinct from need-based aid (never estimated here -- no financial data is used for this field). Merit aid is typically awarded to applicants who sit well ABOVE a school's typical admitted range, so reuse the same percentile placement already computed for this school's category/percentage: 'high' when the student is meaningfully above the 75th percentile on GPA and (if given) test scores for this school -- the stronger they are relative to the admitted pool, the more likely a merit award, regardless of whether this school is this student's reach/target/safety; 'moderate' when around or somewhat above the median; 'low' when at or below the median (admission itself may still be likely at a safety school, but that doesn't imply merit money); 'not applicable' only for schools that are need-based-aid-only and do not offer merit scholarships (some highly selective privates) -- do not guess this, only use it when you are confident the school has a well-known no-merit-aid policy.",
              },
            },
            required: ["name", "percentage", "why_text", "factors", "confidence", "merit_aid_likelihood"],
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

  // Which categories never produced a usable list after both attempts --
  // surfaced to the client so a missing safety/reach tier reads as "we
  // couldn't generate this" rather than silently looking identical to "the
  // model judged you don't need one" (the two are indistinguishable from the
  // match list alone).
  const failedCategories = CATEGORIES.filter((_, i) => settled[i].status === "rejected");

  const seen = new Set<string>();
  const schools = byCategory.flat().filter((s) => {
    const key = s.name.trim().toLowerCase();
    if (seen.has(key) || lockedNames.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Locked rows are excluded from the deactivate sweep entirely, so a locked
  // school (and its real assessment) stays exactly as-is through a regenerate.
  await supabase.from("school_matches").update({ is_active: false }).eq("user_id", userId).eq("locked", false);

  const rows = schools.map((s) => ({
    user_id: userId,
    school_name: s.name,
    category: s.category,
    percentage: s.percentage,
    why_text: s.why_text,
    factors: s.factors,
    confidence: s.confidence,
    merit_aid_likelihood: s.merit_aid_likelihood,
    is_active: true,
    prompt_version: PROMPT_VERSION,
  }));

  const { error: insertError } = await supabase.from("school_matches").insert(rows);
  if (insertError) {
    return NextResponse.json({ error: "Failed to save matches." }, { status: 500 });
  }

  await supabase
    .from("regeneration_log")
    .upsert({ user_id: userId, week_start_date: week, count: currentCount + 1 });

  return NextResponse.json({ ok: true, failedCategories });
}
