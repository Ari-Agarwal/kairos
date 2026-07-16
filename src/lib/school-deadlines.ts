import deadlineData from "@/data/school-deadlines.json";

export interface SchoolDeadline {
  school_name: string;
  ed_deadline?: string;
  ed2_deadline?: string;
  ea_deadline?: string;
  rea_deadline?: string;
  rd_deadline?: string;
}

const ALIASES: Record<string, string> = {
  "uc berkeley": "University of California, Berkeley",
  "berkeley": "University of California, Berkeley",
  "cal": "University of California, Berkeley",
  "ucla": "University of California, Los Angeles",
  "uc los angeles": "University of California, Los Angeles",
  "georgia tech": "Georgia Institute of Technology",
  "mit": "Massachusetts Institute of Technology",
  "nyu": "New York University",
  "usc": "University of Southern California",
  "uchicago": "University of Chicago",
  "wustl": "Washington University in St. Louis",
  "wash u": "Washington University in St. Louis",
  "notre dame": "University of Notre Dame",
  "cmu": "Carnegie Mellon University",
};

function normalize(name: string): string {
  return name.trim().toLowerCase().replace(/[.,]/g, "");
}

const byNormalizedName = new Map<string, SchoolDeadline>(
  (deadlineData.schools as SchoolDeadline[]).map((s) => [normalize(s.school_name), s])
);

// Real, source-verified ED/EA/RD deadlines for the ~35 schools most commonly
// matched. Anything not found here isn't guessed at -- callers should fall
// back to the AI's general (explicitly labeled) deadline patterns instead.
export function getSchoolDeadline(schoolName: string): SchoolDeadline | null {
  const key = normalize(ALIASES[normalize(schoolName)] ?? schoolName);
  return byNormalizedName.get(key) ?? null;
}

export function getAllKnownSchoolNames(): string[] {
  return (deadlineData.schools as SchoolDeadline[]).map((s) => s.school_name);
}
