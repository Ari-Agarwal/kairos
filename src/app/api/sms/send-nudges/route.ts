import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendSms, deadlineReminderBody, weeklyEssayPromptBody, scholarshipAlertBody } from "@/lib/sms";
import { getAllScholarships, isLikelyMatch } from "@/lib/scholarships";

// Bound how much history a profile accumulates -- this is a "don't repeat
// yourself" list, not an audit log, so it's fine to forget the oldest entries
// once a student has racked up enough matches to hit this.
const MAX_NOTIFIED_SCHOLARSHIPS = 200;

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
    .select(
      "user_id, phone_number, sms_notification_prefs, first_gen, financial_aid_need, intended_major, extracurriculars, notified_scholarship_names"
    )
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
    const prefs = row.sms_notification_prefs as
      | { deadline_reminders?: boolean; weekly_essay_prompt?: boolean; scholarship_alerts?: boolean }
      | null;

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

    // Weekly, same cadence as the essay prompt -- proactively surfaces
    // scholarships the student hasn't been told about yet, rather than
    // requiring them to remember to check the Scholarships tab themselves.
    if (isMonday && prefs?.scholarship_alerts !== false) {
      const alreadyNotified = new Set((row.notified_scholarship_names as string[] | null) ?? []);
      const scholarshipProfile = {
        first_gen: row.first_gen as boolean | null,
        financial_aid_need: row.financial_aid_need as boolean | null,
        intended_major: row.intended_major as string | null,
        extracurriculars: row.extracurriculars as string[] | null,
      };
      const newMatch = getAllScholarships()
        .filter((s) => isLikelyMatch(s, scholarshipProfile))
        .find((s) => !alreadyNotified.has(s.name));

      if (newMatch) {
        const result = await sendSms(row.phone_number as string, scholarshipAlertBody(newMatch.name));
        if (result.sent) {
          sent++;
          const updated = [...alreadyNotified, newMatch.name].slice(-MAX_NOTIFIED_SCHOLARSHIPS);
          const { error: updateError } = await supabase
            .from("profiles")
            .update({ notified_scholarship_names: updated })
            .eq("user_id", row.user_id);
          if (updateError) console.error("send-nudges notified_scholarship_names update failed:", updateError);
        }
      }
    }
  }

  return NextResponse.json({ sent });
}
