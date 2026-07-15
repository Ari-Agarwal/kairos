// SCREEN 2 COMPLETE
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowLeft, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import GenerationProgress from "@/components/GenerationProgress";
import { track, identify } from "@/lib/analytics";
import CareerQuiz from "@/components/CareerQuiz";
import OnboardingChat from "@/components/OnboardingChat";

const EASE = [0.16, 1, 0.3, 1] as const;

const ROUND_TITLES = ["The basics", "Major & interests", "Extracurriculars", "Test scores"];

const GRADE_LEVELS = ["Freshman", "Sophomore", "Junior", "Senior"];
const EC_LENGTHS = ["Less than 1 year", "1 year", "2 years", "3 years", "4+ years"];

const MAJORS = [
  "Undecided", "Biology", "Business", "Chemistry", "Computer Science", "Economics",
  "Education", "Engineering (general)", "English", "Environmental Science", "Finance",
  "History", "International Relations", "Journalism", "Mathematics", "Medicine / Pre-Med",
  "Nursing", "Philosophy", "Physics", "Political Science", "Psychology", "Public Health",
  "Sociology", "Visual/Performing Arts", "Other",
];

const HIGH_SCHOOLS = [
  "Stuyvesant High School", "Thomas Jefferson High School for Science and Technology",
  "Lowell High School", "Boston Latin School", "Bronx High School of Science",
  "Phillips Exeter Academy", "Phillips Academy Andover", "Lincoln High School",
  "Central High School", "Washington High School", "Jefferson High School",
];

interface Activity {
  idea: string;
  length: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const reduceMotion = useReducedMotion();

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  const [fullName, setFullName] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [unweightedGpa, setUnweightedGpa] = useState("");
  const [weightedGpa, setWeightedGpa] = useState("");
  const [currentSchool, setCurrentSchool] = useState("");

  const [intendedMajor, setIntendedMajor] = useState("");
  const [majorOther, setMajorOther] = useState("");
  const [interests, setInterests] = useState("");
  const [careerGoals, setCareerGoals] = useState("");
  const [showCareerQuiz, setShowCareerQuiz] = useState(false);
  const [useChatIntake, setUseChatIntake] = useState(false);

  const [activities, setActivities] = useState<Activity[]>([{ idea: "", length: "" }]);

  const [satScore, setSatScore] = useState("");
  const [actScore, setActScore] = useState("");
  const [noTestYet, setNoTestYet] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState(0);

  function showError(message: string) {
    setError(message);
    setErrorKey((k) => k + 1);
  }

  function updateActivity(idx: number, patch: Partial<Activity>) {
    setActivities((prev) => prev.map((a, i) => (i === idx ? { ...a, ...patch } : a)));
  }

  function addActivity() {
    setActivities((prev) => [...prev, { idea: "", length: "" }]);
  }

  function removeActivity(idx: number) {
    setActivities((prev) => prev.filter((_, i) => i !== idx));
  }

  const resolvedMajor = intendedMajor === "Other" ? majorOther : intendedMajor;

  const progressChecks = [
    !!fullName,
    !!gradeLevel,
    !!unweightedGpa,
    !!weightedGpa,
    !!currentSchool,
    !!resolvedMajor,
    activities.some((a) => a.idea.trim()),
    noTestYet || !!satScore || !!actScore,
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
      identify(user.id);

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

  function validateStep(idx: number): string | null {
    if (idx === 0) {
      if (!fullName || !gradeLevel || !unweightedGpa || !weightedGpa || !currentSchool) {
        return "Please fill out every field to continue.";
      }
    }
    if (idx === 1) {
      if (!resolvedMajor) return "Please select (or describe) your intended major.";
    }
    if (idx === 2) {
      if (!activities.some((a) => a.idea.trim())) return "Add at least one activity.";
    }
    if (idx === 3) {
      if (!noTestYet && !satScore && !actScore) {
        return "Enter a score, or let us know you haven't tested yet.";
      }
    }
    return null;
  }

  function goNext() {
    const err = validateStep(step);
    if (err) {
      showError(err);
      return;
    }
    setError(null);
    setDirection(1);
    setStep((s) => s + 1);
  }

  function goBack() {
    setError(null);
    setDirection(-1);
    setStep((s) => Math.max(0, s - 1));
  }

  async function handleSubmit() {
    const err = validateStep(step);
    if (err) {
      showError(err);
      return;
    }
    setError(null);
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    await supabase.auth.updateUser({ data: { full_name: fullName } });

    const ecArray = activities
      .map((a) => (a.idea.trim() ? `${a.idea.trim()}${a.length ? ` (${a.length})` : ""}` : ""))
      .filter(Boolean);

    // Schools-already-considering, campus preferences, and the deeper context
    // fields (financial aid, class rank, career goals, etc.) are intentionally
    // left null here -- they're not needed for a first real match, and are
    // collected afterward via ProfileCompletenessModal -> /profile?edit=true
    // rather than blocking account creation.
    const { error } = await supabase.from("profiles").insert({
      user_id: user.id,
      grade_level: gradeLevel,
      unweighted_gpa: parseFloat(unweightedGpa),
      weighted_gpa: parseFloat(weightedGpa),
      intended_major: resolvedMajor,
      interests: interests || null,
      current_school: currentSchool,
      extracurriculars: ecArray.length > 0 ? ecArray : null,
      sat_score: satScore ? parseInt(satScore, 10) : null,
      act_score: actScore ? parseInt(actScore, 10) : null,
      career_goals: careerGoals || null,
    });

    if (error) {
      showError(error.message);
      setLoading(false);
      return;
    }

    fetch("/api/email/welcome", { method: "POST" }).catch(() => {});
    track("onboarding_completed", { rounds_completed: rounds.length });

    // Match generation takes up to ~50s. Don't await it here -- the matches
    // page already auto-triggers generation (with a proper progress UI) the
    // moment it loads with zero active matches, so just get the user there.
    router.push("/matches");
  }

  // Onboarding completion/drop-off instrumentation (Phase 3 Section 1): fires
  // on every step view so a funnel query can answer "which step do students
  // abandon at" without waiting for the next real decision cycle. Must run
  // before the `loading` early return below (rules-of-hooks).
  useEffect(() => {
    track("onboarding_step_viewed", { step, title: ROUND_TITLES[step], total_steps: ROUND_TITLES.length });
  }, [step]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="animate-pulse" role="status">
          <p className="font-serif text-2xl text-text mb-2">Building your personalized list...</p>
          <p className="text-text-gray text-sm">This takes a moment, we&apos;re matching you against real schools.</p>
        </div>
        <GenerationProgress />
      </div>
    );
  }

