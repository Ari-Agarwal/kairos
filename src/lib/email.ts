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

export async function sendWaitlistConfirmation(to: string, position: number, referralLink: string) {
  await getResend().emails.send({
    from: EMAIL_FROM,
    to,
    subject: `You're #${position} on the list`,
    html: `
      <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto;">
        <h1 style="font-size: 22px;">You're #${position} on the Kairos waitlist.</h1>
        <p style="font-family: Helvetica, Arial, sans-serif; color: #444; line-height: 1.6;">
          Kairos is a free AI college counselor: real school matches, a personalized deadline timeline,
          and honest essay feedback, the kind of guidance that used to cost thousands.
        </p>
        <p style="font-family: Helvetica, Arial, sans-serif; color: #444; line-height: 1.6;">
          Every friend who joins using your link moves you up the list:<br />
          <a href="${referralLink}" style="color: #3C5E3B;">${referralLink}</a>
        </p>
        <p style="font-family: Helvetica, Arial, sans-serif; color: #888; font-size: 13px; margin-top: 24px;">
          Talk soon,<br />Ari
        </p>
      </div>
    `,
  });
}

export async function sendReferralMilestoneEmail(to: string, newPosition: number, referralLink: string) {
  await getResend().emails.send({
    from: EMAIL_FROM,
    to,
    subject: `You moved up to #${newPosition}`,
    html: `
      <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto;">
        <h1 style="font-size: 22px;">You moved up to #${newPosition}.</h1>
        <p style="font-family: Helvetica, Arial, sans-serif; color: #444; line-height: 1.6;">
          A friend just joined the Kairos waitlist using your link.
        </p>
        <p style="font-family: Helvetica, Arial, sans-serif; color: #444; line-height: 1.6;">
          Keep sharing to move up further:<br />
          <a href="${referralLink}" style="color: #3C5E3B;">${referralLink}</a>
        </p>
      </div>
    `,
  });
}

export async function sendWaitlistWeekOneContent(to: string, position: number, referralLink: string) {
  await getResend().emails.send({
    from: EMAIL_FROM,
    to,
    subject: "The month-by-month senior year timeline",
    html: `
      <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto;">
        <h1 style="font-size: 22px;">Senior year, month by month.</h1>
        <p style="font-family: Helvetica, Arial, sans-serif; color: #444; line-height: 1.6;">
          No pitch here — just the deadline timeline students ask us for most.
        </p>
        <ul style="font-family: Helvetica, Arial, sans-serif; color: #444; line-height: 1.8; padding-left: 20px;">
          <li><strong>August:</strong> Common App opens Aug 1 — set up your account, start a personal statement draft.</li>
          <li><strong>September:</strong> Finalize your school list. Request teacher recommendation letters — give at least 8-10 weeks' notice.</li>
          <li><strong>October:</strong> Start FAFSA and CSS Profile prep (opens Oct 1). Finalize supplemental essays for early rounds.</li>
          <li><strong>November:</strong> Most ED/EA deadlines fall Nov 1-2 — your busiest submission week.</li>
          <li><strong>December:</strong> EA/ED decisions arrive. If deferred or not applying early, keep RD essays moving.</li>
          <li><strong>January:</strong> Most RD applications due (Jan 4-6 for many schools).</li>
          <li><strong>February:</strong> Remaining RD deadlines, compare financial aid offers as they arrive.</li>
          <li><strong>March-April:</strong> Decisions arrive, compare aid packages, submit your enrollment deposit by May 1.</li>
        </ul>
        <p style="font-family: Helvetica, Arial, sans-serif; color: #444; line-height: 1.6;">
          When Kairos launches, this gets built automatically from your real school list instead of a generic guide.
        </p>
        <p style="font-family: Helvetica, Arial, sans-serif; color: #444; line-height: 1.6;">
          Still #${position}? Share your link and move up:<br />
          <a href="${referralLink}" style="color: #3C5E3B;">${referralLink}</a>
        </p>
      </div>
    `,
  });
}

export async function sendPrelaunchReminderEmail(to: string, referralLink: string) {
  await getResend().emails.send({
    from: EMAIL_FROM,
    to,
    subject: "Kairos launches next week",
    html: `
      <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto;">
        <h1 style="font-size: 22px;">Kairos launches next week.</h1>
        <p style="font-family: Helvetica, Arial, sans-serif; color: #444; line-height: 1.6;">
          We'll email the moment your account is ready — no action needed on your end.
        </p>
        <p style="font-family: Helvetica, Arial, sans-serif; color: #444; line-height: 1.6;">
          If any of your friends have been putting off senior year prep, now's the moment —
          your referral link still moves you up until launch:<br />
          <a href="${referralLink}" style="color: #3C5E3B;">${referralLink}</a>
        </p>
        <p style="font-family: Helvetica, Arial, sans-serif; color: #888; font-size: 13px; margin-top: 24px;">
          See you soon,<br />Ari
        </p>
      </div>
    `,
  });
}

export async function sendReengagementEmail(to: string, fullName: string) {
  await getResend().emails.send({
    from: EMAIL_FROM,
    to,
    subject: "Your college list is waiting for you",
    html: `
      <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto;">
        <h1 style="font-size: 22px;">Hey ${fullName || "there"}, it's been a couple weeks.</h1>
        <p style="font-family: Helvetica, Arial, sans-serif; color: #444; line-height: 1.6;">
          No pressure — just a nudge. Your matches and timeline are still there whenever you're ready to
          pick back up. A few minutes now can save a scramble later.
        </p>
        <p style="font-family: Helvetica, Arial, sans-serif; color: #888; font-size: 13px; margin-top: 24px;">
          You're receiving this because you have a Kairos account. This is an occasional check-in, not a
          recurring newsletter.
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
