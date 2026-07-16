import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isTrustedOrigin } from "@/lib/origin-check";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireString, rejectScriptTags, ValidationError } from "@/lib/validate";
import { createReport } from "@/lib/safety";

export async function POST(req: Request) {
  if (!isTrustedOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await checkRateLimit(supabase, `safety-report:${user.id}`, 20, 60_000)).ok) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment and try again." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

  try {
    const contentType = requireString(body.contentType, "contentType", 100);
    const reason = requireString(body.reason, "reason", 2000);
    rejectScriptTags(reason, "reason");

    const { error } = await createReport(supabase, {
      reporterId: user.id,
      reportedUserId: typeof body.reportedUserId === "string" ? body.reportedUserId : null,
      contentType,
      contentId: typeof body.contentId === "string" ? body.contentId : null,
      reason,
    });
    if (error) return NextResponse.json({ error: "Failed to submit report." }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ValidationError) return NextResponse.json({ error: err.message }, { status: 400 });
    return NextResponse.json({ error: "Failed to submit report." }, { status: 500 });
  }
}
