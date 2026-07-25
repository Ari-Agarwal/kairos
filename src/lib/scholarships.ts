import scholarshipData from "@/data/scholarships.json";

export interface Scholarship {
  name: string;
  organization: string;
  eligibility_summary: string;
  award_amount?: string;
  deadline_window: string;
  source_url: string;
}

export interface ScholarshipProfile {
  first_gen: boolean | null;
  financial_aid_need: boolean | null;
  intended_major: string[] | null;
  extracurriculars: string[] | null;
}

const MAJOR_KEYWORDS: Record<string, string[]> = {
  "computer science": ["computer science", "computer engineering", "technical field", "technology"],
  engineering: ["engineering", "technical field"],
  business: ["business", "marketing", "finance", "entrepreneurship", "deca", "fbla", "accounting", "retail"],
  education: ["education", "teacher", "teaching", "educator"],
  "visual/performing arts": ["art", "arts", "writing", "visual", "performing", "music", "design", "graphic"],
  journalism: ["journalism", "media", "communications", "communication"],
  psychology: ["psychology", "behavioral science", "mental health"],
  "social work": ["social work"],
  nursing: ["nursing", "health-science", "health science", "pre-med"],
  "environmental science": ["environmental", "meteorology", "atmospheric science", "hydrology"],
  agriculture: ["agriculture", "agribusiness", "agronomy", "animal science"],
  "political science": ["law school", "pre-law", "political science"],
  architecture: ["architecture"],
  mathematics: ["mathematics", "statistics", "actuarial"],
};

// Business/Education/Humanities & Arts added (Jul 17, follow-up to the
// original "STEM & Major-Specific" naming fix) -- previously only STEM had
// any major-specific scholarships in this dataset, so sorting by major left
// every other major with an empty or near-empty list.
export const SCHOLARSHIP_CATEGORIES = [
  "STEM & Technical",
  "Business & Professional",
  "Education",
  "Humanities & Arts",
  "Identity & Community",
  "Military & Family",
  "Need-Based",
  "Easy Apply",
  "Merit & Achievement",
] as const;
export type ScholarshipCategory = (typeof SCHOLARSHIP_CATEGORIES)[number];

// Since students aren't going to read all 40+ of these, bucket each into one
// category (priority order below) so the list can be browsed by type instead
// of scrolled top to bottom. Heuristic on eligibility_summary/name text --
// same "never hide, just help triage" philosophy as isLikelyMatch.
export function getCategory(scholarship: Scholarship): ScholarshipCategory {
  const text = `${scholarship.name} ${scholarship.eligibility_summary}`.toLowerCase();

  if (/engineering|computer science|technology|technical field|stem\b/.test(text)) {
    return "STEM & Technical";
  }
  // Deliberately excludes "entrepreneurship" alone -- it previously caught the
  // Ron Brown Scholar Program (a general public-service scholarship) purely
  // because its eligibility text lists entrepreneurship as one of several
  // interest areas, not because it's actually a business-major scholarship.
  if (/\bdeca\b|\bfbla\b|\bbusiness\b|\bmarketing\b|\bfinance\b/.test(text)) {
    return "Business & Professional";
  }
  if (/\beducation\b|\bteacher\b|\bteaching\b|educator/.test(text)) {
    return "Education";
  }
  // Journalism/media/literature/arts majors were previously caught by the STEM
  // regex above (a "technology/media" keyword collision), which buried the one
  // non-STEM major-specific scholarship in this dataset (NABJ) inside "STEM."
  if (/journalism|media\b|literature|creative writing|\bart\b|\barts\b|music\b/.test(text)) {
    return "Humanities & Arts";
  }
  if (/hispanic|african american|black|native american|american indian|lgbtq|women\b|disability|first-generation/.test(text)) {
    return "Identity & Community";
  }
  if (/rotc|military|veteran|service member|first responder/.test(text)) {
    return "Military & Family";
  }
  if (/financial need|need-based|low-income|pell|household income/.test(text)) {
    return "Need-Based";
  }
  if (/no essay|no gpa|sweepstakes|ongoing entry|entry period/.test(text)) {
    return "Easy Apply";
  }
  return "Merit & Achievement";
}

