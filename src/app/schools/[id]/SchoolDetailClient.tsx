"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import FactorCard from "./FactorCard";

const EASE = [0.16, 1, 0.3, 1] as const;

const FACTOR_LABELS: Record<string, string> = {
  gpa_comparison: "GPA",
  course_rigor: "Course Rigor",
  ec_strength: "Extracurricular Strength",
  major_fit: "Major Fit",
  social_fit: "Social & Campus Fit",
};

// Same Small/Medium/Large buckets as the profile's own campus_size_pref field.
function enrollmentSize(enrollment: number): "Small" | "Medium" | "Large" {
  if (enrollment < 5000) return "Small";
  if (enrollment <= 15000) return "Medium";
  return "Large";
}

function barWidth(text: string): number {
  const lower = text.toLowerCase();
  if (lower.includes("unavailable") || lower.includes("missing")) return 0;
  if (lower.includes("strong") || lower.includes("well above") || lower.includes("excellent")) return 90;
  if (lower.includes("moderate") || lower.includes("typical") || lower.includes("within")) return 60;
  if (lower.includes("limited") || lower.includes("below")) return 30;
  return 50;
}

interface Match {
  id: string;
  school_name: string;
  category: string;
  percentage: number;
  factors: Record<string, string>;
}

interface CollegeStats {
  acceptanceRate: number | null;
  enrollment: number | null;
  ownership: string | null;
}

interface CareerPath {
  internships: string[];
  employer_types: string[];
  median_salary: string;
  summary: string;
}

