"use client";

import { useState } from "react";

// Student referral loop (Software_Timeline.md 6b) -- distinct from the
// waitlist referral system, this is for already-onboarded students. No
// reward mechanic yet (unlike the waitlist's queue-jump incentive); this is
// the lightweight growth-loop surface the doc asked for, not a points system.
export default function InviteFriendCard({
  referralCode,
  referredCount,
}: {
  referralCode: string | null;
  referredCount: number;
}) {
  const [copied, setCopied] = useState(false);

  if (!referralCode) return null;

  const link = `${typeof window !== "undefined" ? window.location.origin : ""}/onboarding?ref=${referralCode}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can fail silently in some browser contexts -- not worth an error banner.
    }
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <p className="text-text font-medium text-sm mb-1">Know someone else applying to college?</p>
      <p className="text-text-gray text-xs mb-3">
        Share your link — {referredCount > 0 ? `${referredCount} friend${referredCount === 1 ? "" : "s"} already joined.` : "no pressure, just if it's useful."}
      </p>
      <button
        onClick={copyLink}
        className="rounded-xl border border-border text-text-gray hover:text-text text-sm font-medium px-4 py-2 transition-colors"
      >
        {copied ? "Copied!" : "Copy invite link"}
      </button>
    </div>
  );
}
