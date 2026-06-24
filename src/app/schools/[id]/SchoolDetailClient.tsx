"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";

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

      <div className="w-full h-40 rounded-2xl bg-card border border-border mb-4 flex items-center justify-center text-text-gray text-sm">
        Photo placeholder
      </div>

      <h1 className="font-serif text-2xl text-text mb-4">{match.school_name}</h1>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab("info")}
          className={`text-sm px-4 py-2 rounded-xl ${tab === "info" ? "bg-primary text-white" : "bg-card border border-border text-text-gray"}`}
        >
          Info
        </button>
        <button
          onClick={() => {
            setTab("career");
            if (isPremium) loadCareerPath();
          }}
          className={`text-sm px-4 py-2 rounded-xl ${tab === "career" ? "bg-primary text-white" : "bg-card border border-border text-text-gray"}`}
        >
          Career Path
        </button>
      </div>

      {tab === "info" && (
        <div className="bg-card border border-border rounded-2xl p-5">
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
        </div>
      )}

      {tab === "career" && !isPremium && (
        <div className="bg-premium-tint border border-border rounded-2xl p-6 text-center">
          <Lock className="text-premium w-7 h-7 mx-auto mb-2" />
          <p className="text-text font-medium mb-1">Career Path is a Premium feature</p>
          <p className="text-text-gray text-sm mb-4">
            See typical internships, employer types, and salary patterns for your major at this
            school.
          </p>
          <div className="bg-card border border-border rounded-xl p-4 mb-4 opacity-40 pointer-events-none text-left text-sm text-text-gray">
            Median salary: $XX,XXX–$XX,XXX early career
          </div>
          <Link
            href="/upgrade"
            className="inline-block rounded-xl bg-premium hover:opacity-90 transition-opacity text-white font-medium px-5 py-2.5"
          >
            See Premium Plans
          </Link>
        </div>
      )}

      {tab === "career" && isPremium && (
        <div className="bg-card border border-border rounded-2xl p-5">
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
        </div>
      )}
    </div>
  );
}
