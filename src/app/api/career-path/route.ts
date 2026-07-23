import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getAnthropic, MODEL, extractJson } from "@/lib/anthropic";
import { logAiUsage, flagAnomalousUsage } from "@/lib/ai-usage-log";
import { canAccessFeature } from "@/lib/access";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireString, rejectScriptTags, ValidationError } from "@/lib/validate";
import { isTrustedOrigin } from "@/lib/origin-check";

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days -- career/labor-market patterns for a given major+school barely shift

function careerPathCacheKey(majors: string[], schoolName: string): string {
  const majorPart = majors.length ? [...majors].map((m) => m.toLowerCase().trim()).sort().join(",") : "undecided";
  return `${majorPart}::${schoolName.trim().toLowerCase()}`;
}

const CAREER_PATH_PROMPT = `You are describing typical post-graduation career patterns for a student with one or more given intended majors considering a specific school. Ground your answer in general, real-world patterns for that major (or majors), not specifics about named individuals, and avoid naming specific employers unless they are broadly, publicly known as common hirers for that major (e.g. "large public accounting firms" rather than a specific invented company). Salary ranges should reflect realistic national early-career figures for that major, not the most extreme outcomes.

If more than one major is given, address the combination genuinely — e.g. a real interdisciplinary path some students in that combination pursue — rather than picking just one and ignoring the rest; if the majors don't have an obvious combined path, briefly cover each rather than silently dropping one.

If the major is "Undecided," do not default to a single arbitrary field — instead describe the general shape of outcomes for an undecided student at this school (e.g. common first-declared majors, the range of paths available, how much time students typically have before declaring), rather than fabricating a specific career track.

Use the named school only where it plausibly changes the real answer (e.g. a school with a strong co-op/internship program, a specific regional employer base, or a distinctive program strength for this major) — do not invent a school-specific detail you're not confident is real; when the school doesn't meaningfully change the general pattern for this major, say so implicitly by giving the general pattern rather than manufacturing a false school-specific claim.

Never state a salary figure or statistic with more precision than you're genuinely confident in — round to a realistic range rather than implying false precision, and do not present a guess as if it were a verified data point.

Return JSON:
{
  "internships": ["string", "string", "string"],
  "employer_types": ["string", "string", "string"],
  "median_salary": "string (e.g. '$65,000–$80,000 early career')",
  "summary": "string (2-3 sentences, framed as general patterns, not guarantees)",
  "confidence": "'low' | 'moderate' | 'high' -- how well-established these patterns actually are for this major/school combination; 'low' for an unusual major/school pairing or thin public data, 'high' only for a common, well-documented major with abundant real labor-market data"
}`;

export async function POST(req: Request) {
  if (!isTrustedOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await checkRateLimit(supabase, `career-path:${user.id}`, 10, 60_000)).ok) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment and try again." }, { status: 429 });
  }

  const { data: profile, error: profileError } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
  if (profileError) {
    console.error("career-path profile query failed:", profileError);
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }
  if (!canAccessFeature(profile, "career_path_explorer")) {
    return NextResponse.json({ error: "Career Path is a Premium feature." }, { status: 403 });
  }

  let schoolName: string;
  let regenFeedback: string | undefined;
  let majorOverride: string[] | undefined;
  try {
    const body = await req.json();
    schoolName = requireString(body.schoolName, "School name", 200);
    rejectScriptTags(schoolName, "School name");
    if (body.regenFeedback !== undefined && body.regenFeedback !== "") {
      regenFeedback = requireString(body.regenFeedback, "Feedback", 1_000);
      rejectScriptTags(regenFeedback, "Feedback");
    }
    // Interest-quiz exploration (Software_Timeline.md 9e): an undecided
    // student can explore what a career path in a quiz-suggested major
    // would look like without that major being persisted as their actual
    // intended_major -- a one-off override for this request only.
    if (Array.isArray(body.majorOverride) && body.majorOverride.length > 0) {
      majorOverride = body.majorOverride.filter((m: unknown) => typeof m === "string").slice(0, 5);
      for (const m of majorOverride ?? []) rejectScriptTags(m, "Major");
    }
  } catch (e) {
    if (e instanceof ValidationError) return NextResponse.json({ error: e.message }, { status: 400 });
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const majors = majorOverride?.length ? majorOverride : profile.intended_major?.length ? (profile.intended_major as string[]) : [];
  const cacheKey = careerPathCacheKey(majors, schoolName);
  const serviceClient = createServiceClient();

  // Regenerate-with-feedback is a personal steer for this one student, not a
  // fact about the major/school pairing -- never read from or overwrite the
  // shared cache in that case, only a plain (re)load.
  if (!regenFeedback) {
    const { data: cached, error: cacheReadError } = await serviceClient
      .from("career_path_cache")
      .select("*")
      .eq("cache_key", cacheKey)
      .maybeSingle();
    if (cacheReadError) console.error("career-path cache read failed:", cacheReadError);
    if (cached && Date.now() - new Date(cached.fetched_at).getTime() < CACHE_TTL_MS) {
      return NextResponse.json({
        internships: cached.internships,
        employer_types: cached.employer_types,
        median_salary: cached.median_salary,
        summary: cached.summary,
        confidence: cached.confidence ?? undefined,
      });
    }
  }

  flagAnomalousUsage("career-path", user.id);
  const t0 = Date.now();
  try {
    const response = await getAnthropic().messages.create({
      model: MODEL,
      max_tokens: 1024,
      thinking: { type: "disabled" },
      system: CAREER_PATH_PROMPT,
      messages: [
        {
          role: "user",
          content: `Major: ${majors.length ? majors.join(", ") : "Undecided"}\nSchool: ${schoolName}${
            regenFeedback
              ? `\n\nThe student was asked "what should change?" on a regenerate and said: "${regenFeedback}" -- address this directly rather than repeating a similar summary.`
              : ""
          }`,
        },
      ],
    });
    logAiUsage("career-path", user.id, MODEL, t0, response);
    const text = response.content.find((b) => b.type === "text")?.text ?? "";
    const parsed = extractJson<{
      internships: string[];
      employer_types: string[];
      median_salary: string;
      summary: string;
      confidence?: "low" | "moderate" | "high";
    }>(text);

    if (!regenFeedback) {
      const { error: cacheWriteError } = await serviceClient.from("career_path_cache").upsert({
        cache_key: cacheKey,
        internships: parsed.internships,
        employer_types: parsed.employer_types,
        median_salary: parsed.median_salary,
        summary: parsed.summary,
        confidence: parsed.confidence ?? null,
        fetched_at: new Date().toISOString(),
      });
      if (cacheWriteError) console.error("career-path cache write failed:", cacheWriteError);
    }

    return NextResponse.json(parsed);
  } catch (err) {
    logAiUsage("career-path", user.id, MODEL, t0, err instanceof Error ? err : new Error(String(err)));
    return NextResponse.json({ error: "Failed to generate career path. Please try again." }, { status: 502 });
  }
}
