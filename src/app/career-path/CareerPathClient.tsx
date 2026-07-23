"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { crossFeatureWhyText } from "@/lib/cross-feature-why";
import CareerQuiz from "@/components/CareerQuiz";
import CrossFeatureToast from "@/components/CrossFeatureToast";

const EASE = [0.16, 1, 0.3, 1] as const;

interface Match {
  id: string;
  school_name: string;
}

interface CareerPath {
  internships: string[];
  employer_types: string[];
  median_salary: string;
  summary: string;
  confidence?: "low" | "moderate" | "high";
}

const CONFIDENCE_LABEL: Record<string, string> = {
  high: "High confidence",
  moderate: "Moderate confidence",
  low: "Low confidence — less established data for this pairing",
};

interface Photo {
  imageUrl: string;
}

export default function CareerPathClient({
  matches,
  intendedMajor,
  preselectedSchool,
  photos = {},
}: {
  matches: Match[];
  intendedMajor: string[] | null;
  preselectedSchool: string | null;
  photos?: Record<string, Photo | null>;
}) {
  const reduceMotion = useReducedMotion();
  const supabase = createClient();
  const [addedToMatches, setAddedToMatches] = useState(false);
  const [addingToMatches, setAddingToMatches] = useState(false);
  const [showMatchesToast, setShowMatchesToast] = useState(false);

  async function addExploredSchoolToMatches(name: string, summary: string) {
    setAddingToMatches(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setAddingToMatches(false);
      return;
    }
    const MANUAL_NOTE = "This school was added manually, so an AI assessment isn't available.";
    const { error } = await supabase.from("school_matches").insert({
      user_id: user.id,
      school_name: name,
      category: "target",
      percentage: 50,
      why_text: crossFeatureWhyText("Career Path exploration", summary),
      factors: {
        gpa_comparison: MANUAL_NOTE,
        course_rigor: MANUAL_NOTE,
        ec_strength: MANUAL_NOTE,
        major_fit: MANUAL_NOTE,
        social_fit: MANUAL_NOTE,
      },
      is_active: true,
      is_manual: true,
    });
    setAddingToMatches(false);
    if (!error) {
      setAddedToMatches(true);
      setShowMatchesToast(true);
    }
  }
  // Section 9e follow-up: tying the CareerQuiz -> Career Path suggestion back
  // into the student's actual profile so it can inform Matches/Timeline too.
  // Mirrors the existing "Looks like a fit -- add to matches?" pattern above,
  // but the signal here is the *major*, not a custom school: explicit
  // confirmation, additive (append, never overwrite intended_major).
  const [addedMajorToProfile, setAddedMajorToProfile] = useState(false);
  const [addingMajorToProfile, setAddingMajorToProfile] = useState(false);
  const [showMajorToast, setShowMajorToast] = useState(false);

  async function addExploringMajorToIntendedMajors(major: string) {
    setAddingMajorToProfile(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setAddingMajorToProfile(false);
      return;
    }
    const current = intendedMajor ?? [];
    if (!current.includes(major)) {
      const { error } = await supabase
        .from("profiles")
        .update({ intended_major: [...current, major] })
        .eq("user_id", user.id);
      if (error) {
        setAddingMajorToProfile(false);
        return;
      }
    }
    setAddingMajorToProfile(false);
    setAddedMajorToProfile(true);
    setShowMajorToast(true);
  }

  const preselectedMatch = preselectedSchool && matches.some((m) => m.school_name === preselectedSchool);
  const [selected, setSelected] = useState(
    preselectedMatch ? (preselectedSchool as string) : matches[0]?.school_name ?? ""
  );
  const [customSchool, setCustomSchool] = useState(preselectedMatch ? "" : preselectedSchool ?? "");
  const [useCustom, setUseCustom] = useState(matches.length === 0 || (!!preselectedSchool && !preselectedMatch));
  const [careerPath, setCareerPath] = useState<CareerPath | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Cached results have no natural "regenerate" trigger today (re-clicking
  // "See Career Path" just returns the cache instantly) -- this shows an
  // optional feedback field once a result is loaded, and forces a fresh,
  // non-cached fetch when used, so a student can ask for something different
  // on a school they've already loaded this session.
  const [showRegen, setShowRegen] = useState(false);
  const [regenFeedback, setRegenFeedback] = useState("");

  // Interest-quiz exploration (Software_Timeline.md 9e): reuses the existing
  // onboarding CareerQuiz component (a deterministic, RIASEC-adjacent
  // interest -> major mapper) here too, since it previously only ever ran
  // once during onboarding for undecided students and was never tied back
  // into Career Path or persisted anywhere. Picking a suggestion here is a
  // one-off exploration -- it does NOT change the student's actual declared
  // intended_major, only what's sent for this Career Path request.
  const [showQuiz, setShowQuiz] = useState(false);
  const [exploringMajor, setExploringMajor] = useState<string | null>(null);

  // Re-selecting a school you already loaded this session shouldn't refire
  // the API call and full loading state -- cache per school name.
  const cache = useRef(new Map<string, CareerPath>());

  const schoolName = (useCustom ? customSchool : selected).trim();

  async function fetchCareerPath(
    name: string,
    opts?: { feedback?: string; forceRefresh?: boolean; majorOverride?: string }
  ): Promise<CareerPath | null> {
    const cacheName = opts?.majorOverride ? `${name}::${opts.majorOverride}` : name;
    if (!opts?.forceRefresh) {
      const cached = cache.current.get(cacheName);
      if (cached) return cached;
    }
    const res = await fetch("/api/career-path", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        schoolName: name,
        regenFeedback: opts?.feedback || undefined,
        majorOverride: opts?.majorOverride ? [opts.majorOverride] : undefined,
      }),
    });
    if (!res.ok) return null;
    const data: CareerPath = await res.json();
    cache.current.set(cacheName, data);
    return data;
  }

  async function handleLoad() {
    if (!schoolName) return;
    setShowRegen(false);
    setRegenFeedback("");
    setAddedToMatches(false);
    const cacheName = exploringMajor ? `${schoolName}::${exploringMajor}` : schoolName;
    const cached = cache.current.get(cacheName);
    if (cached) {
      setCareerPath(cached);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    setCareerPath(null);
    const result = await fetchCareerPath(schoolName, { majorOverride: exploringMajor ?? undefined });
    if (!result) {
      setError("Couldn't load career path. Please try again.");
      setLoading(false);
      return;
    }
    setCareerPath(result);
    setLoading(false);
  }

  async function handleRegenerate() {
    if (!schoolName) return;
    setLoading(true);
    setError(null);
    const result = await fetchCareerPath(schoolName, {
      feedback: regenFeedback.trim() || undefined,
      forceRefresh: true,
      majorOverride: exploringMajor ?? undefined,
    });
    if (!result) {
      setError("Couldn't regenerate career path. Please try again.");
      setLoading(false);
      return;
    }
    setCareerPath(result);
    setLoading(false);
    setRegenFeedback("");
    setShowRegen(false);
  }

  // Compare mode: up to 3 schools side by side. Persisted to localStorage
  // (selection + mode only, not results -- those are cheap to re-fetch and
  // re-running the AI call automatically on page load would be surprising)
  // so navigating away and back doesn't silently drop an in-progress
  // comparison the student was still building.
  const COMPARE_STORAGE_KEY = "kairos_career_path_compare";
  const [compareMode, setCompareMode] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const raw = localStorage.getItem(COMPARE_STORAGE_KEY);
      return raw ? (JSON.parse(raw).mode ?? false) : false;
    } catch {
      return false;
    }
  });
  const [compareSelection, setCompareSelection] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(COMPARE_STORAGE_KEY);
      return raw ? (JSON.parse(raw).selection ?? []) : [];
    } catch {
      return [];
    }
  });
  const [compareCustomInput, setCompareCustomInput] = useState("");
  const [compareResults, setCompareResults] = useState<Record<string, CareerPath | "error"> | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const MAX_COMPARE = 3;

  useEffect(() => {
    localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify({ mode: compareMode, selection: compareSelection }));
  }, [compareMode, compareSelection]);

  function toggleCompareSchool(name: string) {
    setCompareSelection((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : prev.length < MAX_COMPARE ? [...prev, name] : prev
    );
  }

  function addCompareCustomSchool() {
    const name = compareCustomInput.trim();
    if (!name || compareSelection.includes(name) || compareSelection.length >= MAX_COMPARE) return;
    setCompareSelection((prev) => [...prev, name]);
    setCompareCustomInput("");
  }

  async function handleCompare() {
    if (compareSelection.length < 2) return;
    setCompareLoading(true);
    setCompareResults(null);
    const entries = await Promise.all(
      compareSelection.map(async (name) => {
        const result = await fetchCareerPath(name);
        return [name, result ?? ("error" as const)] as const;
      })
    );
    setCompareResults(Object.fromEntries(entries));
    setCompareLoading(false);
  }

  return (
    <div>
      <CrossFeatureToast
        message="Added to your Matches list."
        show={showMatchesToast}
        onDone={() => setShowMatchesToast(false)}
      />
      <CrossFeatureToast
        message="Added to your intended majors."
        show={showMajorToast}
        onDone={() => setShowMajorToast(false)}
      />
      <p className="text-text-gray text-xs mb-1">
        Major: <span className="text-text">{intendedMajor?.length ? intendedMajor.join(", ") : "Undecided"}</span>
      </p>

      {!intendedMajor?.length && !exploringMajor && (
        <button onClick={() => setShowQuiz(true)} className="text-primary text-xs hover:text-primary-hover mb-3">
          Not sure yet? Take a quick interest quiz →
        </button>
      )}
      {exploringMajor && (
        <p className="text-text-gray text-xs mb-3">
          Exploring as <span className="text-text">{exploringMajor}</span> (not saved as your actual major){" "}
          <button
            onClick={() => {
              setExploringMajor(null);
              setCareerPath(null);
              setAddedMajorToProfile(false);
            }}
            className="text-primary hover:text-primary-hover underline underline-offset-2"
          >
            Clear
          </button>
        </p>
      )}
      {showQuiz && (
        <CareerQuiz
          onClose={() => setShowQuiz(false)}
          onSelectMajor={(major) => {
            setExploringMajor(major);
            setCareerPath(null);
            setAddedMajorToProfile(false);
            setShowQuiz(false);
          }}
        />
      )}

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setCompareMode(false)}
          className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${
            !compareMode ? "bg-primary text-bg" : "bg-card border border-border text-text-gray hover:text-text"
          }`}
        >
          Single school
        </button>
        <button
          onClick={() => setCompareMode(true)}
          className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${
            compareMode ? "bg-primary text-bg" : "bg-card border border-border text-text-gray hover:text-text"
          }`}
        >
          Compare schools
        </button>
      </div>

      {compareMode ? (
        <div className="mb-6">
          <div className="bg-card border border-border rounded-2xl p-5 mb-4 space-y-3">
            <p className="text-text text-sm font-medium">Pick 2–3 schools to compare</p>
            {matches.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {matches.map((m) => {
                  const isSelected = compareSelection.includes(m.school_name);
                  return (
                    <button
                      key={m.id}
                      onClick={() => toggleCompareSchool(m.school_name)}
                      disabled={!isSelected && compareSelection.length >= MAX_COMPARE}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 ${
                        isSelected ? "bg-primary text-bg" : "bg-bg border border-border text-text-gray hover:text-text"
                      }`}
                    >
                      {m.school_name}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={compareCustomInput}
                onChange={(e) => setCompareCustomInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCompareCustomSchool()}
                placeholder="Add another school"
                maxLength={200}
                disabled={compareSelection.length >= MAX_COMPARE}
                className="flex-1 rounded-xl bg-bg border border-border px-4 py-2 text-text text-sm outline-none focus:border-primary disabled:opacity-50"
              />
              <button
                onClick={addCompareCustomSchool}
                disabled={!compareCustomInput.trim() || compareSelection.length >= MAX_COMPARE}
                className="rounded-xl border border-border text-text-gray hover:text-text text-sm font-medium px-3 py-2 disabled:opacity-40"
              >
                Add
              </button>
            </div>
            {compareSelection.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {compareSelection.map((name) => (
                  <span
                    key={name}
                    className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-secondary-tint text-text"
                  >
                    {name}
                    <button onClick={() => toggleCompareSchool(name)} aria-label={`Remove ${name}`} className="text-text-gray hover:text-red">
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <button
              onClick={handleCompare}
              disabled={compareLoading || compareSelection.length < 2}
              className="rounded-xl bg-primary hover:bg-primary-hover transition-colors text-bg font-medium px-5 py-2.5 disabled:opacity-50"
            >
              {compareLoading ? <span role="status" aria-live="polite">Comparing...</span> : "Compare"}
            </button>
          </div>

          {compareResults && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {compareSelection.map((name) => {
                const result = compareResults[name];
                return (
                  <div key={name} className="bg-card border border-border rounded-2xl p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      {photos[name] ? (
                        <img
                          src={photos[name]!.imageUrl}
                          alt=""
                          className="size-11 rounded-xl object-cover border border-border shrink-0"
                          loading="lazy"
                        />
                      ) : (
                        <div className="size-11 rounded-xl bg-secondary-tint border border-dashed border-border flex items-center justify-center shrink-0">
                          <span className="font-serif text-sm text-secondary">{name.charAt(0)}</span>
                        </div>
                      )}
                      <p className="font-serif text-text">{name}</p>
                    </div>
                    {result === "error" || !result ? (
                      <p className="text-red text-sm">Couldn&apos;t load this school.</p>
                    ) : (
                      <>
                        <p className="text-text-gray text-sm leading-relaxed">{result.summary}</p>
                        <div>
                          <p className="text-text font-medium text-xs mb-1">Median salary</p>
                          <p className="text-text-gray text-sm">{result.median_salary}</p>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <>
      <div className="bg-card border border-border rounded-2xl p-5 mb-6 space-y-3">
        {matches.length > 0 && (
          <div className="flex gap-2 mb-1">
            <button
              onClick={() => setUseCustom(false)}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${
                !useCustom ? "bg-primary text-bg" : "bg-bg border border-border text-text-gray hover:text-text"
              }`}
            >
              A matched school
            </button>
            <button
              onClick={() => setUseCustom(true)}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${
                useCustom ? "bg-primary text-bg" : "bg-bg border border-border text-text-gray hover:text-text"
              }`}
            >
              Any other school
            </button>
          </div>
        )}

        {!useCustom ? (
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="w-full rounded-xl bg-bg border border-border px-4 py-2.5 text-text text-sm outline-none focus:border-primary"
          >
            {matches.map((m) => (
              <option key={m.id} value={m.school_name}>
                {m.school_name}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={customSchool}
            onChange={(e) => setCustomSchool(e.target.value)}
            placeholder="e.g. University of Michigan"
            maxLength={200}
            className="w-full rounded-xl bg-bg border border-border px-4 py-2.5 text-text text-sm outline-none focus:border-primary"
          />
        )}

        <button
          onClick={handleLoad}
          disabled={loading || !schoolName}
          className="rounded-xl bg-primary hover:bg-primary-hover transition-colors text-bg font-medium px-5 py-2.5 disabled:opacity-50"
        >
          {loading ? <span role="status" aria-live="polite">Mapping out this path...</span> : "See Career Path"}
        </button>
      </div>

      {error && (
        <div className="mb-4">
          <p role="alert" className="text-red text-sm mb-2">{error}</p>
          <button onClick={handleLoad} className="text-primary text-sm hover:text-primary-hover">
            Retry
          </button>
        </div>
      )}

      <AnimatePresence>
        {careerPath && (
          <motion.div
            initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="bg-card border border-border rounded-2xl p-5 space-y-4"
          >
            <p className="text-text-gray text-xs">
              AI-generated general patterns for this major at {schoolName}, not specific to named
              individuals or guaranteed outcomes.
              {careerPath.confidence && ` · ${CONFIDENCE_LABEL[careerPath.confidence]}`}
            </p>
            <p className="text-text-gray text-sm leading-relaxed">{careerPath.summary}</p>
            <div>
              <p className="text-text font-medium text-sm mb-1">Typical internships</p>
              <ul className="text-text-gray text-sm space-y-0.5">
                {careerPath.internships.map((i, idx) => (
                  <li key={idx}>• {i}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-text font-medium text-sm mb-1">Employer types &amp; locations</p>
              <ul className="text-text-gray text-sm space-y-0.5">
                {careerPath.employer_types.map((i, idx) => (
                  <li key={idx}>• {i}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-text font-medium text-sm mb-1">Median salary</p>
              <p className="text-text-gray text-sm">{careerPath.median_salary}</p>
            </div>

            {exploringMajor && (
              <div className="pt-2 border-t border-border">
                {addedMajorToProfile ? (
                  <p className="text-text-gray text-xs">Added {exploringMajor} to your intended majors ✓</p>
                ) : (
                  <button
                    onClick={() => addExploringMajorToIntendedMajors(exploringMajor)}
                    disabled={addingMajorToProfile}
                    className="text-primary text-sm hover:text-primary-hover disabled:opacity-40"
                  >
                    {addingMajorToProfile
                      ? "Adding…"
                      : `Looks like a fit — add ${exploringMajor} to your intended majors?`}
                  </button>
                )}
              </div>
            )}

            {useCustom && (
              <div className="pt-2 border-t border-border">
                {addedToMatches ? (
                  <p className="text-text-gray text-xs">Added {schoolName} to your matches ✓</p>
                ) : (
                  <button
                    onClick={() => addExploredSchoolToMatches(schoolName, careerPath.summary)}
                    disabled={addingToMatches}
                    className="text-primary text-sm hover:text-primary-hover disabled:opacity-40"
                  >
                    {addingToMatches ? "Adding…" : `Looks like a fit — add ${schoolName} to your matches?`}
                  </button>
                )}
              </div>
            )}

            {showRegen ? (
              <div className="pt-2 border-t border-border space-y-2">
                <label htmlFor="career-regen-feedback" className="block text-text font-medium text-sm">
                  What should change? <span className="text-text-gray font-normal">(optional)</span>
                </label>
                <textarea
                  id="career-regen-feedback"
                  value={regenFeedback}
                  onChange={(e) => setRegenFeedback(e.target.value)}
                  rows={2}
                  maxLength={1000}
                  placeholder="e.g. too generic, want more on grad-school paths"
                  className="w-full rounded-xl bg-bg border border-border px-3 py-2 text-text text-sm outline-none focus:border-primary resize-none"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowRegen(false); setRegenFeedback(""); }}
                    disabled={loading}
                    className="text-text-gray text-sm hover:text-text disabled:opacity-40"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRegenerate}
                    disabled={loading}
                    className="rounded-xl bg-primary hover:bg-primary-hover transition-colors text-bg font-medium px-4 py-2 text-sm disabled:opacity-50"
                  >
                    {loading ? <span role="status" aria-live="polite">Regenerating...</span> : "Regenerate"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowRegen(true)}
                className="text-primary text-sm hover:text-primary-hover pt-2 border-t border-border w-full text-left"
              >
                Not quite right? Regenerate
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
        </>
      )}
    </div>
  );
}
