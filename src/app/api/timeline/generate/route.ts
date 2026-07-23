import { NextResponse, after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropic, MODEL, PROMPT_VERSION, LOGISTICS_PROMPT, STRATEGIC_PROMPT, extractJson } from "@/lib/anthropic";
import { logAiUsage, flagAnomalousUsage } from "@/lib/ai-usage-log";
import { checkRateLimit } from "@/lib/rate-limit";
import { isTrustedOrigin } from "@/lib/origin-check";
import { canRegenerate, weekStart } from "@/lib/access";
import { getSchoolDeadline } from "@/lib/school-deadlines";
import { rejectScriptTags, ValidationError } from "@/lib/validate";

// Extended thinking at "high" effort takes 20-30s per section call on real
// requests -- Vercel's default function duration (10s on Hobby) isn't enough,
// so this must be raised explicitly. 60s is the Hobby-plan ceiling.
export const maxDuration = 60;

interface TimelineEntry {
  title: string;
  due_date: string | null;
  school_tags: string[];
  why_text: string;
  what_to_do: string[];
  is_recurring?: boolean;
  is_financial_aid?: boolean;
}

export async function GET(req: Request) {
  if (!isTrustedOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("generation_jobs")
    .select("status, error_message")
    .eq("user_id", user.id)
    .eq("feature", "timeline")
    .maybeSingle();

  if (error) {
    console.error("timeline generate job status query failed:", error);
    return NextResponse.json({ error: "Failed to check status" }, { status: 500 });
  }
  return NextResponse.json({ status: data?.status ?? null, error_message: data?.error_message ?? null });
}

export async function POST(req: Request) {
  if (!isTrustedOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = user.id;

  if (!(await checkRateLimit(supabase, `timeline:${userId}`, 5, 60_000)).ok) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment and try again." }, { status: 429 });
  }

  // Optional "what would you like different" explanation from the timeline
  // page's regenerate flow -- edits the timeline rather than a blind redo.
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

  const { data: profile, error: profileError } = await supabase.from("profiles").select("*").eq("user_id", userId).single();
  if (profileError) {
    console.error("timeline generate profile query failed:", profileError);
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const week = weekStart(new Date());
  const { data: regenRow, error: regenRowError } = await supabase
    .from("regeneration_log")
    .select("timeline_count")
    .eq("user_id", userId)
    .eq("week_start_date", week)
    .maybeSingle();

  if (regenRowError) console.error("timeline generate regeneration_log query failed:", regenRowError);

  const currentCount = regenRow?.timeline_count ?? 0;
  if (!canRegenerate(profile, currentCount)) {
    return NextResponse.json(
      { error: "Weekly timeline regeneration limit reached. Upgrade to Premium for unlimited regenerations." },
      { status: 403 }
    );
  }

  const { data: matches, error: matchesError } = await supabase
    .from("school_matches")
    .select("school_name, category")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (matchesError) {
    console.error("timeline generate matches query failed:", matchesError);
    return NextResponse.json({ error: "Failed to load school matches" }, { status: 500 });
  }

  if (!matches || matches.length === 0) {
    return NextResponse.json({ error: "Generate your school matches first." }, { status: 400 });
  }
  const confirmedMatches = matches;

  const { error: jobError } = await supabase
    .from("generation_jobs")
    .upsert({ user_id: userId, feature: "timeline", status: "pending", error_message: null }, { onConflict: "user_id,feature" });
  if (jobError) {
    console.error("timeline generate job upsert failed:", jobError);
    return NextResponse.json({ error: "Failed to start generation." }, { status: 500 });
  }

  // Everything past this point (the actual AI calls + DB writes) runs after
  // the response is sent -- the client no longer holds one long request open
  // for up to ~50s, it polls GET on this route for job status instead.
  after(async () => {
    try {
      await runGeneration();
    } catch (err) {
      console.error("timeline generate background job failed:", err);
      await markJobError("Failed to generate timeline. Please try again.");
    }
  });

  return NextResponse.json({ ok: true, deferred: true }, { status: 202 });

  async function runGeneration() {
  const userMessage = `Today's date: ${new Date().toISOString().slice(0, 10)}

Student profile:
Grade level: ${profile.grade_level}
Unweighted GPA: ${profile.unweighted_gpa}
Weighted GPA: ${profile.weighted_gpa}
Intended major: ${profile.intended_major?.length ? profile.intended_major.join(", ") : "not specified"}
Extracurriculars: ${(profile.extracurriculars as string[] | null)?.join("; ") || "not specified"}
SAT score: ${profile.sat_score ?? "not specified"}
ACT score: ${profile.act_score ?? "not specified"}
Class rank: ${profile.class_rank ?? "not specified"}
AP/IB courses: ${profile.ap_ib_count ?? "not specified"}
Career goals: ${profile.career_goals ?? "not specified"}
Geographic preference: ${profile.geographic_pref ?? "not specified"}
Financial aid need: ${profile.financial_aid_need === null ? "not specified" : profile.financial_aid_need ? "yes" : "no"}
Annual budget ceiling: ${profile.budget_ceiling ?? "not specified"}
First-generation student: ${profile.first_gen === null ? "not specified" : profile.first_gen ? "yes" : "no"}
Legacy school: ${profile.legacy_school ?? "none"}
Schools already considering: ${profile.schools_already_considering ?? "not specified"}
Internships / research experience: ${profile.internships_research ?? "not specified"}
Applicant type: ${profile.applicant_type ?? "standard (first-time freshman/senior applicant)"}
${feedback ? `\n${isRegenerate ? `The student was asked "what should change from your current timeline?" and said: "${feedback}" -- this is a correction to the timeline they already have, so directly address it (fix the missing/wrong item, reorder, or thin it out as asked)` : `The student was asked "what would you like different in your timeline?" and said: "${feedback}" -- edit the timeline to reflect this rather than ignoring it`}, but don't fabricate false urgency or drop the grade-level scoping rules below just to satisfy it.\n` : ""}
Matched schools:
${confirmedMatches.map((m) => `- ${m.school_name} (${m.category})`).join("\n")}

Confirmed deadlines (source-verified, use these exact dates verbatim -- do not
alter or hedge them -- for any matched school listed below; for matched
schools NOT listed here, continue using general/typical ED-EA-RD timing
patterns and label them as general, not confirmed):
${confirmedMatches
  .map((m) => {
    const d = getSchoolDeadline(m.school_name);
    if (!d) return null;
    const parts = [
      d.ed_deadline && `ED: ${d.ed_deadline}`,
      d.ed2_deadline && `ED II: ${d.ed2_deadline}`,
      d.ea_deadline && `EA: ${d.ea_deadline}`,
      d.rea_deadline && `REA/SCEA: ${d.rea_deadline}`,
      d.rd_deadline && `RD: ${d.rd_deadline}`,
    ].filter(Boolean);
    return `- ${m.school_name}: ${parts.join(", ")}`;
  })
  .filter(Boolean)
  .join("\n") || "(none of the matched schools have confirmed deadlines on file)"}`;

  async function generateSection<K extends "logistics" | "strategic_advice">(
    system: string,
    key: K
  ): Promise<TimelineEntry[]> {
    flagAnomalousUsage("timeline/generate", userId);
    let lastErr: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
      const t0 = Date.now();
      try {
        const response = await getAnthropic().messages.create({
          model: MODEL,
          max_tokens: 6144,
          thinking: { type: "adaptive" },
          // "medium" rather than "high" -- cuts per-call wall time substantially
          // (this is the dominant cost in the 60s Vercel duration budget) at the
          // cost of somewhat less exhaustive reasoning per item.
          output_config: { effort: "medium" },
          system,
          messages: [{ role: "user", content: userMessage }],
        });
        if (response.stop_reason === "max_tokens") {
          throw new Error(`Response truncated at max_tokens for section ${key}`);
        }
        logAiUsage("timeline/generate", userId, MODEL, t0, response);
        const text = response.content.find((b) => b.type === "text")?.text ?? "";
        return extractJson<Record<K, TimelineEntry[]>>(text)[key];
      } catch (err) {
        logAiUsage("timeline/generate", userId, MODEL, t0, err instanceof Error ? err : new Error(String(err)));
        lastErr = err;
        console.error(`generateSection(${key}) attempt ${attempt + 1} failed:`, err);
      }
    }
    throw lastErr;
  }

  // Deadlines and strategic advice generate concurrently. allSettled rather
  // than all: one section failing its retries shouldn't wipe out the other
  // section that succeeded fine.
  const [logisticsResult, strategicResult] = await Promise.allSettled([
    generateSection(LOGISTICS_PROMPT, "logistics"),
    generateSection(STRATEGIC_PROMPT, "strategic_advice"),
  ]);

  if (logisticsResult.status === "rejected") {
    console.error("Timeline generation failed for logistics:", logisticsResult.reason);
  }
  if (strategicResult.status === "rejected") {
    console.error("Timeline generation failed for strategic_advice:", strategicResult.reason);
  }
  if (logisticsResult.status === "rejected" && strategicResult.status === "rejected") {
    await markJobError("Failed to generate timeline. Please try again.");
    return;
  }

  const logistics: TimelineEntry[] = logisticsResult.status === "fulfilled" ? logisticsResult.value : [];
  const strategic_advice: TimelineEntry[] = strategicResult.status === "fulfilled" ? strategicResult.value : [];

  await supabase.from("timeline_items").delete().eq("user_id", userId);

  const rows = [
    ...logistics.map((i) => ({
      user_id: userId,
      title: i.title,
      due_date: i.due_date,
      school_tags: i.school_tags,
      tier: "free" as const,
      is_strategic: false,
      why_text: i.why_text,
      what_to_do: i.what_to_do,
      is_recurring: i.is_recurring ?? false,
      is_financial_aid: i.is_financial_aid ?? false,
      prompt_version: PROMPT_VERSION,
    })),
    ...strategic_advice.map((i) => ({
      user_id: userId,
      title: i.title,
      due_date: null,
      school_tags: i.school_tags,
      tier: "premium" as const,
      is_strategic: true,
      why_text: i.why_text,
      what_to_do: i.what_to_do,
      is_recurring: i.is_recurring ?? false,
      is_financial_aid: false,
      prompt_version: PROMPT_VERSION,
    })),
  ];

  const { error } = await supabase.from("timeline_items").insert(rows);
  if (error) {
    await markJobError("Failed to save timeline.");
    return;
  }

  await supabase
    .from("regeneration_log")
    .upsert({ user_id: userId, week_start_date: week, timeline_count: currentCount + 1 });

  await supabase
    .from("generation_jobs")
    .upsert({ user_id: userId, feature: "timeline", status: "done", error_message: null }, { onConflict: "user_id,feature" });
  }

  async function markJobError(message: string) {
    await supabase
      .from("generation_jobs")
      .upsert({ user_id: userId, feature: "timeline", status: "error", error_message: message }, { onConflict: "user_id,feature" });
  }
}
