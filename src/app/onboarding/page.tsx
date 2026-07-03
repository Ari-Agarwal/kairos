// SCREEN 2 COMPLETE
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import GenerationProgress from "@/components/GenerationProgress";

const EASE = [0.16, 1, 0.3, 1] as const;

const GRADE_LEVELS = ["Freshman", "Sophomore", "Junior", "Senior"];
const CAMPUS_SIZES = ["Small", "Medium", "Large", "No preference"];
const CAMPUS_SETTINGS = ["Urban", "Suburban", "Rural", "No preference"];

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [gpa, setGpa] = useState("");
  const [intendedMajor, setIntendedMajor] = useState("");
  const [currentSchool, setCurrentSchool] = useState("");
  const [activities, setActivities] = useState<string[]>([""]);
  const [schoolsAlreadyConsidering, setSchoolsAlreadyConsidering] = useState("");
  const [testScores, setTestScores] = useState("");
  const [campusSizePref, setCampusSizePref] = useState("");
  const [campusSettingPref, setCampusSettingPref] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState(0);

  function showError(message: string) {
    setError(message);
    setErrorKey((k) => k + 1);
  }

  function updateActivity(idx: number, value: string) {
    setActivities((prev) => prev.map((a, i) => (i === idx ? value : a)));
  }

  function addActivity() {
    setActivities((prev) => [...prev, ""]);
  }

  function removeActivity(idx: number) {
    setActivities((prev) => prev.filter((_, i) => i !== idx));
  }

  const progressChecks = [
    !!fullName,
    !!gradeLevel,
    !!gpa,
    !!intendedMajor,
    !!currentSchool,
    activities.some((a) => a.trim()),
    !!schoolsAlreadyConsidering,
    !!testScores,
    !!campusSizePref,
    !!campusSettingPref,
  ];
  const progressPercent = Math.round(
    (progressChecks.filter(Boolean).length / progressChecks.length) * 100
  );

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.push("/login");
        return;
      }
      const existing = user.user_metadata?.full_name as string | undefined;
      if (existing) setFullName(existing);

      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (profile) router.push("/dashboard");
    });
  }, [supabase, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!campusSizePref || !campusSettingPref) {
      showError("Please select a campus size and setting preference (pick \"No preference\" if you're not sure).");
      return;
    }

    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    await supabase.auth.updateUser({ data: { full_name: fullName } });

    const ecArray = activities.map((a) => a.trim()).filter(Boolean);

    const { error } = await supabase.from("profiles").insert({
      user_id: user.id,
      grade_level: gradeLevel,
      gpa: parseFloat(gpa),
      intended_major: intendedMajor,
      current_school: currentSchool,
      extracurriculars: ecArray.length > 0 ? ecArray : null,
      schools_already_considering: schoolsAlreadyConsidering,
      test_scores: testScores ? { summary: testScores } : null,
      campus_size_pref: campusSizePref,
      campus_setting_pref: campusSettingPref,
    });

    if (error) {
      showError(error.message);
      setLoading(false);
      return;
    }

    fetch("/api/email/welcome", { method: "POST" }).catch(() => {});

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
        <GenerationProgress />
      </div>
    );
  }

  const inputClass =
    "w-full rounded-xl bg-bg border border-border px-4 py-2.5 text-text outline-none focus:border-primary transition-colors";

  const sections: { title: string; fields: React.ReactNode }[] = [
    {
      title: "Basics",
      fields: (
        <>
          <div>
            <label className="block text-sm text-text-gray mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-gray mb-1">Grade Level *</label>
              <select
                required
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
                className={inputClass}
              >
                <option value="" disabled>
                  Select
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
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-text-gray mb-1">Current School *</label>
            <input
              type="text"
              required
              placeholder="e.g. Lincoln High School"
              value={currentSchool}
              onChange={(e) => setCurrentSchool(e.target.value)}
              className={inputClass}
            />
          </div>
        </>
      ),
    },
    {
      title: "Background",
      fields: (
        <>
          <div>
            <label className="block text-sm text-text-gray mb-1">Intended Major / Interests *</label>
            <input
              type="text"
              required
              value={intendedMajor}
              onChange={(e) => setIntendedMajor(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm text-text-gray mb-1">Extracurriculars</label>
            <p className="text-text-gray text-xs mb-2">
              Be as specific as possible — e.g. &quot;Varsity basketball, team captain, 3 years&quot; instead of just &quot;Basketball.&quot;
            </p>
            <div className="space-y-2">
              {activities.map((activity, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Varsity basketball, team captain, 3 years"
                    value={activity}
                    onChange={(e) => updateActivity(idx, e.target.value)}
                    className={`${inputClass} flex-1`}
                  />
                  {activities.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeActivity(idx)}
                      className="text-text-gray hover:text-text px-2"
                      aria-label="Remove activity"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addActivity}
                className="text-sm text-text-gray hover:text-text underline underline-offset-2"
              >
                + Add another activity
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm text-text-gray mb-1">Test Scores (SAT/ACT, optional)</label>
            <input
              type="text"
              placeholder="e.g. SAT 1380"
              value={testScores}
              onChange={(e) => setTestScores(e.target.value)}
              className={inputClass}
            />
          </div>
        </>
      ),
    },
    {
      title: "Goals",
      fields: (
        <div>
          <label className="block text-sm text-text-gray mb-1">
            Schools you&apos;re already considering *
          </label>
          <textarea
            required
            placeholder="List any schools already on your mind, or write &quot;None&quot;"
            value={schoolsAlreadyConsidering}
            onChange={(e) => setSchoolsAlreadyConsidering(e.target.value)}
            rows={3}
            className={`${inputClass} resize-none`}
          />
        </div>
      ),
    },
    {
      title: "Preferences",
      fields: (
        <>
          <div>
            <label className="block text-sm text-text-gray mb-2">Campus size *</label>
            <div className="flex flex-wrap gap-2">
              {CAMPUS_SIZES.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setCampusSizePref(campusSizePref === size ? "" : size)}
                  className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                    campusSizePref === size
                      ? "bg-primary text-bg border-primary"
                      : "border-border text-text-gray hover:text-text"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm text-text-gray mb-2">Campus setting *</label>
            <div className="flex flex-wrap gap-2">
              {CAMPUS_SETTINGS.map((setting) => (
                <button
                  key={setting}
                  type="button"
                  onClick={() => setCampusSettingPref(campusSettingPref === setting ? "" : setting)}
                  className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                    campusSettingPref === setting
                      ? "bg-primary text-bg border-primary"
                      : "border-border text-text-gray hover:text-text"
                  }`}
                >
                  {setting}
                </button>
              ))}
            </div>
          </div>
        </>
      ),
    },
  ];

  return (
    <div className="flex-1 px-6 py-10 md:py-16 max-w-xl mx-auto w-full">
      <motion.h1
        initial={{ opacity: 1, y: 0 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: EASE }}
        className="font-serif text-3xl text-text mb-6"
      >
        Build your profile
      </motion.h1>

      <motion.div
        initial={{ opacity: 1, y: 0 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: EASE, delay: 0.05 }}
        className="bg-secondary-tint border border-border rounded-2xl px-5 py-4 mb-6"
      >
        <p className="text-secondary text-sm leading-relaxed">
          Answer a few questions and we&apos;ll generate your school match list and a
          personalized application timeline — instantly, on the other side.
        </p>
      </motion.div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs text-text-gray">Profile progress</p>
          <p className="text-xs text-text-gray">{progressPercent}% complete</p>
        </div>
        <div className="h-1.5 rounded-full bg-secondary-tint overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-primary"
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.3, ease: EASE }}
          />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {sections.map((section, i) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: EASE, delay: 0.1 + i * 0.08 }}
            className="bg-card border border-border rounded-2xl p-6 space-y-4"
          >
            <p className="text-xs font-medium text-text-gray uppercase tracking-wide">{section.title}</p>
            {section.fields}
          </motion.div>
        ))}

        {error && (
          <p key={errorKey} role="alert" className="text-red text-sm animate-auth-error">
            {error}
          </p>
        )}

        <p className="text-text-gray text-xs leading-relaxed">
          We use this to build your school matches and timeline. We never sell it.{" "}
          <a href="/privacy" className="text-text underline underline-offset-2">Privacy Policy</a>
        </p>

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
