import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { isTrustedOrigin } from "@/lib/origin-check";

// Toggles the opt-in public portfolio (Section 16) on/off and lazily
// generates the share token the first time it's enabled. Separate from the
// generic shared-links flow -- this is a single standing public URL per
// student, not a revocable list of parent/counselor links.
export async function POST(req: Request) {
  if (!isTrustedOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const enabled = (body as Record<string, unknown>).enabled === true;

  const { data: existing, error: fetchError } = await supabase
    .from("profiles")
    .select("public_portfolio_token")
    .eq("user_id", user.id)
    .single();

  if (fetchError) {
    return NextResponse.json({ error: "Failed to load profile." }, { status: 500 });
  }

  // 256-bit random token, generated once and kept stable across future
  // enable/disable toggles so a link a student already handed out keeps
  // working the next time they re-enable it.
  const token = existing?.public_portfolio_token ?? randomBytes(32).toString("hex");

  const { data, error } = await supabase
    .from("profiles")
    .update({ public_portfolio_enabled: enabled, public_portfolio_token: token })
    .eq("user_id", user.id)
    .select("public_portfolio_enabled, public_portfolio_token")
    .single();

  if (error || !data) return NextResponse.json({ error: "Failed to update portfolio settings." }, { status: 500 });

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return NextResponse.json({
    enabled: data.public_portfolio_enabled,
    url: `${baseUrl}/portfolio/${data.public_portfolio_token}`,
  });
}
