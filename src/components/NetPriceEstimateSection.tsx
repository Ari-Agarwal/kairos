"use client";

// Financial aid buildout, items 1 + 2 (Software_Timeline.md). Hard rule from
// CLAUDE.md's own design-rules note on this feature area: never gate core
// product value behind financial data entry, keep it clearly optional, and
// never show a broken/blank-looking calculator -- an inviting opt-in prompt
// instead when the student hasn't shared income data.

import { useState } from "react";
import Link from "next/link";
import InfoTooltip from "@/components/InfoTooltip";
import { estimateLoan, ASSUMED_ANNUAL_RATE, ASSUMED_REPAYMENT_YEARS, ASSUMED_PROGRAM_YEARS } from "@/lib/loan-estimate";

interface GapClosingScholarship {
  name: string;
  award_amount: string | null;
  deadline_window: string;
  source_url: string;
  fit_tier: string;
  fit_reason: string;
}

interface EstimateResponse {
  estimate: {
    low: number;
    high: number;
    aidGenerosity: "low" | "moderate" | "high" | null;
    rationale: string;
    fetchedAt: string;
  };
  stickerPrice: number | null;
  gapClosingScholarships: GapClosingScholarship[];
}

export default function NetPriceEstimateSection({
  schoolName,
  hasFinancialInfo,
}: {
  schoolName: string;
  hasFinancialInfo: boolean;
}) {
  const [data, setData] = useState<EstimateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expectedContribution, setExpectedContribution] = useState("");

  async function loadEstimate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/net-price-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolName }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to generate a cost estimate.");
        return;
      }
      setData(json as EstimateResponse);
    } catch {
      setError("Failed to generate a cost estimate. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!hasFinancialInfo) {
    return (
      <div className="bg-bg border border-dashed border-border rounded-xl p-4 mb-3">
        <p className="text-text text-sm font-medium mb-1">See your estimated cost at {schoolName}</p>
        <p className="text-text-gray text-xs leading-relaxed mb-3">
          Add your income bracket, state, and family size on your Profile, completely optional and never
          required, to see a rough estimated net price range here, tailored to your family&apos;s situation.
        </p>
        <Link
          href="/profile"
          className="inline-block rounded-lg bg-primary hover:bg-primary-hover transition-colors text-bg text-sm font-medium px-3 py-1.5"
        >
          Add financial info on Profile
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-bg border border-border rounded-xl p-4 mb-3">
      <div className="flex items-center gap-1.5 mb-1">
        <p className="text-text text-sm font-medium">Estimated cost</p>
        <InfoTooltip text="A rough AI-reasoned estimate based on your income bracket, state, and family size, not an official calculation. Actual aid varies by school and by year." />
      </div>

      {!data && !loading && (
        <button
          onClick={loadEstimate}
          className="rounded-lg bg-primary hover:bg-primary-hover transition-colors text-bg text-sm font-medium px-3 py-1.5"
        >
          See estimated cost
        </button>
      )}

      {loading && <p className="text-text-gray text-sm" aria-live="polite">Estimating your cost at {schoolName}…</p>}

      {error && (
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-red text-sm">{error}</p>
          {!error.includes("Profile") && (
            <button onClick={loadEstimate} className="text-primary hover:text-primary-hover text-xs underline underline-offset-2">
              Try again
            </button>
          )}
        </div>
      )}

      {data && (
        <div>
          <p className="font-serif text-2xl text-text mb-1">
            ${data.estimate.low.toLocaleString()}–${data.estimate.high.toLocaleString()}
            <span className="text-text-gray text-sm font-sans"> / yr</span>
          </p>
          {data.stickerPrice !== null && (
            <p className="text-text-gray text-xs mb-2">vs. ${data.stickerPrice.toLocaleString()}/yr sticker price</p>
          )}
          <p className="text-text-gray text-xs leading-relaxed mb-3">{data.estimate.rationale}</p>
          <p className="text-text-gray/70 text-xs mb-3 italic">
            This is a rough estimate, not a guarantee. For the real number, use{" "}
            <a
              href={`https://www.google.com/search?q=${encodeURIComponent(schoolName + " net price calculator")}`}
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:text-primary-hover underline underline-offset-2"
            >
              {schoolName}&apos;s official Net Price Calculator
            </a>
            , which every Title IV school is required to publish.
          </p>

          <div className="border-t border-border pt-3 mb-3">
            <div className="flex items-center gap-1.5 mb-2">
              <p className="text-text text-sm font-medium">How much might I need to borrow?</p>
              <InfoTooltip text="A rough estimate only, not financial advice. Assumes you'd borrow the same annual gap for all 4 years and repay over 10 years at an illustrative 6.5% fixed rate, your actual rate, term, and aid will differ." />
            </div>
            <label htmlFor="fa-expected-contribution" className="block text-xs text-text-gray mb-1">
              What you expect to cover yourself per year (savings, income, 529, etc.)
            </label>
            <input
              id="fa-expected-contribution"
              type="number"
              min={0}
              step={500}
              inputMode="numeric"
              placeholder="e.g. 10000"
              value={expectedContribution}
              onChange={(e) => setExpectedContribution(e.target.value)}
              className="w-full rounded-xl bg-card border border-border px-3 py-2 text-text text-sm outline-none focus:border-primary mb-2"
            />
            {expectedContribution !== "" && (() => {
              const contribution = Number(expectedContribution);
              const annualGap = data.estimate.high - contribution;
              const loan = estimateLoan(annualGap);
              if (!loan) {
                return (
                  <p className="text-text-gray text-xs">
                    Based on this, you may not need to borrow to cover the estimated cost.
                  </p>
                );
              }
              return (
                <div className="text-xs text-text-gray leading-relaxed">
                  <p className="text-text text-base font-serif mb-1">
                    ~${loan.totalLoanNeeded.toLocaleString()} total over {ASSUMED_PROGRAM_YEARS} years
                  </p>
                  <p>
                    ~${loan.monthlyPayment.toLocaleString()}/mo estimated repayment over {ASSUMED_REPAYMENT_YEARS} years at
                    an illustrative {(ASSUMED_ANNUAL_RATE * 100).toFixed(1)}% fixed rate.
                  </p>
                  <p className="italic mt-1 text-text-gray/70">
                    This is a rough planning estimate, not financial advice or a loan offer, actual loan terms,
                    rates, and your real aid package will differ.
                  </p>
                </div>
              );
            })()}
          </div>

          {data.gapClosingScholarships.length > 0 && (
            <div className="border-t border-border pt-3">
              <p className="text-text text-sm font-medium mb-2">
                Scholarships that could help close this gap
              </p>
              <ul className="space-y-2">
                {data.gapClosingScholarships.map((s) => (
                  <li key={s.name} className="text-xs">
                    <a
                      href={s.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:text-primary-hover underline underline-offset-2 font-medium"
                    >
                      {s.name}
                    </a>
                    {s.award_amount && <span className="text-text-gray">, {s.award_amount}</span>}
                    <p className="text-text-gray/80 mt-0.5">{s.fit_reason}</p>
                  </li>
                ))}
              </ul>
              <Link
                href="/scholarships"
                className="inline-block mt-2 text-primary hover:text-primary-hover text-xs underline underline-offset-2"
              >
                Browse all scholarships →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
