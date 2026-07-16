import { createServiceClient } from "@/lib/supabase/server";

const API_BASE = "https://api.data.gov/ed/collegescorecard/v1/schools";
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days — this data changes yearly at most

export interface CollegeStats {
  acceptanceRate: number | null; // 0-1
  enrollment: number | null;
  ownership: string | null;
  avgNetPrice: number | null; // school-wide average net price after aid (USD/yr)
  costOfAttendance: number | null; // sticker-price cost of attendance (USD/yr)
  medianDebt: number | null; // median federal debt at completion (USD)
  medianEarnings10yr: number | null; // median earnings 10 yrs after entry, school-wide (USD/yr)
}

const OWNERSHIP_LABELS: Record<number, string> = {
  1: "Public",
  2: "Private nonprofit",
  3: "Private for-profit",
};

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

function bareName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// College Scorecard's name search is a loose text match, not a lookup — it
// happily returns an unrelated US school (or nothing meaningful) for a
// query it doesn't actually cover, e.g. any non-US institution like
// "University of Oxford". Reject anything that isn't a close match rather
// than trust results[0] blindly and show wrong numbers under the right name.
function namesMatch(query: string, result: string): boolean {
  const q = bareName(query);
  const r = bareName(result);
  return q === r || q.includes(r) || r.includes(q);
}

async function fetchFromScorecard(schoolName: string): Promise<CollegeStats | null> {
  // DEMO_KEY works out of the box but is rate-limited (30/hr, 50/day) — set
  // COLLEGE_SCORECARD_API_KEY (free, instant at api.data.gov/signup) for
  // production traffic.
  const apiKey = process.env.COLLEGE_SCORECARD_API_KEY || "DEMO_KEY";
  const params = new URLSearchParams({
    "school.name": schoolName,
    fields: [
      "school.name",
      "latest.student.size",
      "latest.admissions.admission_rate.overall",
      "school.ownership",
      "latest.cost.avg_net_price.overall",
      "latest.cost.attendance.academic_year",
      "latest.aid.median_debt.completers.overall",
      "latest.earnings.10_yrs_after_entry.median",
    ].join(","),
    per_page: "1",
    api_key: apiKey,
  });

  const res = await fetch(`${API_BASE}?${params}`);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`College Scorecard request URL: ${API_BASE}?${params.toString().replace(apiKey, "REDACTED")}`);
    console.error(`College Scorecard error body: ${body.slice(0, 500)}`);
    throw new Error(`College Scorecard API returned ${res.status}`);
  }

  const data = await res.json();
  const result = data?.results?.[0];
  if (!result) {
    console.error(`College Scorecard: zero results for query="${schoolName}" (total=${data?.metadata?.total ?? "?"})`);
    return null;
  }

  const matchedName = result["school.name"];
  if (typeof matchedName !== "string" || !namesMatch(schoolName, matchedName)) {
    console.error(`College Scorecard name mismatch: query="${schoolName}" best-guess="${matchedName}" — rejected`);
    return null; // Scorecard's best guess isn't actually this school (e.g. non-US institution) — don't show it as if it were.
  }

  return {
    acceptanceRate: result["latest.admissions.admission_rate.overall"] ?? null,
    enrollment: result["latest.student.size"] ?? null,
    ownership: OWNERSHIP_LABELS[result["school.ownership"]] ?? null,
    avgNetPrice: result["latest.cost.avg_net_price.overall"] ?? null,
    costOfAttendance: result["latest.cost.attendance.academic_year"] ?? null,
    medianDebt: result["latest.aid.median_debt.completers.overall"] ?? null,
    medianEarnings10yr: result["latest.earnings.10_yrs_after_entry.median"] ?? null,
  };
}

// Cached in Supabase (keyed by normalized school name, shared across all
// students) so we don't re-hit the rate-limited Scorecard API on every page
// view. Returns null both when the school genuinely has no Scorecard match
// and when the lookup itself fails — callers fall back to the "no verified
// stats" message either way.
export async function getCollegeStats(schoolName: string): Promise<CollegeStats | null> {
  const key = normalizeName(schoolName);
  const supabase = createServiceClient();

  const { data: cached, error: cachedError } = await supabase
    .from("college_stats_cache")
    .select("*")
    .eq("school_name", key)
    .maybeSingle();

  if (cachedError) console.error("getCollegeStats cache query failed:", cachedError);

  const isFresh = cached && Date.now() - new Date(cached.fetched_at).getTime() < CACHE_TTL_MS;
  if (isFresh) {
    return cached.found
      ? {
          acceptanceRate: cached.acceptance_rate,
          enrollment: cached.enrollment,
          ownership: cached.ownership,
          avgNetPrice: cached.avg_net_price ?? null,
          costOfAttendance: cached.cost_of_attendance ?? null,
          medianDebt: cached.median_debt ?? null,
          medianEarnings10yr: cached.median_earnings_10yr ?? null,
        }
      : null;
  }

  let stats: CollegeStats | null = null;
  try {
    stats = await fetchFromScorecard(schoolName);
  } catch (err) {
    console.error("College Scorecard lookup failed:", err);
    // Fall back to stale cache rather than nothing, if we have it.
    if (cached) {
      return cached.found
        ? {
            acceptanceRate: cached.acceptance_rate,
            enrollment: cached.enrollment,
            ownership: cached.ownership,
            avgNetPrice: cached.avg_net_price ?? null,
            costOfAttendance: cached.cost_of_attendance ?? null,
            medianDebt: cached.median_debt ?? null,
            medianEarnings10yr: cached.median_earnings_10yr ?? null,
          }
        : null;
    }
    return null;
  }

  await supabase.from("college_stats_cache").upsert({
    school_name: key,
    acceptance_rate: stats?.acceptanceRate ?? null,
    enrollment: stats?.enrollment ?? null,
    ownership: stats?.ownership ?? null,
    avg_net_price: stats?.avgNetPrice ?? null,
    cost_of_attendance: stats?.costOfAttendance ?? null,
    median_debt: stats?.medianDebt ?? null,
    median_earnings_10yr: stats?.medianEarnings10yr ?? null,
    found: stats !== null,
    fetched_at: new Date().toISOString(),
  });

  return stats;
}
