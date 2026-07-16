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
  intended_major: string | null;
  extracurriculars: string[] | null;
}

const MAJOR_KEYWORDS: Record<string, string[]> = {
  "computer science": ["computer science", "computer engineering", "technical field", "technology"],
  engineering: ["engineering", "technical field"],
};

export const SCHOLARSHIP_CATEGORIES = [
  "STEM & Major-Specific",
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

  if (/engineering|computer science|technology|technical field|journalism|media|stem\b/.test(text)) {
    return "STEM & Major-Specific";
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

// Heuristic-only "does this look relevant to you" flag -- deliberately never
// hides a scholarship outright, since a false negative here costs a student
// real money in a way a false positive doesn't.
export function isLikelyMatch(scholarship: Scholarship, profile: ScholarshipProfile): boolean {
  const text = scholarship.eligibility_summary.toLowerCase();

  if (profile.first_gen === true && (text.includes("first-generation") || text.includes("financial need") || text.includes("low-income"))) {
    return true;
  }
  if (profile.financial_aid_need === true && (text.includes("financial need") || text.includes("need-based") || text.includes("low-income") || text.includes("pell"))) {
    return true;
  }
  if (profile.intended_major) {
    const major = profile.intended_major.toLowerCase();
    for (const [key, keywords] of Object.entries(MAJOR_KEYWORDS)) {
      if (major.includes(key) && keywords.some((k) => text.includes(k))) return true;
    }
  }
  if (profile.extracurriculars?.some((ec) => text.includes("rotc") && ec.toLowerCase().includes("rotc"))) {
    return true;
  }
  return false;
}
