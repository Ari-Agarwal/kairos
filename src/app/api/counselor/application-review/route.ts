import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropic, MODEL, APPLICATION_PACKAGING_REVIEW_PROMPT, extractJson } from "@/lib/anthropic";
import { logAiUsage, flagAnomalousUsage } from "@/lib/ai-usage-log";
import { getCounselorRecord } from "@/lib/access";
import { checkRateLimit } from "@/lib/rate-limit";
import { isTrustedOrigin } from "@/lib/origin-check";

interface PackagingReview {
  overall_read: string;
  consistent_threads: string[];
  inconsistencies: string[];
  counselor_recommendation: string;
}

export async function POST(req: Request) {
  if (!isTrustedOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const counselor = await getCounselorRecord(supabase, user.id);
  if (!counselor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const studentUserId = body?.studentUserId;
  if (typeof studentUserId !== "string" || !studentUserId) {
    return NextResponse.json({ error: "studentUserId is required." }, { status: 400 });
  }

  if (!(await checkRateLimit(supabase, `application-review:${counselor.counselor_id}`, 10, 60_000)).ok) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment and try again." }, { status: 429 });
  }

  // Verify the student belongs to this counselor's school AND has opted in
  // to sharing narrative/essay work (Software_Timeline.md 8, migration_055).
  // Checked explicitly here (rather than relying only on RLS) so we can give
  // the counselor a clear "not shared" message instead of a silently empty
  // review.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("user_id, display_name, intended_major, extracurriculars, share_narrative_with_counselor")
    .eq("user_id", studentUserId)
    .eq("school_id", counselor.school_id)
    .maybeSingle();

  if (profileError) {
    console.error("application-review profile query failed:", profileError);
    return NextResponse.json({ error: "Failed to load student." }, { status: 500 });
  }
  if (!profile) {
    return NextResponse.json({ error: "Student not found." }, { status: 404 });
  }
  if (!profile.share_narrative_with_counselor) {
    return NextResponse.json(
      { error: "This student hasn't shared their narrative and essay work with you, so a packaging review isn't available." },
      { status: 403 }
    );
  }

  const { data: narrativeProfile, error: narrativeError } = await supabase
    .from("narrative_profiles")
    .select("throughline, core_values, differentiator")
    .eq("user_id", studentUserId)
    .maybeSingle();
  if (narrativeError) console.error("application-review narrative query failed:", narrativeError);

  const { data: essayHistory, error: essayError } = await supabase
    .from("essay_feedback_history")
    .select("school, is_rubric, feedback, created_at")
    .eq("user_id", studentUserId)
    .order("created_at", { ascending: false })
    .limit(10);
  if (essayError) console.error("application-review essay history query failed:", essayError);

  const throughlineBlock = narrativeProfile?.throughline
    ? [
        `Narrative throughline: ${narrativeProfile.throughline}`,
        narrativeProfile.core_values?.length ? `Core values: ${(narrativeProfile.core_values as string[]).join(", ")}` : null,
        narrativeProfile.differentiator ? `Differentiator: ${narrativeProfile.differentiator}` : null,
      ]
        .filter(Boolean)
        .join("\n")
    : "No narrative throughline has been built yet.";

  const essayBlock = essayHistory && essayHistory.length > 0
    ? essayHistory
        .map((h, i) => {
          const items = (h.feedback as { label?: string; dimension?: string }[] | null) ?? [];
          const labels = items.map((it) => it.dimension ? `${it.dimension}: ${it.label}` : it.label).filter(Boolean).join("; ");
          return `${i + 1}. ${h.school || "Unspecified school"}${h.is_rubric ? " (rubric)" : ""} -- flagged: ${labels || "no items recorded"}`;
        })
        .join("\n")
    : "No essay feedback history on record.";

  const activitiesBlock = (profile.extracurriculars as string[] | null)?.length
    ? (profile.extracurriculars as string[]).join("; ")
    : "No activities listed.";

  const majorBlock = (profile.intended_major as string[] | null)?.length
    ? (profile.intended_major as string[]).join(", ")
    : "Undecided";

  const userContent = [
    throughlineBlock,
    "",
    `Intended major: ${majorBlock}`,
    `Activities: ${activitiesBlock}`,
    "",
    "Essay feedback history (most recent first):",
    essayBlock,
  ].join("\n");

  flagAnomalousUsage("counselor/application-review", user.id);
  const t0 = Date.now();
  try {
    const response = await getAnthropic().messages.create({
      model: MODEL,
      max_tokens: 1024,
      thinking: { type: "disabled" },
      system: APPLICATION_PACKAGING_REVIEW_PROMPT,
      messages: [{ role: "user", content: userContent }],
    });
    logAiUsage("counselor/application-review", user.id, MODEL, t0, response);
    const text = response.content.find((b) => b.type === "text")?.text ?? "";
    const parsed = extractJson<PackagingReview>(text);
    return NextResponse.json(parsed);
  } catch (err) {
    logAiUsage("counselor/application-review", user.id, MODEL, t0, err instanceof Error ? err : new Error(String(err)));
    return NextResponse.json({ error: "Failed to generate packaging review. Please try again." }, { status: 502 });
  }
}