export function getAllScholarships(): Scholarship[] {
  return scholarshipData.scholarships as Scholarship[];
}

// Data-freshness surfacing (Software_Timeline.md 6g) -- the dataset already
// carries a verified_date in its own _meta block; this was never actually
// shown to students.
export function getScholarshipDataVerifiedDate(): string | null {
  return (scholarshipData as { _meta?: { verified_date?: string } })._meta?.verified_date ?? null;
}

// Heuristic-only "does this look relevant to you" flag -- deliberately never
// hides a scholarship outright, since a false negative here costs a student
// real money in a way a false positive doesn't.
export function isLikelyMatch(scholarship: Scholarship, profile: ScholarshipProfile): boolean {
  return getMatchReason(scholarship, profile) !== null;
}

// Same heuristic as isLikelyMatch, but returns *why* -- "likely match" tagging
// previously had no visible rationale, so a student had no way to tell if it
// was a good guess or a coin flip.
export function getMatchReason(scholarship: Scholarship, profile: ScholarshipProfile): string | null {
  return getMatchFactors(scholarship, profile)[0] ?? null;
}

// Every independent, legible reason the profile lines up with this
// scholarship's stated eligibility -- unlike getMatchReason (first hit only),
// this collects all of them so getFitTier can tell "one coincidental overlap"
// apart from "multiple independent eligibility factors confirmed."
function getMatchFactors(scholarship: Scholarship, profile: ScholarshipProfile): string[] {
  const text = scholarship.eligibility_summary.toLowerCase();
  const factors: string[] = [];

  if (profile.first_gen === true && (text.includes("first-generation") || text.includes("financial need") || text.includes("low-income"))) {
    factors.push("You indicated you're a first-generation student, and this scholarship considers that.");
  }
  if (profile.financial_aid_need === true && (text.includes("financial need") || text.includes("need-based") || text.includes("low-income") || text.includes("pell"))) {
    factors.push("You indicated financial need, and this scholarship is need-based.");
  }
  const majorMatch = profile.intended_major?.find((m) => {
    const major = m.toLowerCase();
    return Object.entries(MAJOR_KEYWORDS).some(
      ([key, keywords]) => major.includes(key) && keywords.some((k) => text.includes(k))
    );
  });
  if (majorMatch) {
    factors.push(`Your intended major (${majorMatch}) lines up with this scholarship's eligibility.`);
  }
  if (profile.extracurriculars?.some((ec) => text.includes("rotc") && ec.toLowerCase().includes("rotc"))) {
    factors.push("Your ROTC activity matches this scholarship's eligibility.");
  }
  return factors;
}

export type FitTier = "Strong Fit" | "Possible" | "Reach";

export interface FitAssessment {
  tier: FitTier;
  reason: string;
}

// A rough, legible fit tier mirroring how school matches reason about
// reach/target/safety fit -- built on the same eligibility factors as
// getMatchReason/isLikelyMatch above (never a hidden AI guess), just graduated
// instead of a single true/false "likely match" flag. "Reach" here means
// eligibility is genuinely ambiguous from what we know, not "hard to win" --
// deliberately never tells a student they're ineligible, since a false
// negative costs real money in a way a false positive doesn't.
export function getFitTier(scholarship: Scholarship, profile: ScholarshipProfile): FitAssessment {
  const factors = getMatchFactors(scholarship, profile);
  if (factors.length >= 2) {
    return { tier: "Strong Fit", reason: factors.join(" ") };
  }
  if (factors.length === 1) {
    return { tier: "Possible", reason: factors[0] };
  }
  return {
    tier: "Reach",
    reason: "Nothing in your profile confirms eligibility here, check the source link for the exact requirements.",
  };
}

const MONTH_ORDER: Record<string, number> = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
};

