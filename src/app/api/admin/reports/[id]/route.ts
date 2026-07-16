import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// Same key-protected pattern as /admin/waitlist -- no admin-role concept in
// this app, so the moderation queue gates on a shared secret instead of
// Supabase auth. Deliberately 404s on a wrong/missing key rather than
// 401/403 so the route's existence isn't signaled to anyone probing it.

const VALID_STATUSES = ["pending", "reviewed", "actioned", "dismissed"] as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const key = body?.key;
  const status = body?.status;

  if (!key || key !== process.env.MODERATION_ADMIN_KEY) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
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
