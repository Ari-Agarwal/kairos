"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Roughly one US grading period/quarter -- frequent enough to catch a new
// grade, a retake score, or a new activity without nagging every session.
const NUDGE_INTERVAL_DAYS = 90;

interface Profile {
  last_profile_check_at: string | null;
}

export function isNudgeDue(profile: Profile | null | undefined): boolean {
  if (!profile?.last_profile_check_at) return false;
  const last = new Date(profile.last_profile_check_at).getTime();
  const days = (Date.now() - last) / (1000 * 60 * 60 * 24);
  return days >= NUDGE_INTERVAL_DAYS;
}

const DISMISS_KEY = "kairos_living_profile_dismissed_session";

export default function LivingProfileNudge({ profile }: { profile: Profile | null | undefined }) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    setDismissed(sessionStorage.getItem(DISMISS_KEY) === "true");
  }, []);

  const due = isNudgeDue(profile);

  if (!mounted || !due || dismissed) return null;

  async function handleNothingChanged() {
    setSaving(true);
    await fetch("/api/profile/nudge-dismiss", { method: "POST" }).catch(() => {});
    sessionStorage.setItem(DISMISS_KEY, "true");
    setSaving(false);
    setDismissed(true);
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-bg/50">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="living-profile-nudge-title"
        className="w-full max-w-lg bg-card border-t border-border rounded-t-2xl px-6 py-6 animate-in slide-in-from-bottom"
      >
        <h2 id="living-profile-nudge-title" className="font-serif text-xl text-text mb-2">
          Anything changed lately?
        </h2>
        <p className="text-text-gray text-sm mb-5 leading-relaxed">
          A new grade, a retake score, a new activity, or a shift in your plans -- keeping your
          profile current keeps your matches and timeline accurate.
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => router.push("/profile?edit=true")}
            className="w-full rounded-xl bg-primary hover:bg-primary-hover transition-colors text-bg font-medium py-2.5"
          >
            Update My Profile
          </button>
          <button
            onClick={handleNothingChanged}
            disabled={saving}
            className="w-full rounded-xl border border-border text-text-gray hover:text-text py-2.5 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Nothing's changed"}
          </button>
        </div>
      </div>
    </div>
  );
}
