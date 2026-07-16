import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isTrustedOrigin } from "@/lib/origin-check";
import { checkRateLimit } from "@/lib/rate-limit";
import { findEligibleMentors } from "@/lib/mentor";

export async function GET(req: Request) {
  if (!isTrustedOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await checkRateLimit(supabase, `mentor-find:${user.id}`, 30, 60_000)).ok) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment and try again." }, { status: 429 });
  }

  const schoolName = new URL(req.url).searchParams.get("school");
  if (!schoolName) return NextResponse.json({ error: "school is required." }, { status: 400 });

  const mentors = await findEligibleMentors(supabase, schoolName, user.id);
  return NextResponse.json({ mentors });
}
