import Anthropic from "@anthropic-ai/sdk";

let anthropicInstance: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (!anthropicInstance) {
    anthropicInstance = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropicInstance;
}

export const MODEL = "claude-sonnet-5";

const CATEGORY_DEFINITION: Record<"reach" | "target" | "safety", string> = {
  reach:
    "admission is a stretch for this student — their profile sits at or below the typical admitted student, so acceptance is uncertain even for a strong applicant",
  target:
    "the student's profile is squarely in line with the typical admitted student — a realistic admit that is likely but not guaranteed",
  safety:
    "the student's profile is comfortably above the typical admitted student, so admission is very likely",
};

// One category at a time (reach/target/safety). The three calls run in
// parallel from the route so the full 15-school list generates in ~1/3 the
// wall-clock of a single 15-school request.
export function schoolMatchingPrompt(category: "reach" | "target" | "safety"): string {
  return `You are generating the "${category}" portion of a college match list for a high school student. You will be given their GPA, grade level, intended major, extracurriculars, the schools they're already considering, and test scores. Some of these fields may be missing; if so, you will be told explicitly which ones are missing.

Return exactly 5 schools, ALL categorized as "${category}" for this specific student. A "${category}" school means: ${CATEGORY_DEFINITION[category]}.

Use real, accurate, currently-operating colleges and universities only. Never invent a school name. Ground every percentage in that school's actual published acceptance rate and the typical admitted-student profile (GPA range, test scores, course rigor), not an arbitrary or rounded-looking number — and make sure the school genuinely falls in the "${category}" band for THIS student's profile. If you are not confident in a school's real acceptance data, choose a different, well-known school instead of guessing.

If the student listed schools they're already considering, treat those as strong signal about their taste (selectivity level, size, region, etc.) and use that signal, but do not simply repeat their list back. Favor a mix of school types (size, region, public/private) across the 5 rather than 5 near-identical schools, unless the student's profile clearly points to a narrow type they want.

For each school, return:
- name: the school's full name
- category: "${category}"
- percentage: an estimated admission percentage as an integer, grounded in that school's real general acceptance rate and typical admitted student profile (GPA range, test scores, etc.), not an arbitrary number
- why_text: one sentence explaining why this school was matched, explicitly referencing the specific student input it's based on
- factors: an object containing four fields: gpa_comparison, course_rigor, ec_strength, major_fit. Each field's value must be a short assessment that ends with one constructive, forward-looking sentence. Never end a factor assessment purely diagnostically.

If any input field needed to assess a given factor is missing, explicitly state in that factor's value which input was unavailable, and do not fabricate an assessment for it.

Return your response as JSON matching this exact structure:
{
  "schools": [
    {
      "name": "string",
      "category": "${category}",
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
}

// The timeline is generated as two independent halves (logistics + strategic
// advice) that the route runs in parallel, so the whole timeline returns in
// roughly the wall-clock of the slower half instead of one long request.
export const LOGISTICS_PROMPT = `You are generating ONLY the "logistics" section of a personalized college admissions timeline for a high school student, given their full profile and their list of currently matched schools (with names and categories).

"logistics" = concrete deadlines and requirements merged across the student's matched schools. Consolidate any deadline shared by multiple schools into a single entry rather than duplicating it once per school. Flag deadlines that are unique to a specific school as individual entries.

Ground every deadline in real, standard college-admissions timing for that application type (e.g. Early Action/Early Decision around Nov 1, Regular Decision around Jan 1, FAFSA opens Oct 1, financial aid deadlines typically follow shortly after admissions deadlines, fall semester standardized testing windows). If you do not know a specific school's exact published deadline, use the standard timing for that application round rather than inventing a precise date you're not confident in. Anchor dates relative to the student's grade level (e.g. a sophomore's timeline should be lighter on application deadlines and heavier on prep than a senior's).

Return AT MOST 8 logistics items, ordered most time-sensitive first.

Each item must include: title, due_date (string "YYYY-MM-DD" or null), school_tags (array, can be empty), why_text (ONE sentence, referencing actual schools/goals where relevant), what_to_do (array of exactly 2-3 concrete sub-steps, each a specific action, not a restatement of the title).

Return your response as JSON matching this exact structure:
{
  "logistics": [
    { "title": "string", "due_date": "YYYY-MM-DD" | null, "school_tags": ["string"], "why_text": "string", "what_to_do": ["string"] }
  ]
}`;

export const STRATEGIC_PROMPT = `You are generating ONLY the "strategic_advice" section of a personalized college admissions timeline for a high school student, given their full profile and their list of currently matched schools (with names and categories).

"strategic_advice" = proactive, non-deadline-driven recommendations (such as specific coursework, internships, projects, or extracurricular activities) tailored specifically to the student's grade level and intended major. Prefer concrete, actionable recommendations (a specific type of activity, club, course, or project) over generic advice like "stay involved" or "work hard."

Return AT MOST 6 items.

Each item must include: title, due_date (always null, no exceptions), school_tags (array, can be empty), why_text (ONE sentence, referencing actual schools/goals where relevant), what_to_do (array of exactly 2-3 concrete sub-steps, each a specific action, not a restatement of the title).

Return your response as JSON matching this exact structure:
{
  "strategic_advice": [
    { "title": "string", "due_date": null, "school_tags": ["string"], "why_text": "string", "what_to_do": ["string"] }
  ]
}`;

export const ESSAY_FEEDBACK_PROMPT = `You are reviewing a college application essay draft written by a high school student. Your role is to give direct, honest feedback that challenges the student to be more specific and authentic in their writing, rather than offering generic praise or vague encouragement.

Specifically look for: generic phrases that any applicant could have written, unearned or unsupported emotional claims, places where the student is summarizing an experience rather than showing a specific moment from it, clichéd or overused essay topics/openings, a weak or unclear connecting thread between anecdote and the larger point, and any other instances of vague or surface-level writing.

Base every piece of feedback strictly on what is actually written in the draft below. Quote or closely paraphrase the specific sentence or phrase you're responding to so the student knows exactly what to revise. Never invent details about the student's life or assume facts not present in the draft.

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
