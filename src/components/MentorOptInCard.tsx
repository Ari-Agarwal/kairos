"use client";

import { useState } from "react";
import Link from "next/link";

// Deliberately its own component with its own submit path (not folded into
// ProfileClient's generic form save) -- eligibility (must have a logged
// "accept" outcome) is enforced server-side in /api/mentor/opt-in, and
// routing this through the generic profile-save path would silently bypass
// that check.
export default function MentorOptInCard({
  initialOptIn,
  initialBio,
}: {
  initialOptIn: boolean;
  initialBio: string | null;
}) {
  const [optIn, setOptIn] = useState(initialOptIn);
  const [bio, setBio] = useState(initialBio ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save(nextOptIn: boolean) {
    setSaving(true);
    setError(null);
    setSaved(false);
    const res = await fetch("/api/mentor/opt-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ optIn: nextOptIn, bio: nextOptIn ? bio : undefined }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Couldn't update mentor status.");
      return;
    }
    setOptIn(nextOptIn);
    setSaved(true);
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-5 mb-6">
      <p className="text-text font-medium text-sm mb-2">Mentor other students</p>
      <p className="text-text-gray text-xs mb-3 leading-relaxed">
        If you&apos;ve logged an acceptance to a school, you can opt in to mentor other students applying
        there. Messaging only starts once you accept a specific request — nothing is open by default.
      </p>
      {!optIn ? (
        <div>
          <label htmlFor="mentor-bio" className="block text-sm text-text-gray mb-1">Short bio for mentees</label>
          <textarea
            id="mentor-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            placeholder="A sentence or two about your background and what you can help with."
            className="w-full rounded-xl bg-bg border border-border px-4 py-2.5 text-text outline-none focus:border-primary text-sm mb-2"
          />
          <button
            onClick={() => save(true)}
            disabled={saving || !bio.trim()}
            className="rounded-xl bg-primary hover:bg-primary-hover transition-colors text-bg text-sm font-medium px-4 py-2 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Become a mentor"}
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <p className="text-text-gray text-sm">You&apos;re listed as a mentor.</p>
          <button
            onClick={() => save(false)}
            disabled={saving}
            className="text-text-gray hover:text-text text-sm underline underline-offset-2"
          >
            Stop mentoring
          </button>
        </div>
      )}
      {error && <p className="text-red text-xs mt-2">{error}</p>}
      {saved && !error && <p className="text-text-gray text-xs mt-2">Saved.</p>}
      <Link href="/mentors" className="inline-block mt-3 text-primary hover:text-primary-hover text-sm underline underline-offset-2">
        Find a mentor →
      </Link>
    </div>
  );
}