export default function SchoolDetailClient({
  match,
  isPremium,
  stats,
}: {
  match: Match;
  isPremium: boolean;
  stats: CollegeStats | null;
}) {
  const [tab, setTab] = useState<"info" | "breakdown" | "career">("info");
  const [careerPath, setCareerPath] = useState<CareerPath | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadCareerPath() {
    if (careerPath || loading) return;
    setLoading(true);
    setError(null);
    const res = await fetch("/api/career-path", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schoolName: match.school_name }),
    });
    if (!res.ok) {
      setError("Couldn't load career path. Please try again.");
      setLoading(false);
      return;
    }
    setCareerPath(await res.json());
    setLoading(false);
  }

  return (
    <div className="px-5 md:px-8 py-8 max-w-2xl mx-auto w-full">
      <Link href="/matches" className="text-text-gray text-sm hover:text-text mb-4 inline-block">
        ← Back to matches
      </Link>

      <div className="flex items-center gap-4 mb-6">
        <div className="size-14 rounded-2xl bg-card border border-border flex items-center justify-center shrink-0">
          <span className="font-serif text-xl text-text">{match.school_name.charAt(0)}</span>
        </div>
        <h1 className="font-serif text-2xl text-text">{match.school_name}</h1>
      </div>

      <div className="relative flex gap-2 mb-6 bg-card border border-border rounded-xl p-1 w-fit">
        {(["info", "breakdown", "career"] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              if (t === "career" && isPremium) loadCareerPath();
            }}
            className={`relative text-sm px-4 py-2 rounded-lg transition-colors ${
              tab === t ? "text-bg" : "text-text-gray hover:text-text"
            }`}
          >
            {tab === t && (
              <motion.div
                layoutId="school-tab-pill"
                transition={{ duration: 0.25, ease: EASE }}
                className="absolute inset-0 bg-primary rounded-lg"
              />
            )}
            <span className="relative z-10">
              {t === "info" ? "Info" : t === "breakdown" ? "Breakdown" : "Career Path"}
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === "info" && (
          <motion.div
            key="info"
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="bg-card border border-border rounded-2xl p-5"
          >
            {stats && (stats.acceptanceRate !== null || stats.enrollment !== null || stats.ownership !== null) ? (
              <>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  {stats.acceptanceRate !== null && (
                    <div className="bg-bg border border-border rounded-xl p-3">
                      <p className="text-text-gray text-xs mb-1">Acceptance Rate</p>
                      <p className="font-serif text-xl text-text">{(stats.acceptanceRate * 100).toFixed(1)}%</p>
                    </div>
                  )}
                  {stats.enrollment !== null && (
                    <div className="bg-bg border border-border rounded-xl p-3">
                      <p className="text-text-gray text-xs mb-1">Size</p>
                      <p className="font-serif text-xl text-text">{enrollmentSize(stats.enrollment)}</p>
                    </div>
                  )}
                  {stats.ownership !== null && (
                    <div className="bg-bg border border-border rounded-xl p-3 col-span-2">
                      <p className="text-text-gray text-xs mb-1">Type</p>
                      <p className="font-serif text-xl text-text">{stats.ownership}</p>
                    </div>
                  )}
                </div>
                <p className="text-text-gray text-xs mb-4">
                  Source:{" "}
                  <a
                    href="https://collegescorecard.ed.gov"
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-2 hover:text-primary"
                  >
                    College Scorecard
                  </a>{" "}
                  (U.S. Dept. of Education), most recent reporting year, may not reflect this
                  year&apos;s admissions cycle.
                </p>
              </>
            ) : (
              <p className="text-text-gray text-sm leading-relaxed mb-4">
                Kairos doesn&apos;t have verified stats (acceptance rate, enrollment) for{" "}
                {match.school_name}{" "}
                yet, either it&apos;s outside the U.S. (our data source only covers U.S.
                institutions) or it&apos;s not in that dataset.{" "}
                <a
                  href={`https://www.google.com/search?q=${encodeURIComponent(
                    `${match.school_name} acceptance rate enrollment`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-text underline underline-offset-2 hover:text-primary"
                >
                  Search for {match.school_name}&apos;s official figures
                </a>
                .
              </p>
            )}
            <p className="text-text-gray text-sm">
              Your personalized estimate for this school, grounded in your actual profile,
              not a generic school-wide number, is on the{" "}
              <button onClick={() => setTab("breakdown")} className="text-text underline underline-offset-2 hover:text-primary">
                Breakdown tab
              </button>
              .
            </p>
          </motion.div>
        )}

        {tab === "breakdown" && (
          <motion.div
            key="breakdown"
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
          >
            <p className="text-text-gray text-sm mb-4">
              How we calculated <span className="text-text font-medium">{match.percentage}%</span>
            </p>
            <div className="space-y-6">
              {Object.entries(FACTOR_LABELS).map(([key, label], i) => {
                const text = match.factors?.[key] ?? "Not available";
                const width = barWidth(text);
                const missing = width === 0;
                return (
                  <FactorCard key={key} label={label} text={text} width={width} missing={missing} index={i} />
                );
              })}
            </div>
          </motion.div>
        )}

        {tab === "career" && !isPremium && (
          <motion.div
            key="career-locked"
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="bg-premium-tint border border-border rounded-2xl p-6 text-center"
          >
            <Lock className="text-premium w-7 h-7 mx-auto mb-2" />
            <p className="text-text font-medium mb-1">Career Path is a Premium feature</p>
            <p className="text-text-gray text-sm mb-4">
              See typical internships, employer types, and salary patterns for your major at this
              school.
            </p>
            <div className="bg-card border border-border rounded-xl p-4 mb-4 blur-[3px] pointer-events-none text-left text-sm text-text-gray select-none">
              Median salary: $58,000–$94,000 early career
            </div>
            <Link
              href="/upgrade"
              className="inline-block rounded-xl bg-premium hover:opacity-90 transition-opacity text-bg font-medium px-5 py-2.5"
            >
              See Premium Plans
            </Link>
          </motion.div>
        )}

        {tab === "career" && isPremium && (
          <motion.div
            key="career-unlocked"
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="bg-card border border-border rounded-2xl p-5"
          >
            {loading && <p className="text-text-gray text-sm animate-pulse">Loading career path...</p>}
            {error && (
              <div>
                <p className="text-red text-sm mb-2">{error}</p>
                <button onClick={loadCareerPath} className="text-primary text-sm hover:text-primary-hover">
                  Retry
                </button>
              </div>
            )}
            {careerPath && (
              <div className="space-y-4">
                <p className="text-text-gray text-xs">
                  AI-generated general patterns for this major, not specific to named individuals
                  or guaranteed outcomes.
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
                  <p className="text-text font-medium text-sm mb-1">Employer types & locations</p>
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
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
