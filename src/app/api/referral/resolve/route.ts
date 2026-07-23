import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { isTrustedOrigin } from "@/lib/origin-check";

// Resolves a referral code to the referring student's user_id. Needs the
// service-role client since RLS ("own profile" only) would otherwise block a
// new student from reading any row but their own -- this route only ever
// returns the bare user_id, never the referrer's actual profile data.
export async function POST(req: Request) {
  if (!isTrustedOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!code) return NextResponse.json({ userId: null });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("referral_code", code)
    .maybeSingle();

  if (error) console.error("referral resolve query failed:", error);
  return NextResponse.json({ userId: data?.user_id ?? null });
}
