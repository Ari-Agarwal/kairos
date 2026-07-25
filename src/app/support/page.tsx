export const metadata = { title: "Support · Kairos" };

export default function SupportPage() {
  return (
    <div className="px-5 md:px-8 py-12 max-w-2xl mx-auto w-full">
      <h1 className="font-serif text-3xl text-text mb-2">Support</h1>
      <p className="text-text-gray text-sm mb-8">
        Questions, bugs, or account issues, here&apos;s how to reach us.
      </p>

      <div className="space-y-6 text-text-gray text-sm leading-relaxed">
        <section>
          <h2 className="text-text font-medium mb-2">Contact us</h2>
          <p>
            Email{" "}
            <a href="mailto:support@kairosadmissions.com" className="text-text underline underline-offset-2">
              support@kairosadmissions.com
            </a>{" "}
            and we&apos;ll get back to you. Include your account email and, if you&apos;re
            reporting a bug, what you were doing when it happened.
          </p>
        </section>

        <section>
          <h2 className="text-text font-medium mb-2">Common questions</h2>
          <ul className="space-y-3">
            <li>
              <span className="text-text">How do I delete my account?</span> Go to Profile →
              Delete Account in the app or on the website. This permanently removes your account
              and all associated data.
            </li>
            <li>
              <span className="text-text">Is Kairos free?</span> Yes, the core product, school
              matches, application timeline, and essay feedback, is free to use.
            </li>
            <li>
              <span className="text-text">I signed up on the web, can I use the same account
              in the app?</span> Yes, sign in with the same email/password or Google account and
              your matches, timeline, and essays will already be there.
            </li>
            <li>
              <span className="text-text">Something looks wrong or broken.</span> Email us at the
              address above with a screenshot if you can, it helps us fix it faster.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-text font-medium mb-2">More</h2>
          <p>
            See our{" "}
            <a href="/privacy" className="text-text underline underline-offset-2">Privacy Policy</a>
            {" "}and{" "}
            <a href="/terms" className="text-text underline underline-offset-2">Terms</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
