import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isTrustedOrigin } from "@/lib/origin-check";

export async function POST(req: Request) {
  if (!isTrustedOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createServiceClient();

  await admin.from("reminder_log").delete().eq("student_user_id", user.id);
  await admin.from("counselor_notes").delete().eq("student_user_id", user.id);
  await admin.from("regeneration_log").delete().eq("user_id", user.id);
  await admin.from("timeline_items").delete().eq("user_id", user.id);
  await admin.from("school_matches").delete().eq("user_id", user.id);
  await admin.from("profiles").delete().eq("user_id", user.id);

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return NextResponse.json({ error: "Failed to delete account." }, { status: 500 });

  return NextResponse.json({ ok: true });
}
