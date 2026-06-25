"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as const;

interface Match {
  id: string;
  school_name: string;
  category: string;
}

interface CareerPath {
  internships: string[];
  employer_types: string[];
  median_salary: string;
  summary: string;
}

export default function SchoolDetailClient({ match, isPremium }: { match: Match; isPremium: boolean }) {
  const [tab, setTab] = useState<"info" | "career">("info");
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
        {(["info", "career"] as const).map((t) => (
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
            <span className="relative z-10">{t === "info" ? "Info" : "Career Path"}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === "info" && (
          <motion.div
            key="info"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="bg-card border border-border rounded-2xl p-5"
          >
            <div className="grid grid-cols-3 gap-4 mb-4 text-center">
              <div>
                <p className="text-text font-serif text-lg">~35%</p>
                <p className="text-text-gray text-xs">Acceptance rate</p>
              </div>
              <div>
                <p className="text-text font-serif text-lg">1880s</p>
                <p className="text-text-gray text-xs">Founded</p>
              </div>
              <div>
                <p className="text-text font-serif text-lg">~12,000</p>
                <p className="text-text-gray text-xs">Population</p>
              </div>
            </div>
            <p className="text-text-gray text-sm leading-relaxed">
              {match.school_name} is known for a strong academic community and a broad range of
              programs. Students often describe the campus culture as collaborative, with active
              student life and research opportunities across departments.
            </p>
          </motion.div>
        )}

        {tab === "career" && !isPremium && (
          <motion.div
            key="career-locked"
            initial={{ opacity: 0, y: 6 }}
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
            initial={{ opacity: 0, y: 6 }}
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
