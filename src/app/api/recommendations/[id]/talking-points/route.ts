import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAnthropic, MODEL, REC_LETTER_TALKING_POINTS_PROMPT, extractJson } from "@/lib/anthropic";
import { checkRateLimit } from "@/lib/rate-limit";
import { logAiUsage, flagAnomalousUsage } from "@/lib/ai-usage-log";

interface TalkingPointsResult {
  talking_points: string[];
  closing_note: string;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = (await params).id;

  if (token.length !== 64 || !/^[0-9a-f]+$/.test(token)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const service = createServiceClient();

  const { data: rec, error: recError } = await service
    .from("recommenders")
    .select("recommender_name, relationship, brag_sheet, user_id")
    .eq("share_token", token)
    .single();

  if (recError) console.error("talking-points recommender lookup failed:", recError);
  if (!rec) return NextResponse.json({ error: "Not found." }, { status: 404 });

  // Public, unauthenticated endpoint — key the limit on the token itself
  // (not a user id, since the caller isn't authenticated).
  const rl = await checkRateLimit(service, `rec-talking-points:${token}`, 10, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests. Please wait a moment and try again." }, { status: 429 });

  // Reads straight off profiles.display_name rather than an
  // auth.admin.getUserById() round-trip -- same fix as the recommender page
  // itself, for the same unreliable fan-out pattern (Section 4's earlier fix
  // across the counselor-facing pages missed both of this feature's routes).
  const { data: profile, error: profileError } = await service
    .from("profiles")
    .select("display_name")
    .eq("user_id", rec.user_id)
    .maybeSingle();
  if (profileError) console.error("talking-points profile lookup failed:", profileError);
  const fullName = profile?.display_name?.trim() || "the student";
  const firstName = fullName.split(" ")[0];

  const brag = (rec.brag_sheet ?? {}) as Record<string, string>;

  const userContent = JSON.stringify({
    recommender_relationship: rec.relationship,
    student_first_name: firstName,
    brag_sheet: {
      activities: brag.activities ?? "",
      achievements: brag.achievements ?? "",
      anecdotes: brag.anecdotes ?? "",
      additional_context: brag.additional_context ?? "",
    },
  });

  flagAnomalousUsage("recommendations/talking-points", rec.user_id);
  const t0 = Date.now();
  const anthropic = getAnthropic();
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    thinking: { type: "disabled" },
    messages: [
      {
        role: "user",
        content: `${REC_LETTER_TALKING_POINTS_PROMPT}\n\nInput:\n${userContent}`,
      },
    ],
  });
  logAiUsage("recommendations/talking-points", rec.user_id, MODEL, t0, message);

  const raw = message.content.find((b) => b.type === "text")?.text ?? "";
  let result: TalkingPointsResult;
  try {
    result = extractJson<TalkingPointsResult>(raw);
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response." }, { status: 500 });
  }

  return NextResponse.json({
    talking_points: result.talking_points ?? [],
    closing_note: result.closing_note ?? "",
  });
}
