import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendWaitlistWeekOneContent, sendPrelaunchReminderEmail } from "@/lib/email";

// Launch target per docs/Launch_Plan.md — the pre-launch reminder goes out
// starting 7 days before this date, matching §3.7's nurture sequence.
const LAUNCH_DATE = new Date("2026-08-14T00:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;

// Triggered by Vercel Cron (see vercel.json) once daily. Not user-facing, so
// it authenticates via CRON_SECRET rather than a logged-in session -- same
// bearer-token pattern as the other cron routes (send-nudges, aggregate-snapshot).
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kairosadmissions.vercel.app";
  const now = Date.now();
  let day7Sent = 0;
  let prelaunchSent = 0;

  // Day-7 content email: signups (email only) at least 7 days old that haven't gotten it.
  const sevenDaysAgo = new Date(now - 7 * DAY_MS).toISOString();
  const { data: day7Due, error: day7Error } = await service
    .from("waitlist_signups")
    .select("id, contact, referral_code, created_at")
    .eq("contact_type", "email")
    .is("nurture_day7_sent_at", null)
    .lte("created_at", sevenDaysAgo);

  if (day7Error) console.error("waitlist-nurture day7 query failed:", day7Error);

  for (const row of day7Due ?? []) {
    const { count } = await service
      .from("waitlist_signups")
      .select("id", { count: "exact", head: true })
      .lte("created_at", row.created_at);
    const position = count ?? 1;
    const referralLink = `${baseUrl}/notify/join?ref=${row.referral_code}`;

    try {
      await sendWaitlistWeekOneContent(row.contact, position, referralLink);
      const { error: updateError } = await service
        .from("waitlist_signups")
        .update({ nurture_day7_sent_at: new Date().toISOString() })
        .eq("id", row.id);
      if (updateError) console.error("waitlist-nurture day7 flag update failed:", updateError);
      day7Sent++;
    } catch (err) {
      console.error("waitlist-nurture day7 email failed:", err);
    }
  }

  // Pre-launch reminder: only once launch is within 7 days, once per signup.
  const daysUntilLaunch = (LAUNCH_DATE.getTime() - now) / DAY_MS;
  if (daysUntilLaunch <= 7 && daysUntilLaunch > 0) {
    const { data: prelaunchDue, error: prelaunchError } = await service
      .from("waitlist_signups")
      .select("id, contact, referral_code")
      .eq("contact_type", "email")
      .is("nurture_prelaunch_sent_at", null);

    if (prelaunchError) console.error("waitlist-nurture prelaunch query failed:", prelaunchError);

    for (const row of prelaunchDue ?? []) {
      const referralLink = `${baseUrl}/notify/join?ref=${row.referral_code}`;
      try {
        await sendPrelaunchReminderEmail(row.contact, referralLink);
        const { error: updateError } = await service
          .from("waitlist_signups")
          .update({ nurture_prelaunch_sent_at: new Date().toISOString() })
          .eq("id", row.id);
        if (updateError) console.error("waitlist-nurture prelaunch flag update failed:", updateError);
        prelaunchSent++;
      } catch (err) {
        console.error("waitlist-nurture prelaunch email failed:", err);
      }
    }
  }

  return NextResponse.json({ day7Sent, prelaunchSent });
}
