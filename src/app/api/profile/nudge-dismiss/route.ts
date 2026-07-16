import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isTrustedOrigin } from "@/lib/origin-check";

// Resets the living-profile nudge clock without requiring an actual edit --
// "nothing's changed" is a valid answer, and re-asking daily would just teach
// students to ignore the banner.
export async function POST(req: Request) {
  if (!isTrustedOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("profiles")
    .update({ last_profile_check_at: new Date().toISOString() })
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: "Failed to update." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
