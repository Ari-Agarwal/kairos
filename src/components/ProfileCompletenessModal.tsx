// SCREEN 0 COMPLETE
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const FIELD_LABELS: Record<string, string> = {
  intended_major: "Intended Major",
  extracurriculars: "Extracurriculars",
  location_preference: "Location Preference",
  college_goals: "College Goals",
  test_scores: "Test Scores",
};

interface Profile {
  intended_major: string | null;
  extracurriculars: string[] | null;
  location_preference: string | null;
  college_goals: string | null;
  test_scores: unknown;
}

export function getMissingFields(profile: Profile | null | undefined): string[] {
  if (!profile) return [];
  const missing: string[] = [];
  if (!profile.intended_major) missing.push("intended_major");
  if (!profile.extracurriculars || profile.extracurriculars.length === 0) missing.push("extracurriculars");
  if (!profile.location_preference) missing.push("location_preference");
  if (!profile.college_goals) missing.push("college_goals");
  if (!profile.test_scores) missing.push("test_scores");
  return missing;
}

const DISMISS_KEY = "metam_completeness_dismissed";

export default function ProfileCompletenessModal({ profile }: { profile: Profile | null | undefined }) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(
    () => typeof window !== "undefined" && sessionStorage.getItem(DISMISS_KEY) === "true"
  );

  const missing = getMissingFields(profile);

  if (missing.length === 0 || dismissed) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
      <div className="w-full max-w-lg bg-card border-t border-border rounded-t-2xl px-6 py-6 animate-in slide-in-from-bottom">
        <h2 className="font-serif text-xl text-text mb-2">Your matches could be more accurate.</h2>
        <p className="text-text-gray text-sm mb-4 leading-relaxed">
          We use your full profile to estimate admission chances and build your timeline. The
          more we know, the more precise your guidance gets.
        </p>
        <p className="text-text-gray text-sm mb-1">Missing:</p>
        <ul className="mb-5 space-y-1">
          {missing.map((field) => (
            <li key={field} className="text-amber-text-on-tint text-sm">
              • {FIELD_LABELS[field]}
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => router.push("/profile?edit=true")}
            className="w-full rounded-xl bg-primary hover:bg-primary-hover transition-colors text-bg font-medium py-2.5"
          >
            Complete My Profile
          </button>
          <button
            onClick={() => {
              sessionStorage.setItem(DISMISS_KEY, "true");
              setDismissed(true);
            }}
            className="w-full rounded-xl border border-border text-text-gray hover:text-text py-2.5"
          >
            Remind me later
          </button>
        </div>
      </div>
    </div>
  );
}
