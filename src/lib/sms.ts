import twilio from "twilio";

let client: ReturnType<typeof twilio> | null = null;

function getTwilioClient(): ReturnType<typeof twilio> | null {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  if (!client) client = twilio(sid, token);
  return client;
}

export const SMS_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER || "";

export interface SmsResult {
  sent: boolean;
  reason?: string;
}

// No-ops (rather than throws) when Twilio credentials aren't configured --
// same graceful-degradation pattern as other external services here. Once
// TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER are set in
// .env.local, real sends start working with no code change.
export async function sendSms(to: string, body: string): Promise<SmsResult> {
  const c = getTwilioClient();
  if (!c || !SMS_FROM_NUMBER) {
    console.warn("sendSms: Twilio not configured, skipping send.", { to: to.slice(0, 4) + "***" });
    return { sent: false, reason: "Twilio not configured" };
  }
  try {
    await c.messages.create({ to, from: SMS_FROM_NUMBER, body });
    return { sent: true };
  } catch (err) {
    console.error("sendSms failed:", err);
    return { sent: false, reason: err instanceof Error ? err.message : "unknown error" };
  }
}

export function deadlineReminderBody(schoolName: string, itemTitle: string, dueDate: string): string {
  return `Kairos: "${itemTitle}" for ${schoolName} is due ${dueDate}. Reply STOP to opt out.`;
}

export function weeklyEssayPromptBody(): string {
  return `Kairos: this week's essay prompt is ready in your workspace. Reply STOP to opt out.`;
}

export function oddsUpdateBody(schoolName: string, category: string): string {
  return `Kairos: your odds for ${schoolName} are now categorized as ${category}. Reply STOP to opt out.`;
}