// deadline_window is free text ("February–March", "Early October of senior
// year"), not a structured date -- extract the first month mentioned as a
// rough sort key. Unparseable windows (e.g. "Applications open summer, board
// review through early spring") sort last, not first, so they don't falsely
// look like the most urgent deadlines.
export function deadlineSortKey(deadlineWindow: string): number {
  const text = deadlineWindow.toLowerCase();
  for (const [name, index] of Object.entries(MONTH_ORDER)) {
    if (text.includes(name)) return index;
  }
  return 99;
}

export type GradeLevel = "Freshman" | "Sophomore" | "Junior" | "Senior";

const GRADE_RANK: Record<GradeLevel, number> = { Freshman: 0, Sophomore: 1, Junior: 2, Senior: 3 };

// Most scholarships in this dataset are written for "graduating high school
// seniors" -- but a handful explicitly open earlier (sophomore/junior-track
// programs like Goldwater/Udall, or open-to-all essay contests). Detect the
// earliest grade a student could actually act on this scholarship from its
// own eligibility text, so a sophomore doesn't see a senior-only scholarship
// as something to do right now.
export function getEligibleGrade(scholarship: Scholarship): GradeLevel {
  const text = `${scholarship.name} ${scholarship.eligibility_summary}`.toLowerCase();
  if (/sophomore\/junior|sophomore or junior|rising sophomore\/junior/.test(text)) return "Sophomore";
  if (/\bjunior\b/.test(text) && !/\bsenior\b/.test(text)) return "Junior";
  if (/\bsophomore\b/.test(text) && !/\bsenior\b/.test(text) && !/\bjunior\b/.test(text)) return "Sophomore";
  if (/\bsenior\b|graduating high school|high school senior/.test(text)) return "Senior";
  // No grade restriction detected (e.g. local Dollars for Scholars chapters,
  // open essay contests) -- treat as actionable at any grade.
  return "Freshman";
}

// This scholarship's deadline is only immediately actionable once the
// student has reached the grade it requires -- used to keep grade-locked
// scholarships (e.g. senior-only) from showing up as due-now items for an
// underclassman.
export function isGradeEligibleNow(scholarship: Scholarship, currentGrade: GradeLevel): boolean {
  return GRADE_RANK[currentGrade] >= GRADE_RANK[getEligibleGrade(scholarship)];
}

// Turns a free-text deadline_window plus the student's current grade level
// into a real calendar date so the scholarship can be inserted into the
// timeline at the right point instead of always appended to the bottom.
// If the student isn't grade-eligible yet (e.g. a senior-only scholarship
// seen by a sophomore), the date is projected forward to the application
// cycle of the grade they'll actually need to be in, so it lands further
// down the timeline as a future item rather than as something actionable now.
export function estimateScholarshipDueDate(
  scholarship: Scholarship,
  currentGrade: GradeLevel,
  today: Date = new Date()
): string {
  const monthIndex = (() => {
    const text = scholarship.deadline_window.toLowerCase();
    for (const [name, index] of Object.entries(MONTH_ORDER)) {
      if (text.includes(name)) return index;
    }
    return null;
  })();

  const requiredGrade = getEligibleGrade(scholarship);
  const yearsUntilEligible = Math.max(0, GRADE_RANK[requiredGrade] - GRADE_RANK[currentGrade]);

  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  if (monthIndex === null) {
    // Unparseable window -- place it a year out per grade gap so it still
    // sorts sensibly rather than defaulting to "no date" (bottom of list).
    const d = new Date(currentYear + yearsUntilEligible, currentMonth, 1);
    return d.toISOString().slice(0, 10);
  }

  let targetYear = currentYear + yearsUntilEligible;
  // If eligible now (no grade gap) and the deadline month already passed
  // this year, roll to next year's cycle instead of a date in the past.
  if (yearsUntilEligible === 0 && monthIndex < currentMonth) {
    targetYear += 1;
  }

  const d = new Date(targetYear, monthIndex, 1);
  return d.toISOString().slice(0, 10);
}
