import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isTrustedOrigin } from "@/lib/origin-check";
import { requireString, rejectScriptTags, ValidationError } from "@/lib/validate";
import { hasLoggedAcceptOutcome } from "@/lib/mentor";

export async function POST(req: Request) {
  if (!isTrustedOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body.optIn !== "boolean") {
    return NextResponse.json({ error: "optIn (boolean) is required." }, { status: 400 });
  }

  if (body.optIn && !(await hasLoggedAcceptOutcome(supabase, user.id))) {
    return NextResponse.json({ error: "You can only become a mentor for a school you've logged an acceptance to." }, { status: 403 });
  }

  let bio: string | null = null;
  if (body.optIn) {
    try {
      bio = requireString(body.bio, "Mentor bio", 1000);
      rejectScriptTags(bio, "Mentor bio");
    } catch (e) {
      if (e instanceof ValidationError) return NextResponse.json({ error: e.message }, { status: 400 });
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({ mentor_opt_in: body.optIn, mentor_bio: bio })
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: "Failed to update mentor status." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
