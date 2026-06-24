// SCREEN 2 COMPLETE
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const GRADE_LEVELS = ["Freshman", "Sophomore", "Junior", "Senior"];

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [gpa, setGpa] = useState("");
  const [intendedMajor, setIntendedMajor] = useState("");
  const [extracurriculars, setExtracurriculars] = useState("");
  const [locationPreference, setLocationPreference] = useState("");
  const [collegeGoals, setCollegeGoals] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      const existing = user?.user_metadata?.full_name as string | undefined;
      if (existing) setFullName(existing);
    });
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    await supabase.auth.updateUser({ data: { full_name: fullName } });

    const ecArray = extracurriculars
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const { error } = await supabase.from("profiles").insert({
      user_id: user.id,
      grade_level: gradeLevel,
      gpa: parseFloat(gpa),
      intended_major: intendedMajor || null,
      extracurriculars: ecArray.length > 0 ? ecArray : null,
      location_preference: locationPreference || null,
      college_goals: collegeGoals || null,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    const matchRes = await fetch("/api/matches/generate", { method: "POST" });
    router.push(matchRes.ok ? "/dashboard" : "/dashboard?matchError=true");
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="animate-pulse">
          <p className="font-serif text-2xl text-text mb-2">Building your personalized list...</p>
          <p className="text-text-gray text-sm">This takes a moment, we&apos;re matching you against real schools.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 px-6 py-10 md:py-16 max-w-xl mx-auto w-full">
      <h1 className="font-serif text-3xl text-text mb-6">Tell us about yourself</h1>

      <div className="bg-secondary-tint border border-border rounded-2xl px-5 py-4 mb-6">
        <p className="text-secondary text-sm leading-relaxed">
          This builds your profile, which we&apos;ll use to generate your personalized school
          list and timeline next.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-6 space-y-5">
        <div>
          <label className="block text-sm text-text-gray mb-1">Full Name *</label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-xl bg-bg border border-border px-4 py-2.5 text-text outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="block text-sm text-text-gray mb-1">Grade Level *</label>
          <select
            required
            value={gradeLevel}
            onChange={(e) => setGradeLevel(e.target.value)}
            className="w-full rounded-xl bg-bg border border-border px-4 py-2.5 text-text outline-none focus:border-primary"
          >
            <option value="" disabled>
              Select grade level
            </option>
            {GRADE_LEVELS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-text-gray mb-1">GPA *</label>
          <input
            type="number"
            step="0.01"
            min="0"
            max="5"
            required
            value={gpa}
            onChange={(e) => setGpa(e.target.value)}
            className="w-full rounded-xl bg-bg border border-border px-4 py-2.5 text-text outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="block text-sm text-text-gray mb-1">Intended Major / Interests</label>
          <input
            type="text"
            value={intendedMajor}
            onChange={(e) => setIntendedMajor(e.target.value)}
            className="w-full rounded-xl bg-bg border border-border px-4 py-2.5 text-text outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="block text-sm text-text-gray mb-1">Extracurriculars (comma separated)</label>
          <input
            type="text"
            value={extracurriculars}
            onChange={(e) => setExtracurriculars(e.target.value)}
            className="w-full rounded-xl bg-bg border border-border px-4 py-2.5 text-text outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="block text-sm text-text-gray mb-1">Location Preference</label>
          <input
            type="text"
            value={locationPreference}
            onChange={(e) => setLocationPreference(e.target.value)}
            className="w-full rounded-xl bg-bg border border-border px-4 py-2.5 text-text outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="block text-sm text-text-gray mb-1">College Goals</label>
          <textarea
            value={collegeGoals}
            onChange={(e) => setCollegeGoals(e.target.value)}
            rows={3}
            className="w-full rounded-xl bg-bg border border-border px-4 py-2.5 text-text outline-none focus:border-primary resize-none"
          />
        </div>

        {error && <p className="text-red text-sm">{error}</p>}

        <button
          type="submit"
          className="w-full rounded-xl bg-primary hover:bg-primary-hover transition-colors text-bg font-medium py-3"
        >
          Continue
        </button>
      </form>
    </div>
  );
}
