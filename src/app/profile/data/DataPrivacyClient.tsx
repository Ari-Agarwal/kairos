"use client";

import Link from "next/link";

export default function DataPrivacyClient() {
  return (
    <div className="px-5 md:px-8 py-8 max-w-2xl mx-auto w-full">
      <Link href="/profile" className="text-text-gray text-sm hover:text-text mb-4 inline-block">
        ← Back to profile
      </Link>
      <h1 className="font-serif text-2xl text-text mb-2">Your data</h1>
      <p className="text-text-gray text-sm mb-8 leading-relaxed">
        Download everything Kairos has stored about you. To delete your account entirely, use the
        &quot;Delete Account&quot; option on your{" "}
        <Link href="/profile" className="underline underline-offset-2 hover:text-text">
          profile page
        </Link>
        .
      </p>

      <div className="bg-card border border-border rounded-2xl p-5">
        <p className="text-text font-medium mb-1">Download your data</p>
        <p className="text-text-gray text-sm mb-4">
          A JSON file with your profile, matches, timeline, essay feedback history, activity evaluations,
          scholarship tracker, and everything else Kairos has stored for your account.
        </p>
        <a
          href="/api/account/export"
          className="inline-block rounded-xl bg-primary hover:bg-primary-hover transition-colors text-bg font-medium px-5 py-2.5"
        >
          Download my data
        </a>
      </div>
    </div>
  );
}
