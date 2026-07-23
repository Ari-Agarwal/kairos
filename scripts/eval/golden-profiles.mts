// Golden-set of representative student profiles for the AI-output eval
// harness (Software_Timeline.md Section 6a). Deliberately spans distinct
// scenarios rather than random variation, so a prompt-change regression on
// any one of these axes is caught: strong-stats/no-flags, thin-data/
// first-gen, international, transfer, and undecided-major.
//
// Kept intentionally small (5) -- this is meant to catch obvious
// regressions cheaply on every prompt change, not to be a statistically
// exhaustive sample. Grow it if a real regression slips through one that
// isn't represented here.

export interface GoldenProfile {
  key: string;
  description: string;
  unweighted_gpa: number;
  weighted_gpa: number | null;
  intended_major: string[];
  extracurriculars: string[];
  sat_score: number | null;
  act_score: number | null;
  class_rank: string | null;
  ap_ib_count: number | null;
  career_goals: string | null;
  geographic_pref: string | null;
  financial_aid_need: boolean | null;
  budget_ceiling: number | null;
  first_gen: boolean | null;
  legacy_school: string | null;
  internships_research: string | null;
  campus_size_pref: string[];
  campus_setting_pref: string[];
  applicant_type: string | null;
  accessibility_pref: string | null;
  schools_already_considering: string | null;
  essay_draft: string;
  narrative_answers: Record<string, string>;
}

