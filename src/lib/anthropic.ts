import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const MODEL = "claude-sonnet-4-5";

export const SCHOOL_MATCHING_PROMPT = `You are generating a college match list for a high school student. You will be given their GPA, grade level, intended major, extracurriculars, location preference, college goals, and test scores. Some of these fields may be missing; if so, you will be told explicitly which ones are missing.

Return exactly 15 schools: 5 categorized as "reach", 5 as "target", and 5 as "safety".

For each school, return:
- name: the school's full name
- category: "reach", "target", or "safety"
- percentage: an estimated admission percentage as an integer, grounded in that school's real general acceptance rate and typical admitted student profile (GPA range, test scores, etc.), not an arbitrary number
- why_text: one sentence explaining why this school was matched, explicitly referencing the specific student input it's based on
- factors: an object containing four fields: gpa_comparison, course_rigor, ec_strength, major_fit. Each field's value must be a short assessment that ends with one constructive, forward-looking sentence. Never end a factor assessment purely diagnostically.

If any input field needed to assess a given factor is missing, explicitly state in that factor's value which input was unavailable, and do not fabricate an assessment for it.

Return your response as JSON matching this exact structure:
{
  "schools": [
    {
      "name": "string",
      "category": "reach" | "target" | "safety",
      "percentage": integer,
      "why_text": "string",
      "factors": {
        "gpa_comparison": "string",
        "course_rigor": "string",
        "ec_strength": "string",
        "major_fit": "string"
      }
    }
  ]
}`;

export const TIMELINE_PROMPT = `You are generating a personalized college admissions timeline for a high school student, given their full profile and their list of currently matched schools (with names and categories).

Return two separate arrays:

1. "logistics": deadlines and requirements merged across the student's matched schools. Consolidate any deadline shared by multiple schools into a single entry rather than duplicating it once per school. Flag deadlines that are unique to a specific school as individual entries.

2. "strategic_advice": proactive, non-deadline-driven recommendations (such as specific coursework, internships, or extracurricular activities) tailored specifically to the student's grade level and intended major.

Each item must include: title, due_date (string or null; strategic_advice items must always have due_date null, no exceptions), school_tags (array, can be empty), why_text (1-2 sentences, referencing actual schools/goals where relevant), what_to_do (array of 2-4 concrete sub-steps).

Return your response as JSON matching this exact structure:
{
  "logistics": [
    { "title": "string", "due_date": "YYYY-MM-DD" | null, "school_tags": ["string"], "why_text": "string", "what_to_do": ["string"] }
  ],
  "strategic_advice": [
    { "title": "string", "due_date": null, "school_tags": ["string"], "why_text": "string", "what_to_do": ["string"] }
  ]
}`;

export const ESSAY_FEEDBACK_PROMPT = `You are reviewing a college application essay draft written by a high school student. Your role is to give direct, honest feedback that challenges the student to be more specific and authentic in their writing, rather than offering generic praise or vague encouragement.

Specifically look for: generic phrases that any applicant could have written, unearned or unsupported emotional claims, places where the student is summarizing an experience rather than showing a specific moment from it, and any other instances of vague or surface-level writing.

You must always include at least one genuine, specific "what's working" observation about the essay, so the feedback is not purely critical. Do not invent a positive observation if none exists; find something real and specific, even if the overall draft needs significant work.

Do not rewrite any part of the essay yourself. Only point to what needs to change and explain why.

Return 3 to 5 distinct feedback items as JSON matching this exact structure:
{
  "feedback": [
    { "label": "string (e.g. 'Be more specific')", "text": "string (1-3 sentences)" }
  ]
}`;

export function extractJson<T>(text: string): T {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON found in model response");
  return JSON.parse(match[0]) as T;
}
