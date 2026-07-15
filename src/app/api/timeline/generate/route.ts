import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropic, MODEL, LOGISTICS_PROMPT, STRATEGIC_PROMPT, extractJson } from "@/lib/anthropic";
import { logAiUsage, flagAnomalousUsage } from "@/lib/ai-usage-log";
import { checkRateLimit } from "@/lib/rate-limit";
import { isTrustedOrigin } from "@/lib/origin-check";
import { canRegenerate, weekStart } from "@/lib/access";

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

  const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", userId).single();
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const week = weekStart(new Date());
  const { data: regenRow } = await supabase
    .from("regeneration_log")
    .select("timeline_count")
    .eq("user_id", userId)
    .eq("week_start_date", week)
    .maybeSingle();

  const currentCount = regenRow?.timeline_count ?? 0;
  if (!canRegenerate(profile, currentCount)) {
    return NextResponse.json(
      { error: "Weekly timeline regeneration limit reached. Upgrade to Premium for unlimited regenerations." },
      { status: 403 }
    );
  }

  const { data: matches } = await supabase
    .from("school_matches")
    .select("school_name, category")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (!matches || matches.length === 0) {
    return NextResponse.json({ error: "Generate your school matches first." }, { status: 400 });
  }

  const userMessage = `Today's date: ${new Date().toISOString().slice(0, 10)}

Student profile:
Grade level: ${profile.grade_level}
Unweighted GPA: ${profile.unweighted_gpa}
Weighted GPA: ${profile.weighted_gpa}
Intended major: ${profile.intended_major ?? "not specified"}
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

Matched schools:
${matches.map((m) => `- ${m.school_name} (${m.category})`).join("\n")}`;

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
    return NextResponse.json({ error: "Failed to generate timeline. Please try again." }, { status: 502 });
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
    })),
  ];

  const { error } = await supabase.from("timeline_items").insert(rows);
  if (error) return NextResponse.json({ error: "Failed to save timeline." }, { status: 500 });

  await supabase
    .from("regeneration_log")
    .upsert({ user_id: userId, week_start_date: week, timeline_count: currentCount + 1 });

  return NextResponse.json({ ok: true });
}