  const inputClass =
    "w-full rounded-xl bg-bg border border-border px-4 py-2.5 text-text outline-none focus:border-primary transition-colors";

  const rounds: { title: string; fields: React.ReactNode }[] = [
    {
      title: "The basics",
      fields: (
        <>
          <div>
            <label htmlFor="ob-full-name" className="block text-sm text-text-gray mb-1">Full Name</label>
            <input
              id="ob-full-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="ob-grade-level" className="block text-sm text-text-gray mb-1">Grade Level</label>
              <select
                id="ob-grade-level"
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
              <label htmlFor="ob-unweighted-gpa" className="block text-sm text-text-gray mb-1">Unweighted GPA</label>
              <input
                id="ob-unweighted-gpa"
                type="number"
                step="0.01"
                min="0"
                max="4"
                value={unweightedGpa}
                onChange={(e) => setUnweightedGpa(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label htmlFor="ob-weighted-gpa" className="block text-sm text-text-gray mb-1">Weighted GPA</label>
            <input
              id="ob-weighted-gpa"
              type="number"
              step="0.01"
              min="0"
              max="5"
              value={weightedGpa}
              onChange={(e) => setWeightedGpa(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="ob-current-school" className="block text-sm text-text-gray mb-1">Current School</label>
            <input
              id="ob-current-school"
              type="text"
              list="ob-high-schools"
              placeholder="e.g. Lincoln High School"
              value={currentSchool}
              onChange={(e) => setCurrentSchool(e.target.value)}
              className={inputClass}
            />
            <datalist id="ob-high-schools">
              {HIGH_SCHOOLS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
        </>
      ),
    },
    {
      title: "Major & interests",
      fields: (
        <>
          <div>
            <label htmlFor="ob-intended-major" className="block text-sm text-text-gray mb-1">Intended Major</label>
            <select
              id="ob-intended-major"
              value={intendedMajor}
              onChange={(e) => setIntendedMajor(e.target.value)}
              className={inputClass}
            >
              <option value="" disabled>
                Select
              </option>
              {MAJORS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            {intendedMajor === "Other" && (
              <input
                type="text"
                placeholder="Tell us your intended major"
                value={majorOther}
                onChange={(e) => setMajorOther(e.target.value)}
                className={`${inputClass} mt-2`}
              />
            )}
            {intendedMajor === "Undecided" && (
              <button
                type="button"
                onClick={() => setShowCareerQuiz(true)}
                className="mt-2 text-sm text-primary hover:underline underline-offset-2"
              >
                Not sure? Take a 2-minute quiz
              </button>
            )}
          </div>
          <div>
            <label htmlFor="ob-interests" className="block text-sm text-text-gray mb-1">
              Interests <span className="text-text-gray/70">— optional</span>
            </label>
            <p className="text-text-gray text-xs mb-2">
              Anything you&apos;re into that doesn&apos;t fit neatly into a major, e.g. &quot;robotics, creative writing, climate policy.&quot;
            </p>
            <input
              id="ob-interests"
              type="text"
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
              className={inputClass}
            />
          </div>
        </>
      ),
    },
    {
      title: "Extracurriculars",
      fields: (
        <div>
          <span id="ob-activities-label" className="block text-sm text-text-gray mb-1">Your activities</span>
          <p className="text-text-gray text-xs mb-2">
            Describe the activity, then tell us how long you&apos;ve done it.
          </p>
          <div className="space-y-4" role="group" aria-labelledby="ob-activities-label">
            {activities.map((activity, idx) => (
              <div key={idx} className="bg-bg/40 border border-border rounded-xl p-3 space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    aria-label={`Activity ${idx + 1} description`}
                    placeholder="e.g. Varsity basketball, team captain"
                    value={activity.idea}
                    onChange={(e) => updateActivity(idx, { idea: e.target.value })}
                    className={`${inputClass} flex-1`}
                  />
                  {activities.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeActivity(idx)}
                      className="text-text-gray hover:text-text px-1.5 shrink-0"
                      aria-label="Remove activity"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>
                <select
                  aria-label={`Activity ${idx + 1} length`}
                  value={activity.length}
                  onChange={(e) => updateActivity(idx, { length: e.target.value })}
                  className={inputClass}
                >
                  <option value="" disabled>
                    How long have you done this?
                  </option>
                  {EC_LENGTHS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
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
      ),
    },
    {
      title: "Test scores",
      fields: (
        <>
          <p className="text-text-gray text-xs -mt-2">
            Enter either or both — some schools superscore across test types.
          </p>
          <div>
            <label htmlFor="ob-sat-score" className="block text-sm text-text-gray mb-1">SAT Score</label>
            <input
              id="ob-sat-score"
              type="number"
              placeholder="e.g. 1380"
              value={satScore}
              onChange={(e) => setSatScore(e.target.value)}
              className={inputClass}
              disabled={noTestYet}
            />
          </div>
          <div>
            <label htmlFor="ob-act-score" className="block text-sm text-text-gray mb-1">ACT Score</label>
            <input
              id="ob-act-score"
              type="number"
              placeholder="e.g. 30"
              value={actScore}
              onChange={(e) => setActScore(e.target.value)}
              className={inputClass}
              disabled={noTestYet}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-text-gray">
            <input
              type="checkbox"
              checked={noTestYet}
              onChange={(e) => {
                setNoTestYet(e.target.checked);
                if (e.target.checked) {
                  setSatScore("");
                  setActScore("");
                }
              }}
            />
            Haven&apos;t taken one yet
          </label>
        </>
      ),
    },
  ];

  const isLastRound = step === rounds.length - 1;

  return (
    <div className="flex-1 px-6 py-10 md:py-16 max-w-xl mx-auto w-full">
      {showCareerQuiz && (
        <CareerQuiz
          onClose={() => setShowCareerQuiz(false)}
          onSelectMajor={(major, rationale) => {
            setIntendedMajor(major);
            setCareerGoals(rationale);
            setShowCareerQuiz(false);
          }}
        />
      )}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-text-gray hover:text-text text-sm mb-6 transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to home
      </Link>
      <motion.h1
        initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE }}
        className="font-serif text-3xl text-text mb-2"
      >
        Let&apos;s get to know you
      </motion.h1>
      <p className="text-text-gray text-sm mb-6">
        A few quick rounds of questions, we want to know you well so your matches can be optimal.
      </p>

      <motion.div
        initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE, delay: reduceMotion ? 0 : 0.08 }}
        className="bg-secondary-tint border border-border rounded-2xl px-5 py-4 mb-6"
      >
        <p className="text-secondary text-sm leading-relaxed">
          Answer a few questions and we&apos;ll instantly generate your school match list and
          a personalized application timeline on the other side.
        </p>
      </motion.div>

      {useChatIntake ? (
        <OnboardingChat onCancel={() => setUseChatIntake(false)} />
      ) : (
        <>
          <div className="mb-6">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs text-text-gray">
                Round {step + 1} of {rounds.length}
              </p>
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

          <div className="space-y-5">
            <AnimatePresence mode="wait" custom={direction} initial={false}>
              <motion.div
                key={step}
                custom={direction}
                initial={reduceMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: direction * 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduceMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: -direction * 16 }}
                transition={{ duration: 0.3, ease: EASE }}
                className="bg-card border border-border rounded-2xl p-6 space-y-4"
              >
                <p className="text-xs font-medium text-text-gray uppercase tracking-wide">{rounds[step].title}</p>
                {rounds[step].fields}
              </motion.div>
            </AnimatePresence>

            {error && (
              <p key={errorKey} role="alert" className="text-red text-sm animate-auth-error">
                {error}
              </p>
            )}

            {isLastRound && (
              <p className="text-text-gray text-xs leading-relaxed">
                We use this to build your school matches and timeline. We never sell it.{" "}
                <a href="/privacy" className="text-text underline underline-offset-2">Privacy Policy</a>
              </p>
            )}

            <div className="flex gap-3">
              {step > 0 && (
                <button
                  type="button"
                  onClick={goBack}
                  className="rounded-xl border border-border text-text-gray hover:text-text font-medium py-3 px-6"
                >
                  Back
                </button>
              )}
              <button
                type="button"
                onClick={isLastRound ? handleSubmit : goNext}
                className="flex-1 rounded-xl bg-primary hover:bg-primary-hover transition-colors text-bg font-medium py-3"
              >
                {isLastRound ? "Complete profile" : "Continue"}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setUseChatIntake(true)}
            className="text-text-gray hover:text-text text-xs underline underline-offset-2 mt-5 block mx-auto"
          >
            Prefer to chat instead?
          </button>
        </>
      )}
    </div>
  );
}
