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
import OnboardingIllustration, { ChatIntakeArt } from "@/components/OnboardingIllustration";
import { MAJORS } from "@/lib/mini-onboarding-fields";

const EASE = [0.16, 1, 0.3, 1] as const;

const ROUND_TITLES = ["Getting to know you", "The basics", "Major", "Extracurriculars", "Test scores"];

const GRADE_LEVELS = ["Freshman", "Sophomore", "Junior", "Senior"];
const EC_LENGTHS = ["Less than 1 year", "1 year", "2 years", "3 years", "4+ years"];

// Software_Timeline.md Section 11: optional, skippable applicant-type flag so
// a student who isn't a standard first-time freshman/senior applicant isn't
// silently run through freshman-framed timeline/matches prompts. "standard"
// is the default/skip value, not a forced choice.
const APPLICANT_TYPES: { value: string; label: string }[] = [
  { value: "standard", label: "First-time (standard)" },
  { value: "transfer", label: "Transfer student" },
  { value: "homeschooled", label: "Homeschooled" },
  { value: "international", label: "International student" },
  { value: "recruited_athlete", label: "Recruited athlete" },
  { value: "gap_year", label: "Returning after a gap year" },
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

  const [intendedMajors, setIntendedMajors] = useState<string[]>([]);
  const [majorOther, setMajorOther] = useState("");
  const [interests, setInterests] = useState("");
  const [mattersToYou, setMattersToYou] = useState("");
  const [beyondTranscript, setBeyondTranscript] = useState("");
  const [careerGoals, setCareerGoals] = useState("");
  const [showCareerQuiz, setShowCareerQuiz] = useState(false);
  const [useChatIntake, setUseChatIntake] = useState(false);

  const [applicantType, setApplicantType] = useState("standard");
  const [accessibilityPref, setAccessibilityPref] = useState("");

  const [activities, setActivities] = useState<Activity[]>([{ idea: "", length: "" }]);

  const [satScore, setSatScore] = useState("");
  const [actScore, setActScore] = useState("");
  const [noTestYet, setNoTestYet] = useState(false);
  const [financialAidNeed, setFinancialAidNeed] = useState<boolean | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState(0);

  // Section 1 "Showcase / demo polish" aha moment: a short live synthesis of
  // the round-0 open-ended answers, shown once right after that round. Fetch
  // fires in the background the moment the student advances past round 0 so
  // it's usually ready by the time they've read the round-1 fields; fails
  // soft (reflection stays null) since this is purely cosmetic.
  const [reflection, setReflection] = useState<string | null>(null);
  const [reflectionLoading, setReflectionLoading] = useState(false);
  const [reflectionShown, setReflectionShown] = useState(false);

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

  const resolvedMajors = [
    ...new Set(
      intendedMajors
        .map((m) => (m === "Other" ? majorOther.trim() : m))
        .filter((m): m is string => !!m)
    ),
  ];

  const progressChecks = [
    !!fullName,
    !!gradeLevel,
    !!unweightedGpa,
    !!weightedGpa,
    !!currentSchool,
    resolvedMajors.length > 0,
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

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (profileError) console.error("onboarding profile check failed:", profileError);
      if (profile) router.push("/dashboard");
    });
  }, [supabase, router]);

  function validateStep(idx: number): string | null {
    if (idx === 0) {
      if (!fullName) return "Please tell us your name to continue.";
    }
    if (idx === 1) {
      if (!gradeLevel || !unweightedGpa || !weightedGpa || !currentSchool) {
        return "Please fill out every field to continue.";
      }
    }
    if (idx === 2) {
      if (resolvedMajors.length === 0) return "Please select (or describe) your intended major.";
    }
    if (idx === 3) {
      if (!activities.some((a) => a.idea.trim())) return "Add at least one activity.";
    }
    if (idx === 4) {
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
    if (step === 0 && !reflectionShown) {
      setReflectionShown(true);
      setReflectionLoading(true);
      fetch("/api/onboarding/reflect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interests, mattersToYou, beyondTranscript }),
      })
        .then((res) => (res.ok ? res.json() : { reflection: null }))
        .then((body) => setReflection(body?.reflection ?? null))
        .catch(() => setReflection(null))
        .finally(() => setReflectionLoading(false));
    }
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

    // The two open-ended "get to know you" prompts aren't separate DB columns
    // -- they fold into the existing free-text `interests` field (already fed
    // verbatim into the matches-generation prompt), so the counselor-style
    // discovery questions translate directly into sharper matches rather than
    // sitting unused.
    const combinedInterests = [
      interests.trim(),
      mattersToYou.trim() && `What matters to them in a college: ${mattersToYou.trim()}`,
      beyondTranscript.trim() && `Beyond the transcript: ${beyondTranscript.trim()}`,
    ]
      .filter(Boolean)
      .join(" | ");

    // Schools-already-considering, campus preferences, and the deeper context
    // fields (financial aid, class rank, career goals, etc.) are intentionally
    // left null here -- they're not needed for a first real match, and are
    // collected afterward via ProfileCompletenessModal -> /profile?edit=true
    // rather than blocking account creation.
    // Student referral loop (Software_Timeline.md 6b) -- ?ref=<code> is set
    // by an existing student's invite link (dashboard). Resolved to a
    // user_id here rather than trusted as one directly from the URL, since
    // an arbitrary query param shouldn't be able to claim an arbitrary FK.
    let referredByUserId: string | null = null;
    const refCode = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("ref") : null;
    if (refCode) {
      try {
        const res = await fetch("/api/referral/resolve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: refCode }),
        });
        if (res.ok) referredByUserId = (await res.json()).userId ?? null;
      } catch {
        // Referral attribution is a nice-to-have, never a blocker on account creation.
      }
    }

    const { error } = await supabase.from("profiles").insert({
      user_id: user.id,
      display_name: fullName || user.email || null,
      referred_by_user_id: referredByUserId,
      grade_level: gradeLevel,
      unweighted_gpa: parseFloat(unweightedGpa),
      weighted_gpa: parseFloat(weightedGpa),
      intended_major: resolvedMajors,
      interests: combinedInterests || null,
      current_school: currentSchool,
      extracurriculars: ecArray.length > 0 ? ecArray : null,
      sat_score: satScore ? parseInt(satScore, 10) : null,
      act_score: actScore ? parseInt(actScore, 10) : null,
      career_goals: careerGoals || null,
      financial_aid_need: financialAidNeed,
      applicant_type: applicantType !== "standard" ? applicantType : null,
      accessibility_pref: accessibilityPref.trim() || null,
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
          <p className="font-serif text-2xl text-text mb-2">Thanks for the information! Now let&apos;s find some colleges for you.</p>
          <p className="text-text-gray text-sm">This takes a moment, we&apos;re matching you against real schools.</p>
        </div>
        <GenerationProgress />
      </div>
    );
  }

  const inputClass =
    "w-full rounded-xl bg-bg border border-border px-4 py-2.5 text-text outline-none focus:border-primary transition-colors";

  const rounds: { title: string; blurb: string; fields: React.ReactNode }[] = [
    {
      title: "Getting to know you",
      blurb: "Before we talk numbers, tell us a bit about who you are — like a counselor would.",
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
          <div>
            <label htmlFor="ob-matters" className="block text-sm text-text-gray mb-1">
              What matters to you in choosing a college? <span className="text-text-gray/70">— optional</span>
            </label>
            <textarea
              id="ob-matters"
              rows={2}
              maxLength={500}
              placeholder="e.g. being close to home, a strong pre-med track, a real sense of community"
              value={mattersToYou}
              onChange={(e) => setMattersToYou(e.target.value)}
              className={`${inputClass} resize-none`}
            />
          </div>
          <div>
            <label htmlFor="ob-beyond-transcript" className="block text-sm text-text-gray mb-1">
              What&apos;s something about you a transcript wouldn&apos;t show? <span className="text-text-gray/70">— optional</span>
            </label>
            <textarea
              id="ob-beyond-transcript"
              rows={2}
              maxLength={500}
              placeholder="e.g. I run a small Etsy shop, or I've been the primary caregiver for a sibling"
              value={beyondTranscript}
              onChange={(e) => setBeyondTranscript(e.target.value)}
              className={`${inputClass} resize-none`}
            />
          </div>
          <div>
            <label htmlFor="ob-applicant-type" className="block text-sm text-text-gray mb-1">
              Which of these describes you? <span className="text-text-gray/70">— optional</span>
            </label>
            <p className="text-text-gray text-xs mb-2">
              We&apos;ll shape your timeline and matches to fit — leave this as-is if none apply.
            </p>
            <select
              id="ob-applicant-type"
              value={applicantType}
              onChange={(e) => setApplicantType(e.target.value)}
              className={inputClass}
            >
              {APPLICANT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="ob-accessibility" className="block text-sm text-text-gray mb-1">
              Anything about campus accessibility or disability services that matters to your search? <span className="text-text-gray/70">— optional</span>
            </label>
            <input
              id="ob-accessibility"
              type="text"
              placeholder="e.g. strong disability services office, physically accessible campus"
              value={accessibilityPref}
              onChange={(e) => setAccessibilityPref(e.target.value)}
              maxLength={500}
              className={inputClass}
            />
          </div>
        </>
      ),
    },
    {
      title: "The basics",
      blurb: "Now the numbers — grade, GPA, and where you go to school.",
      fields: (
        <>
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
      title: "Major",
      blurb: "What lights you up? Even a rough guess helps.",
      fields: (
        <>
          <div>
            <span id="ob-intended-major-label" className="block text-sm text-text-gray mb-1">
              Intended Major <span className="text-text-gray/70">(select all that apply)</span>
            </span>
            <div className="flex flex-wrap gap-2" role="group" aria-labelledby="ob-intended-major-label">
              {MAJORS.map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={intendedMajors.includes(m)}
                  onClick={() =>
                    setIntendedMajors((prev) =>
                      prev.includes(m) ? prev.filter((v) => v !== m) : [...prev, m]
                    )
                  }
                  className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                    intendedMajors.includes(m)
                      ? "bg-primary text-bg border-primary"
                      : "border-border text-text-gray hover:text-text"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            {intendedMajors.includes("Other") && (
              <input
                type="text"
                placeholder="Tell us your intended major"
                value={majorOther}
                onChange={(e) => setMajorOther(e.target.value)}
                className={`${inputClass} mt-2`}
              />
            )}
            {intendedMajors.includes("Undecided") && (
              <button
                type="button"
                onClick={() => setShowCareerQuiz(true)}
                className="mt-2 text-sm text-primary hover:underline underline-offset-2"
              >
                Not sure? Take a 2-minute quiz
              </button>
            )}
          </div>
        </>
      ),
    },
    {
      title: "Extracurriculars",
      blurb: "Tell us what you actually spend your time on — depth beats a long list.",
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
      blurb: "Almost there — this is the last stretch.",
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
          <div>
            <span className="block text-sm text-text-gray mb-1">Is tuition cost a factor in your search?</span>
            <div className="flex gap-2">
              {[
                { label: "Yes", value: true },
                { label: "No", value: false },
              ].map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setFinancialAidNeed(opt.value)}
                  className={`flex-1 rounded-xl border px-4 py-2.5 text-sm transition-colors ${
                    financialAidNeed === opt.value
                      ? "bg-primary text-bg border-primary"
                      : "border-border text-text-gray hover:text-text"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
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
            setIntendedMajors([major]);
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
        Let&apos;s find your people (and your schools)
      </motion.h1>
      <p className="text-text-gray text-sm mb-6">
        A few quick rounds — the more we know about you, the sharper your matches get.
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

      {!useChatIntake && step === 1 && reflectionShown && (reflectionLoading || reflection) && (
        <motion.div
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="bg-card border border-primary/30 rounded-2xl px-5 py-4 mb-6"
          role="status"
          aria-live="polite"
        >
          <p className="text-xs font-medium text-primary uppercase tracking-wide mb-1.5">
            Already noticing something
          </p>
          {reflectionLoading ? (
            <p className="text-text-gray text-sm animate-pulse">Reading back through what you shared...</p>
          ) : (
            <p className="text-text text-sm leading-relaxed italic">&ldquo;{reflection}&rdquo;</p>
          )}
        </motion.div>
      )}

      {useChatIntake ? (
        <>
          <ChatIntakeArt />
          <OnboardingChat onCancel={() => setUseChatIntake(false)} />
        </>
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
                <OnboardingIllustration step={step} />
                <div>
                  <p className="text-xs font-medium text-text-gray uppercase tracking-wide">{rounds[step].title}</p>
                  <p className="font-serif text-lg text-text mt-0.5">{rounds[step].blurb}</p>
                </div>
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
