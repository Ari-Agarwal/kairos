export const metadata = { title: "Privacy Policy — Telos" };

export default function PrivacyPage() {
  return (
    <div className="px-5 md:px-8 py-12 max-w-2xl mx-auto w-full">
      <h1 className="font-serif text-3xl text-text mb-2">Privacy Policy</h1>
      <p className="text-text-gray text-sm mb-8">Last updated June 28, 2026</p>

      <div className="space-y-6 text-text-gray text-sm leading-relaxed">
        <section>
          <h2 className="text-text font-medium mb-2">1. What we collect</h2>
          <p>
            Account info (email, name) via Supabase Auth; profile info you provide (grade level,
            GPA, intended major, extracurriculars, location preference, college goals, test
            scores); content you submit for AI features (essay drafts); and usage data needed to
            run the product (login timestamps, regeneration counts).
          </p>
        </section>
        <section>
          <h2 className="text-text font-medium mb-2">2. How we use it</h2>
          <p>
            To generate your school matches, timeline, career path information, and essay
            feedback; to enforce free-tier limits; to process Premium payments via Stripe; and to
            operate and improve the product. Profile and essay content is sent to Anthropic&apos;s
            API to generate AI features, governed by Anthropic&apos;s own data-handling terms for API
            usage.
          </p>
        </section>
        <section>
          <h2 className="text-text font-medium mb-2">3. Who can see your data</h2>
          <p>
            Only you. This MVP does not currently connect students to a school or counselor
            account — no one else at your school has access to your Telos data.
          </p>
        </section>
        <section>
          <h2 className="text-text font-medium mb-2">4. Children&apos;s privacy (COPPA)</h2>
          <p>
            Telos requires users to self-attest they are 14 or older at signup and is not directed
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
