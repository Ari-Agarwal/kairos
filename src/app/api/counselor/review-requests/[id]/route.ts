import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isTrustedOrigin } from "@/lib/origin-check";
import { getCounselorRecord } from "@/lib/access";

const VALID_STATUSES = ["pending", "in_progress", "completed"] as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isTrustedOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const counselor = await getCounselorRecord(supabase, user.id);
  if (!counselor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const status = body?.status;
  if (typeof status !== "string" || !VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  // RLS scopes this update to review_requests belonging to a student
  // assigned to this counselor's school (migration_028) -- no separate
  // ownership check needed here, but .select() confirms a row was matched
  // rather than silently no-op'ing on an out-of-scope id.
  const { data, error } = await supabase
    .from("review_requests")
    .update({ status })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("counselor review-request status update failed:", error);
    return NextResponse.json({ error: "Failed to update status." }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Request not found." }, { status: 404 });

  return NextResponse.json({ ok: true });
}
