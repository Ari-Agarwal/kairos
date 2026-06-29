import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isTrustedOrigin } from "@/lib/origin-check";
import { sendWelcomeEmail } from "@/lib/email";

export async function POST(req: Request) {
  if (!isTrustedOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await sendWelcomeEmail(user.email, (user.user_metadata?.full_name as string) || "");
  } catch {
    // Best-effort: a failed welcome email should never block onboarding.
  }

  return NextResponse.json({ ok: true });
}
