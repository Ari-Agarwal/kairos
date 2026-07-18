"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

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
}

export default function CareerPathClient({
  matches,
  intendedMajor,
  preselectedSchool,
}: {
  matches: Match[];
  intendedMajor: string[] | null;
  preselectedSchool: string | null;
}) {
  const reduceMotion = useReducedMotion();
  const preselectedMatch = preselectedSchool && matches.some((m) => m.school_name === preselectedSchool);
  const [selected, setSelected] = useState(
    preselectedMatch ? (preselectedSchool as string) : matches[0]?.school_name ?? ""
  );
  const [customSchool, setCustomSchool] = useState(preselectedMatch ? "" : preselectedSchool ?? "");
  const [useCustom, setUseCustom] = useState(matches.length === 0 || (!!preselectedSchool && !preselectedMatch));
  const [careerPath, setCareerPath] = useState<CareerPath | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-selecting a school you already loaded this session shouldn't refire
  // the API call and full loading state -- cache per school name.
  const cache = useRef(new Map<string, CareerPath>());

  const schoolName = (useCustom ? customSchool : selected).trim();

  async function fetchCareerPath(name: string): Promise<CareerPath | null> {
    const cached = cache.current.get(name);
    if (cached) return cached;
    const res = await fetch("/api/career-path", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schoolName: name }),
    });
    if (!res.ok) return null;
    const data: CareerPath = await res.json();
    cache.current.set(name, data);
    return data;
  }

  async function handleLoad() {
    if (!schoolName) return;
    const cached = cache.current.get(schoolName);
    if (cached) {
      setCareerPath(cached);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    setCareerPath(null);
    const result = await fetchCareerPath(schoolName);
    if (!result) {
      setError("Couldn't load career path. Please try again.");
      setLoading(false);
      return;
    }
    setCareerPath(result);
    setLoading(false);
  }

  // Compare mode: up to 3 schools side by side.
  const [compareMode, setCompareMode] = useState(false);
  const [compareSelection, setCompareSelection] = useState<string[]>([]);
  const [compareCustomInput, setCompareCustomInput] = useState("");
  const [compareResults, setCompareResults] = useState<Record<string, CareerPath | "error"> | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const MAX_COMPARE = 3;

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
      <p className="text-text-gray text-xs mb-4">
        Major: <span className="text-text">{intendedMajor?.length ? intendedMajor.join(", ") : "Undecided"}</span>
      </p>

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
              {compareLoading ? "Loading..." : "Compare"}
            </button>
          </div>

          {compareResults && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {compareSelection.map((name) => {
                const result = compareResults[name];
                return (
                  <div key={name} className="bg-card border border-border rounded-2xl p-4 space-y-3">
                    <p className="font-serif text-text">{name}</p>
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
          {loading ? "Loading..." : "See Career Path"}
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
          </motion.div>
        )}
      </AnimatePresence>
        </>
      )}
    </div>
  );
}
