// SCREEN 0 COMPLETE
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const FIELD_LABELS: Record<string, string> = {
  intended_major: "Intended Major",
  extracurriculars: "Extracurriculars",
  schools_already_considering: "Schools You're Already Considering",
  test_scores: "Test Scores",
  career_goals: "Career Goals",
  class_rank: "Class Rank",
  campus_size_pref: "Campus Size Preference",
  campus_setting_pref: "Campus Setting Preference",
};

interface Profile {
  intended_major: string | null;
  extracurriculars: string[] | null;
  schools_already_considering: string | null;
  test_scores: unknown;
  sat_score?: number | null;
  act_score?: number | null;
  career_goals?: string | null;
  class_rank?: string | null;
  campus_size_pref?: string | null;
  campus_setting_pref?: string | null;
}

export function getMissingFields(profile: Profile | null | undefined): string[] {
  if (!profile) return [];
  const missing: string[] = [];
  if (!profile.intended_major) missing.push("intended_major");
  if (!profile.extracurriculars || profile.extracurriculars.length === 0) missing.push("extracurriculars");
  if (!profile.schools_already_considering) missing.push("schools_already_considering");
  if (!profile.test_scores && !profile.sat_score && !profile.act_score) missing.push("test_scores");
  if (!profile.career_goals) missing.push("career_goals");
  if (!profile.class_rank) missing.push("class_rank");
  if (!profile.campus_size_pref) missing.push("campus_size_pref");
  if (!profile.campus_setting_pref) missing.push("campus_setting_pref");
  return missing;
}

const DISMISS_KEY = "telos_completeness_dismissed";

export default function ProfileCompletenessModal({ profile }: { profile: Profile | null | undefined }) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Mount-only read of a browser API (sessionStorage) — can't run during SSR/render,
    // so this can't be moved out of an effect without a hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    setDismissed(sessionStorage.getItem(DISMISS_KEY) === "true");
  }, []);

  const missing = getMissingFields(profile);

  if (!mounted || missing.length === 0 || dismissed) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-bg/50">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-completeness-title"
        className="w-full max-w-lg bg-card border-t border-border rounded-t-2xl px-6 py-6 animate-in slide-in-from-bottom"
      >
        <h2 id="profile-completeness-title" className="font-serif text-xl text-text mb-2">Your matches could be more accurate.</h2>
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
