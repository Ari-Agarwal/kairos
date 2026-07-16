import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendSms, deadlineReminderBody, weeklyEssayPromptBody } from "@/lib/sms";

// Triggered by Vercel Cron (see vercel.json) once daily. Not user-facing, so
// it authenticates via CRON_SECRET rather than a logged-in session -- same
// bearer-token pattern Vercel's own cron docs recommend.
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: optedIn, error: optedInError } = await supabase
    .from("profiles")
    .select("user_id, phone_number, sms_notification_prefs")
    .eq("sms_opt_in", true)
    .not("phone_number", "is", null);

  if (optedInError) {
    console.error("send-nudges opted-in profiles query failed:", optedInError);
    return NextResponse.json({ error: "Failed to fetch opted-in profiles" }, { status: 500 });
  }

  if (!optedIn || optedIn.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);
  const isMonday = new Date().getUTCDay() === 1;

  let sent = 0;
  for (const row of optedIn) {
    const prefs = row.sms_notification_prefs as { deadline_reminders?: boolean; weekly_essay_prompt?: boolean } | null;

    if (prefs?.deadline_reminders !== false) {
      const { data: dueTomorrow, error: dueTomorrowError } = await supabase
        .from("timeline_items")
        .select("title, school_tags, due_date")
        .eq("user_id", row.user_id)
        .eq("due_date", tomorrowStr)
        .limit(1);

      if (dueTomorrowError) console.error("send-nudges due-tomorrow query failed:", dueTomorrowError);

      if (dueTomorrow && dueTomorrow.length > 0) {
        const item = dueTomorrow[0];
        const schoolName = (item.school_tags as string[] | null)?.[0] ?? "your school";
        const result = await sendSms(row.phone_number as string, deadlineReminderBody(schoolName, item.title, "tomorrow"));
        if (result.sent) sent++;
      }
    }

    if (isMonday && prefs?.weekly_essay_prompt !== false) {
      const result = await sendSms(row.phone_number as string, weeklyEssayPromptBody());
      if (result.sent) sent++;
    }
  }

  return NextResponse.json({ sent });
}
