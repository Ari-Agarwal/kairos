"use client";

import { useState } from "react";
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
  intendedMajor: string | null;
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

  const schoolName = (useCustom ? customSchool : selected).trim();

  async function handleLoad() {
    if (!schoolName) return;
    setLoading(true);
    setError(null);
    setCareerPath(null);
    const res = await fetch("/api/career-path", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schoolName }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Couldn't load career path. Please try again.");
      setLoading(false);
      return;
    }
    setCareerPath(await res.json());
    setLoading(false);
  }

  return (
    <div>
      <p className="text-text-gray text-xs mb-4">
        Major: <span className="text-text">{intendedMajor ?? "Undecided"}</span>
      </p>

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
    </div>
  );
}
