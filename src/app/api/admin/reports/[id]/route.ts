import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/access";

// Gated on a real authenticated session with profiles.is_admin. Deliberately
// 404s on a non-admin (rather than 401/403) so the route's existence isn't
// signaled to anyone probing it, matching the page's original intent.

const VALID_STATUSES = ["pending", "reviewed", "actioned", "dismissed"] as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await isAdmin(supabase, user.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const status = body?.status;

  if (typeof status !== "string" || !VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const service = createServiceClient();
  const { error } = await service
    .from("reports")
    .update({ status, reviewed_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