export const GOLDEN_PROFILES: GoldenProfile[] = [
  {
    key: "strong-stats-no-flags",
    description: "High GPA/scores, no first-gen/international/accessibility flags -- baseline case",
    unweighted_gpa: 3.95,
    weighted_gpa: 4.6,
    intended_major: ["Computer Science"],
    extracurriculars: ["Varsity debate captain, 3 years", "Robotics club lead programmer, 2 years"],
    sat_score: 1540,
    act_score: null,
    class_rank: "Top 5%",
    ap_ib_count: 8,
    career_goals: "Software engineer, interested in AI safety research",
    geographic_pref: "No strong preference",
    financial_aid_need: false,
    budget_ceiling: null,
    first_gen: false,
    legacy_school: null,
    internships_research: "Summer research assistant, university CS lab",
    campus_size_pref: ["Medium", "Large"],
    campus_setting_pref: ["Urban", "Suburban"],
    applicant_type: null,
    accessibility_pref: null,
    schools_already_considering: "MIT, Carnegie Mellon",
    essay_draft:
      "I have always loved computers ever since I was young. Coding has taught me so much about problem solving and perseverance. I want to study computer science because I am passionate about technology and want to make a difference in the world.",
    narrative_answers: {
      moment: "The first time my robotics team's code actually worked at competition, after weeks of failed builds.",
      revealed: "That I care more about the process of debugging with my team than about winning.",
      pattern: "I keep gravitating toward roles where I'm the one untangling a broken system, not just building a new one.",
      struggle: "Learning to ask teammates for help instead of trying to fix everything alone at 1am before a competition.",
      differentiator: "Most CS-interested applicants talk about building; I talk about fixing what's already broken.",
      direction: "I want to work on AI safety, where the job is largely about catching what's broken before it ships.",
    },
  },
  {
    key: "thin-data-first-gen",
    description: "Missing test scores, first-gen, financial need -- tests low-confidence + first-gen handling",
    unweighted_gpa: 3.4,
    weighted_gpa: null,
    intended_major: ["Undecided"],
    extracurriculars: ["Part-time job at family restaurant, 20 hrs/week"],
    sat_score: null,
    act_score: null,
    class_rank: null,
    ap_ib_count: 1,
    career_goals: null,
    geographic_pref: "Within driving distance of Chicago",
    financial_aid_need: true,
    budget_ceiling: 15000,
    first_gen: true,
    legacy_school: null,
    internships_research: null,
    campus_size_pref: ["Small", "Medium"],
    campus_setting_pref: ["Suburban"],
    applicant_type: null,
    accessibility_pref: null,
    schools_already_considering: null,
    essay_draft:
      "Working at my family's restaurant every weekend taught me about hard work.",
    narrative_answers: {
      moment: "Covering a double shift alone when my dad got sick, and realizing I could actually run the front of house.",
      revealed: "I'm more capable of handling pressure than I give myself credit for.",
      pattern: "",
      struggle: "Feeling like I don't have time for extracurriculars other students have.",
      differentiator: "",
      direction: "Not sure yet -- maybe business, maybe something in healthcare.",
    },
  },
  {
    key: "international-applicant",
    description: "International applicant type -- tests test-equivalency and visa-aware reasoning",
    unweighted_gpa: 3.8,
    weighted_gpa: null,
    intended_major: ["Economics", "Mathematics"],
    extracurriculars: ["National math olympiad, regional finalist", "Model UN, 2 years"],
    sat_score: null,
    act_score: null,
    class_rank: null,
    ap_ib_count: 4,
    career_goals: "Quantitative finance or economic policy research",
    geographic_pref: "US, no regional preference",
    financial_aid_need: true,
    budget_ceiling: null,
    first_gen: false,
    legacy_school: null,
    internships_research: null,
    campus_size_pref: ["Medium", "Large"],
    campus_setting_pref: ["Urban"],
    applicant_type: "international",
    accessibility_pref: null,
    schools_already_considering: "NYU, University of Michigan",
    essay_draft:
      "Growing up in a country with high inflation made me interested in economics from a young age. I have always wanted to study in the United States because of the opportunities available.",
    narrative_answers: {
      moment: "Watching my family's savings lose value month over month during a currency crisis.",
      revealed: "That I think about money as a policy problem, not just a personal one.",
      pattern: "I'm drawn to systems that affect everyone but that most people don't examine closely.",
      struggle: "Explaining economic concepts from home in a way that translates to a US admissions audience.",
      differentiator: "Most economics applicants cite an interest; I cite a currency crisis I lived through.",
      direction: "I want to research monetary policy in emerging markets.",
    },
  },
  {
    key: "transfer-applicant",
    description: "Transfer applicant type -- tests transfer-rate anchoring and community-college pathway logic",
    unweighted_gpa: 3.6,
    weighted_gpa: null,
    intended_major: ["Nursing"],
    extracurriculars: ["CNA certification, working part-time at a hospital"],
    sat_score: 1180,
    act_score: null,
    class_rank: null,
    ap_ib_count: 0,
    career_goals: "Registered nurse, eventually nurse practitioner",
    geographic_pref: "Stay in-state",
    financial_aid_need: true,
    budget_ceiling: 20000,
    first_gen: true,
    legacy_school: null,
    internships_research: null,
    campus_size_pref: ["Small", "Medium"],
    campus_setting_pref: ["Suburban", "Rural"],
    applicant_type: "transfer",
    accessibility_pref: null,
    schools_already_considering: null,
    essay_draft:
      "After two years at community college I realized nursing was really what I wanted to do with my life.",
    narrative_answers: {
      moment: "The first time I helped stabilize a patient as a CNA and realized I wanted more clinical responsibility.",
      revealed: "That I want direct patient care, not just a job in healthcare administration.",
      pattern: "I keep choosing the harder, more hands-on path over the easier credential.",
      struggle: "Balancing CNA shifts with community college coursework and feeling behind peers who went straight to a 4-year school.",
      differentiator: "I already have real clinical hours most incoming nursing students don't.",
      direction: "Registered nurse, then nurse practitioner in a few years.",
    },
  },
  {
    key: "accessibility-flagged",
    description: "Accessibility/accommodation need given -- tests the disability-cliche essay guardrail and social_fit weighting",
    unweighted_gpa: 3.7,
    weighted_gpa: 4.1,
    intended_major: ["Biology"],
    extracurriculars: ["Peer disability advocacy group, founder", "Volunteer at a therapeutic riding program"],
    sat_score: 1350,
    act_score: null,
    class_rank: "Top 20%",
    ap_ib_count: 5,
    career_goals: "Pre-med, interested in physical medicine and rehabilitation",
    geographic_pref: "No strong preference",
    financial_aid_need: false,
    budget_ceiling: null,
    first_gen: false,
    legacy_school: null,
    internships_research: null,
    campus_size_pref: ["Medium"],
    campus_setting_pref: ["Suburban", "Urban"],
    applicant_type: null,
    accessibility_pref: "Uses a wheelchair; needs accessible campus housing and lab spaces",
    schools_already_considering: null,
    essay_draft:
      "Living with a disability has taught me to overcome adversity every single day. Despite my challenges, I never gave up, and this has made me stronger than other students.",
    narrative_answers: {
      moment: "Founding the peer advocacy group after noticing accessible-seating requests kept getting lost in bureaucracy.",
      revealed: "That I'm more interested in fixing systems than in being praised for personal resilience.",
      pattern: "I keep ending up in the role of translating between institutions and the people they're supposed to serve.",
      struggle: "Essay drafts keep defaulting to inspirational framing instead of the actual systems-level work I did.",
      differentiator: "I want to talk about the advocacy work, not the diagnosis.",
      direction: "Physical medicine and rehabilitation -- staying close to the systems-fixing pattern above.",
    },
  },
];
