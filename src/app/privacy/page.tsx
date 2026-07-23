export const metadata = { title: "Privacy Policy — Kairos" };

export default function PrivacyPage() {
  return (
    <div className="px-5 md:px-8 py-12 max-w-2xl mx-auto w-full">
      <h1 className="font-serif text-3xl text-text mb-2">Privacy Policy</h1>
      <p className="text-text-gray text-sm mb-8">Last updated July 15, 2026</p>

      <div className="space-y-6 text-text-gray text-sm leading-relaxed">
        <section>
          <h2 className="text-text font-medium mb-2">1. What we collect and why</h2>
          <p className="mb-3">
            Here is exactly what we collect and the specific reason for each. We only collect what
            we need for these purposes, and we don&apos;t reuse your data for anything else without
            telling you first.
          </p>
          <ul className="space-y-2">
            <li>
              <span className="text-text">Email and login identity</span> (email/password or
              Google sign-in) — to create and secure your account and log you in.
            </li>
            <li>
              <span className="text-text">Age confirmation (14+)</span> — to confirm you&apos;re
              old enough to use Kairos (see Children&apos;s privacy below).
            </li>
            <li>
              <span className="text-text">Profile details</span> (grade level, intended major, and
              the schools you&apos;re already considering; optionally test scores and
              extracurriculars) — to generate your school-match list and application timeline and to
              personalize your guidance. Optional fields only improve accuracy; you can skip them.
            </li>
            <li>
              <span className="text-text">Essay drafts you submit</span> — to generate AI feedback
              on that specific draft. Sent only when you use Essay Feedback.
            </li>
            <li>
              <span className="text-text">Your saved matches and timeline</span> — to store your
              plan so it&apos;s there when you come back.
            </li>
            <li>
              <span className="text-text">Error and diagnostic data</span> — to detect and fix
              crashes and keep the product working.
            </li>
            <li>
              <span className="text-text">Financial need, career goals, class rank, course
              rigor, and first-gen/legacy context</span> (all optional) — to factor real
              affordability and background context into your matches and timeline, instead of
              guidance that ignores them.
            </li>
            <li>
              <span className="text-text">Admissions decisions you log</span> (accept/reject/
              waitlist, aid offer amount, notes) — to track your own outcomes over time. We do
              not currently use this data to inform other students&apos; matches; if that changes,
              it will only ever be in aggregated, de-identified form, and we&apos;ll update this
              notice before it happens.
            </li>
            <li>
              <span className="text-text">Human-review requests you submit</span> — to route your
              request to a counselor for review.
            </li>
            <li>
              <span className="text-text">Content of a shared read-only link you create</span>{" "}
              (e.g. for a parent or counselor) — to generate that link and show them the match/
              timeline snapshot you chose to share. You control creation and revocation of these
              links; see Section 3.
            </li>
            <li>
              <span className="text-text">Activity descriptions, recommender details and brag
              sheets, and career-path questions</span> — to generate AI feedback, talking points,
              or guidance specific to that feature. Sent only when you use the corresponding tool
              (Activities, Rec Letters, Career Path).
            </li>
            <li>
              <span className="text-text">Mock interview question and answer text</span> — to
              score your practice answer and give feedback. Your spoken answer is transcribed
              entirely in your browser; we never receive or store audio, only the resulting text.
            </li>
            <li>
              <span className="text-text">Phone number and SMS opt-in preference</span> — to send
              you deadline reminders and essay prompts by text, only if you opt in. Message and
              data rates may apply; reply STOP at any time to opt out. See Section 2 for the SMS
              provider.
            </li>
            <li>
              <span className="text-text">Mentor opt-in, mentor request, and message content</span>{" "}
              — to connect you with a peer mentor or mentee once both sides accept a request. First
              contact is always a request, not open messaging; see Section 3 for who can see this.
            </li>
            <li>
              <span className="text-text">Reports and blocks you submit against another user</span>{" "}
              — to enforce our safety policy. A block is never visible to the person you blocked.
            </li>
          </ul>
        </section>
        <section>
          <h2 className="text-text font-medium mb-2">2. AI processing and our service providers</h2>
          <p className="mb-3">
            <span className="text-text">We do not sell your data, and we do not use it for targeted
            advertising.</span> To run Kairos we share the minimum necessary data with a few service
            providers (&quot;subprocessors&quot;):
          </p>
          <ul className="space-y-2">
            <li>
              <span className="text-text">Anthropic</span> — receives your essay text and profile
              details to generate matches, timelines, career-path information, and essay feedback.
              Under Anthropic&apos;s API terms, your inputs are not used to train their models.
            </li>
            <li>
              <span className="text-text">Supabase</span> — stores your account and profile data,
              with row-level security limiting every record to you.
            </li>
            <li>
              <span className="text-text">Stripe</span> — if you upgrade to Premium, processes the
              payment; we never see or store your card number.
            </li>
            <li>
              <span className="text-text">Resend</span> — sends your welcome email.
            </li>
            <li>
              <span className="text-text">Vercel</span> — hosts the application.
            </li>
            <li>
              <span className="text-text">Sentry</span> — receives error/diagnostic data so we can
              fix bugs.
            </li>
            <li>
              <span className="text-text">Twilio</span> — if you opt in to SMS, sends your text
              messages. Receives your phone number and message content only for that purpose.
            </li>
          </ul>
        </section>
        <section>
          <h2 className="text-text font-medium mb-2">3. Who can see your data</h2>
          <p className="mb-3">
            By default, only you. A few features give other specific people limited, opt-in
            access, and only because you took an action to grant it:
          </p>
          <ul className="space-y-2">
            <li>
              <span className="text-text">A school counselor</span> can see your matches and
              timeline only if your account is affiliated with a school running the Kairos
              counselor dashboard, and only that counselor — not the whole school.
            </li>
            <li>
              <span className="text-text">A human-review request</span> is visible to the
              counselor it&apos;s routed to, and only for the purpose of that review.
            </li>
            <li>
              <span className="text-text">A shared read-only link</span> you create (e.g. for a
              parent) is visible to anyone holding that specific link, until it expires or you
              revoke it. Links are long, random, and not guessable or listed anywhere public.
            </li>
            <li>
              <span className="text-text">A mentor or mentee</span> can see your mentor profile
              only after you both accept a connection request — never before.
            </li>
          </ul>
        </section>
        <section>
          <h2 className="text-text font-medium mb-2">4. Children&apos;s privacy (COPPA)</h2>
          <p>
            Kairos requires users to self-attest they are 14 or older at signup and is not directed
            at children under 13. We do not knowingly collect personal information from
            children under 13. If we learn an account belongs to a user under 13, we will delete
            it.
          </p>
        </section>
        <section>
          <h2 className="text-text font-medium mb-2">5. Data storage and security</h2>
          <p>
            Data is stored in Supabase (Postgres) with row-level security restricting every table
            to the owning user. Payments are processed by Stripe; we never see or store your
            card number.
          </p>
        </section>
        <section>
          <h2 className="text-text font-medium mb-2">6. Your rights</h2>
          <p>
            You can view and edit your profile data at any time from the Profile screen. You can
            permanently delete your account and all associated data from the same screen —
            this removes your profile, school matches, timeline, and regeneration history.
          </p>
        </section>
        <section>
          <h2 className="text-text font-medium mb-2">7. Data retention</h2>
          <p>
            We retain your data for as long as your account is active. Deleting your account
            removes your data immediately; it is not held in a separate backup beyond standard
            database backup retention.
          </p>
        </section>
        <section>
          <h2 className="text-text font-medium mb-2">8. Changes</h2>
          <p>We may update this policy as the product changes and will reflect the current date above.</p>
        </section>
        <section>
          <h2 className="text-text font-medium mb-2">9. Contact</h2>
          <p>Questions about this policy can be sent to the contact address listed on our homepage.</p>
        </section>
      </div>
    </div>
  );
}
