import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendReengagementEmail } from "@/lib/email";

// Triggered by Vercel Cron daily -- same CRON_SECRET bearer-auth pattern as
// the other crons (send-nudges, aggregate-snapshot, waitlist-nurture).
// Direct-to-student re-engagement (Software_Timeline.md 6b): a student with
// no school_id (no counselor) has no equivalent of the counselor-side
// at-risk/inactivity detection -- this is that equivalent, for the primary
// direct-to-student audience.
const INACTIVE_DAYS = 14;
const RENOTIFY_DAYS = 14;
const MAX_PER_RUN = 200;

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const inactiveCutoff = new Date();
  inactiveCutoff.setDate(inactiveCutoff.getDate() - INACTIVE_DAYS);
  const renotifyCutoff = new Date();
  renotifyCutoff.setDate(renotifyCutoff.getDate() - RENOTIFY_DAYS);

  const { data: candidates, error } = await supabase
    .from("profiles")
    .select("user_id, email, display_name, last_login_at, last_reengagement_sent_at")
    .is("school_id", null)
    .lt("last_login_at", inactiveCutoff.toISOString())
    .or(`last_reengagement_sent_at.is.null,last_reengagement_sent_at.lt.${renotifyCutoff.toISOString()}`)
    .limit(MAX_PER_RUN);

  if (error) {
    console.error("reengagement candidates query failed:", error);
    return NextResponse.json({ error: "Failed to fetch candidates" }, { status: 500 });
  }

  let sent = 0;
  for (const p of candidates ?? []) {
    try {
      await sendReengagementEmail(p.email, p.display_name ?? "");
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ last_reengagement_sent_at: new Date().toISOString() })
        .eq("user_id", p.user_id);
      if (updateError) console.error("reengagement last_reengagement_sent_at update failed:", updateError);
      sent++;
    } catch (err) {
      console.error("reengagement email send failed:", err);
    }
  }

  return NextResponse.json({ sent, candidates: candidates?.length ?? 0 });
}
