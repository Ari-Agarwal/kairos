import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropic, MODEL, ONBOARDING_REFLECTION_PROMPT } from "@/lib/anthropic";
import { logAiUsage, flagAnomalousUsage } from "@/lib/ai-usage-log";
import { checkRateLimit } from "@/lib/rate-limit";
import { rejectScriptTags } from "@/lib/validate";
import { isTrustedOrigin } from "@/lib/origin-check";

// Section 1 "Showcase / demo polish" aha moment: a cheap, short synthesis of
// the student's first open-ended onboarding answers, shown inline before the
// rest of the form. Runs before a `profiles` row exists (mid-onboarding), so
// this only requires an authenticated user, not a profile lookup.
const MAX_FIELD_LENGTH = 500;

export async function POST(req: Request) {
  if (!isTrustedOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await checkRateLimit(supabase, `onboarding-reflect:${user.id}`, 8, 60_000)).ok) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment and try again." }, { status: 429 });
  }

  let interests = "";
  let mattersToYou = "";
  let beyondTranscript = "";
  try {
    const body = await req.json();
    for (const [key, ref] of [
      ["interests", "Interests"],
      ["mattersToYou", "What matters to you"],
      ["beyondTranscript", "Beyond the transcript"],
    ] as const) {
      const value = body?.[key];
      if (typeof value === "string" && value.trim()) {
        if (value.length > MAX_FIELD_LENGTH) {
          return NextResponse.json({ error: `${ref} is too long.` }, { status: 400 });
        }
        rejectScriptTags(value, ref);
      }
    }
    interests = typeof body?.interests === "string" ? body.interests.trim() : "";
    mattersToYou = typeof body?.mattersToYou === "string" ? body.mattersToYou.trim() : "";
    beyondTranscript = typeof body?.beyondTranscript === "string" ? body.beyondTranscript.trim() : "";
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!interests && !mattersToYou && !beyondTranscript) {
    // Nothing to reflect on yet -- not an error, just nothing to say.
    return NextResponse.json({ reflection: null });
  }

  const userContent = [
    interests && `Interests: ${interests}`,
    mattersToYou && `What matters to them in a college: ${mattersToYou}`,
    beyondTranscript && `Something a transcript wouldn't show: ${beyondTranscript}`,
  ]
    .filter(Boolean)
    .join("\n");

  flagAnomalousUsage("onboarding-reflect", user.id);
  const t0 = Date.now();
  try {
    const response = await getAnthropic().messages.create({
      model: MODEL,
      max_tokens: 200,
      thinking: { type: "disabled" },
      system: ONBOARDING_REFLECTION_PROMPT,
      messages: [{ role: "user", content: userContent }],
    });
    logAiUsage("onboarding-reflect", user.id, MODEL, t0, response);
    if (response.stop_reason === "max_tokens") {
      return NextResponse.json({ reflection: null });
    }
    const text = response.content.find((b) => b.type === "text")?.text?.trim() ?? "";
    return NextResponse.json({ reflection: text || null });
  } catch (err) {
    logAiUsage("onboarding-reflect", user.id, MODEL, t0, err instanceof Error ? err : new Error(String(err)));
    // Purely cosmetic feature -- fail soft, never block onboarding.
    return NextResponse.json({ reflection: null });
  }
}
