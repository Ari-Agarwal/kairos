import { Resend } from "resend";

let resendInstance: Resend | null = null;

export function getResend(): Resend {
  if (!resendInstance) {
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }
  return resendInstance;
}

export const EMAIL_FROM = process.env.EMAIL_FROM || "Kairos <onboarding@resend.dev>";

export async function sendRecommenderReminder(
  to: string,
  studentName: string,
  relationship: string,
  shareUrl: string
) {
  await getResend().emails.send({
    from: EMAIL_FROM,
    to,
    subject: `${studentName} is counting on your recommendation`,
    html: `
      <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto;">
        <h1 style="font-size: 22px;">A reminder from ${studentName}</h1>
        <p style="font-family: Helvetica, Arial, sans-serif; color: #444; line-height: 1.6;">
          ${studentName} (your ${relationship}) wanted to send a friendly reminder about their recommendation letter request.
          They've prepared a brag sheet with key highlights to help make writing easier.
        </p>
        <p style="font-family: Helvetica, Arial, sans-serif; color: #444; line-height: 1.6;">
          <a href="${shareUrl}" style="color: #FFB020;">View their brag sheet and talking points</a>
        </p>
        <p style="font-family: Helvetica, Arial, sans-serif; color: #888; font-size: 13px; margin-top: 24px;">
          This link was shared by ${studentName} via Kairos. No account needed to view it.
        </p>
      </div>
    `,
  });
}

export async function sendCounselorReminder(
  to: string,
  studentName: string,
  counselorName: string,
  message: string
) {
  await getResend().emails.send({
    from: EMAIL_FROM,
    to,
    subject: `A reminder from ${counselorName}`,
    html: `
      <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto;">
        <h1 style="font-size: 22px;">A reminder from ${counselorName}</h1>
        <p style="font-family: Helvetica, Arial, sans-serif; color: #444; line-height: 1.6; white-space: pre-wrap;">${message}</p>
        <p style="font-family: Helvetica, Arial, sans-serif; color: #888; font-size: 13px; margin-top: 24px;">
          Hi ${studentName}, this reminder was sent by your counselor, ${counselorName}, via Kairos.
        </p>
      </div>
    `,
  });
}

export async function sendWelcomeEmail(to: string, fullName: string) {
  await getResend().emails.send({
    from: EMAIL_FROM,
    to,
    subject: "Welcome to Kairos",
    html: `
      <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto;">
        <h1 style="font-size: 22px;">Welcome to Kairos, ${fullName || "there"}.</h1>
        <p style="font-family: Helvetica, Arial, sans-serif; color: #444; line-height: 1.6;">
          Your profile is set up and your personalized school list and timeline are ready.
          Log in to see your matches and next steps.
        </p>
        <p style="font-family: Helvetica, Arial, sans-serif; color: #888; font-size: 13px; margin-top: 24px;">
          You're receiving this because you just created a Kairos account.
        </p>
      </div>
    `,
  });
}
