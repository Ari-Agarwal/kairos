import interviewData from "@/data/interview-patterns.json";

export interface SchoolInterviewPattern {
  school_name: string;
  format: string;
  notes: string;
}

// Backing database of per-school mock-interview format/pattern notes
// (Software_Timeline.md item 22), so mock interview questions can be
// grounded in real per-school patterns when a student practices for a
// specific school, instead of being fully generic. Seed set covers a
// subset of src/data/school-deadlines.json's schools; case-insensitive,
// trimmed match, returns null (never a guess) when the school isn't
// covered yet.
export function getSchoolInterviewPattern(schoolName: string): SchoolInterviewPattern | null {
  const target = schoolName.trim().toLowerCase();
  const schools = (interviewData as { schools: SchoolInterviewPattern[] }).schools;
  return schools.find((s) => s.school_name.toLowerCase() === target) ?? null;
}
