// Rebuilds the 10 demo students (student1@test.com..student10@test.com) with
// realistic, internally-consistent data for a live counselor-dashboard demo:
//   - real full names (auth user_metadata.full_name), not "<First> Demo"
//   - unweighted_gpa + weighted_gpa (requires migration_008_gpa_split.sql
//     to have been run first)
//   - 15 school_matches (5 reach / 5 target / 5 safety) whose percentages are
//     derived from each school's real approximate acceptance rate and the
//     student's GPA, so e.g. a 3.51 GPA does NOT get a 29% at Harvard
//   - why_text/factors are built from per-school specifics (program
//     strengths, setting) rather than one template with the name swapped, so
//     no two schools read the same way even within one category
//   - 6 realistic timeline items spanning the application cycle, with a mix
//     of completed/incomplete/overdue for variety
//   - last_login_at set for all but student10@test.com (the one "never
//     logged in" demo case)
//
// Usage: node --env-file=.env.local scripts/seed-demo-realistic.mjs

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(1);
}
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const NEVER_LOGGED_IN_EMAIL = "student10@test.com";
const LOGIN_TIMESTAMP = "2026-07-04T15:30:00.000Z";

// Approximate real overall acceptance rates plus a specific, non-generic
// detail about each school so per-school text doesn't read as one template
// with the name swapped.
const SCHOOL_INFO = {
  Harvard: { baseRate: 3.4, detail: "its concentration system and small proseminar sections", setting: "an urban campus in a college town" },
  Stanford: { baseRate: 3.7, detail: "cross-registration with its engineering school and close ties to Silicon Valley", setting: "a large suburban campus" },
  MIT: { baseRate: 4.0, detail: "UROP undergraduate research funding available from freshman year", setting: "a mid-size urban campus" },
  Columbia: { baseRate: 3.9, detail: "the Core Curriculum's small discussion-based classes", setting: "a dense urban campus" },
  Duke: { baseRate: 6.0, detail: "the Bass Connections interdisciplinary research program", setting: "a mid-size suburban campus" },
  UMich: { baseRate: 18, detail: "one of the largest alumni networks in the country by major", setting: "a large campus in a college town" },
  "Georgia Tech": { baseRate: 16, detail: "co-op programs that place students in industry roles between semesters", setting: "a mid-size urban campus" },
  "UT Austin": { baseRate: 29, detail: "direct-admit tracks for several competitive majors", setting: "a large urban campus" },
  UCLA: { baseRate: 9, detail: "impacted-major admission that's more selective than the school-wide rate", setting: "a large urban campus" },
  NYU: { baseRate: 8, detail: "campus life spread across multiple Manhattan buildings rather than a single quad", setting: "a large urban campus with no traditional quad" },
  "Ohio State": { baseRate: 53, detail: "a scale that supports nearly every major with dedicated advising", setting: "a very large campus in a mid-size city" },
  Purdue: { baseRate: 53, detail: "a long-standing reputation specifically in engineering and applied sciences", setting: "a large campus in a college town" },
  "UNC Chapel Hill": { baseRate: 17, detail: "strong in-state public honors offerings", setting: "a mid-size campus in a college town" },
  "Boston University": { baseRate: 11, detail: "direct access to Boston's internship and hospital-system job market", setting: "a large urban campus along the Charles River" },
  Rutgers: { baseRate: 66, detail: "broad program breadth across its multiple campuses", setting: "a large campus spanning several New Jersey locations" },
};

const REACH_SCHOOLS = ["Harvard", "Stanford", "MIT", "Columbia", "Duke"];
const TARGET_SCHOOLS = ["UMich", "Georgia Tech", "UT Austin", "UCLA", "NYU"];
const SAFETY_SCHOOLS = ["Ohio State", "Purdue", "UNC Chapel Hill", "Boston University", "Rutgers"];

// 10 students spread across a realistic GPA range, with real full names.
// Weighted GPA runs ~0.3-0.5 above unweighted, reflecting AP/honors weighting.
const STUDENTS = [
  { name: "Ava Chen", major: "Computer Science", unweighted: 3.95, weighted: 4.45, ec: "Founded and led the school's competitive programming club for 2 years, placing top-10 regionally." },
  { name: "Liam Torres", major: "Biology", unweighted: 3.62, weighted: 4.05, ec: "3 years in the hospital volunteer program, 200+ logged hours." },
  { name: "Maya Patel", major: "Business", unweighted: 3.40, weighted: 3.75, ec: "Ran a small online reselling business since sophomore year, managing inventory and margins." },
  { name: "Noah Kim", major: "Psychology", unweighted: 3.78, weighted: 4.20, ec: "Peer counseling lead for 2 years, trained incoming freshmen mentors." },
  { name: "Zoe Martinez", major: "Mechanical Engineering", unweighted: 3.88, weighted: 4.35, ec: "Team captain of the FIRST Robotics team for 2 years, regional finalist." },
  { name: "Ethan Brooks", major: "Economics", unweighted: 3.25, weighted: 3.55, ec: "Treasurer of DECA for 3 years, qualified for state twice." },
  { name: "Priya Sharma", major: "Nursing", unweighted: 3.51, weighted: 3.85, ec: "CNA-certified junior year, works part-time at an assisted living facility." },
  { name: "Lucas Ferreira", major: "English", unweighted: 3.15, weighted: 3.40, ec: "Editor-in-chief of the school literary magazine for 2 years." },
  { name: "Nina Osei", major: "Political Science", unweighted: 3.70, weighted: 4.10, ec: "Started the school's Model UN chapter, grew it to 20 members in a year." },
  { name: "Omar Haddad", major: "Art History", unweighted: 3.33, weighted: 3.60, ec: "Curated a student art show at the local library for 2 consecutive years." },
];

const GRADES = ["Freshman", "Sophomore", "Junior", "Senior"];

// Maps a 3.0-4.0 unweighted GPA to a 0-1 strength signal, clamped.
function gpaStrength(unweighted) {
  return Math.min(1, Math.max(0, (unweighted - 3.0) / 1.0));
}

// Reach schools stay compressed and low even for a strong GPA — holistic
// review dominates at <10% baseline-acceptance schools. Target/safety scale
// more directly with GPA strength.
function percentageFor(category, baseRate, unweighted) {
  const strength = gpaStrength(unweighted);
  let pct;
  if (category === "reach") {
    pct = baseRate * (0.6 + strength * 1.8);
    pct = Math.min(pct, 15);
  } else if (category === "target") {
    pct = baseRate * (0.7 + strength * 1.6);
    pct = Math.min(pct, 75);
  } else {
    pct = baseRate * (0.8 + strength * 0.6);
    pct = Math.min(pct, 96);
  }
  return Math.max(2, Math.round(pct));
}

function percentileLanguage(category, pct) {
  if (category === "reach") {
    return pct <= 5
      ? "below the middle 50% of admitted students even on the stronger end of the range"
      : "at the lower edge of the middle 50% of admitted students";
  }
  if (category === "target") {
    return pct >= 45
      ? "in the upper half of the middle 50% of admitted students"
      : "in the lower half of the middle 50% of admitted students";
  }
  return "above the middle 50% of admitted students";
}

function factorsFor({ school, major, unweighted, weighted, category, pct, ec }) {
  const info = SCHOOL_INFO[school];
  return {
    gpa_comparison: `Unweighted ${unweighted.toFixed(2)} / weighted ${weighted.toFixed(2)} puts this student ${percentileLanguage(category, pct)} at ${school}.`,
    course_rigor:
      category === "reach"
        ? "Course rigor is solid but not yet at the level most admits present at this selectivity tier."
        : "Course rigor is in line with what admitted students typically present here.",
    ec_strength: `${ec} — this reads as sustained depth rather than a broad resume, which matters more at ${school} than raw activity count.`,
    major_fit: `${school} is known for ${info.detail}, which is a strong signal for a ${major} applicant specifically.`,
    social_fit: `${school} is ${info.setting}, worth weighing against the student's stated size and setting preferences.`,
  };
}

function whyText({ school, category, major, pct }) {
  const info = SCHOOL_INFO[school];
  const framing = {
    reach: `A real stretch at roughly ${pct}% given ${school}'s overall selectivity`,
    target: `A realistic, likely-but-not-guaranteed admit at roughly ${pct}%`,
    safety: `A high-probability admit at roughly ${pct}%`,
  }[category];
  return `${framing} — ${school} stands out for ${info.detail}, a genuine fit for a ${major} applicant.`;
}

function buildMatches(userId, student) {
  const rows = [];
  const groups = [
    { schools: REACH_SCHOOLS, category: "reach" },
    { schools: TARGET_SCHOOLS, category: "target" },
    { schools: SAFETY_SCHOOLS, category: "safety" },
  ];
  for (const { schools, category } of groups) {
    for (const school of schools) {
      const info = SCHOOL_INFO[school];
      const pct = percentageFor(category, info.baseRate, student.unweighted);
      rows.push({
        user_id: userId,
        school_name: school,
        category,
        percentage: pct,
        why_text: whyText({ school, category, major: student.major, pct }),
        factors: factorsFor({ school, major: student.major, unweighted: student.unweighted, weighted: student.weighted, category, pct, ec: student.ec }),
        is_active: true,
      });
    }
  }
  return rows;
}

function buildTimeline(userId, major, schools) {
  const items = [
    {
      title: "Draft Common App personal statement",
      due_date: "2026-08-15",
      completed: true,
      is_strategic: true,
      why_text: "Starting the essay early leaves room for multiple revision passes.",
      what_to_do: { steps: ["Brainstorm 3 possible topics", "Write a rough draft", "Get feedback from a teacher"] },
    },
    {
      title: "Request letters of recommendation",
      due_date: "2026-09-01",
      completed: true,
      is_strategic: true,
      why_text: "Teachers need lead time, especially for students requesting from multiple faculty.",
      what_to_do: { steps: ["Ask 2 teachers who know your work well", "Provide a resume and brag sheet"] },
    },
    {
      title: `Finalize college list (${schools.join(", ")})`,
      due_date: "2026-09-20",
      completed: true,
      is_strategic: false,
      why_text: "Locking the list early focuses application effort on the right schools.",
      what_to_do: { steps: ["Confirm reach/target/safety balance", "Check each school's supplemental requirements"] },
    },
    {
      title: "Submit FAFSA",
      due_date: "2026-10-01",
      completed: false,
      is_strategic: false,
      why_text: "Some aid is first-come, first-served, so filing on the open date matters.",
      what_to_do: { steps: ["Gather tax documents", "Create an FSA ID", "Submit the form"] },
    },
    {
      title: `Submit Early Action application to ${schools[0]}`,
      due_date: "2026-11-01",
      completed: false,
      is_strategic: true,
      why_text: "Early Action can improve admit odds and gets a decision back sooner.",
      what_to_do: { steps: ["Finalize essay", "Proofread supplement", "Submit before 11:59pm"] },
    },
    {
      title: "Submit remaining Regular Decision applications",
      due_date: "2027-01-01",
      completed: false,
      is_strategic: true,
      why_text: "Most Regular Decision deadlines cluster around January 1.",
      what_to_do: { steps: ["Finalize all supplements", "Confirm each school's portal shows 'submitted'"] },
    },
  ];
  return items.map((item) => ({
    user_id: userId,
    title: item.title,
    due_date: item.due_date,
    school_tags: schools,
    tier: "free",
    is_strategic: item.is_strategic,
    completed: item.completed,
    why_text: item.why_text,
    what_to_do: item.what_to_do,
  }));
}

async function findUserByEmail(email) {
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = data.users.find((u) => u.email === email);
    if (match) return match;
    if (data.users.length < 200) return null;
    page++;
  }
}

async function main() {
  for (let i = 0; i < STUDENTS.length; i++) {
    const email = `student${i + 1}@test.com`;
    const student = STUDENTS[i];

    const user = await findUserByEmail(email);
    if (!user) {
      console.warn(`  ${email}: no auth user found, skipping`);
      continue;
    }

    const { error: nameError } = await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: { full_name: student.name },
    });
    if (nameError) throw nameError;

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        grade_level: GRADES[i % GRADES.length],
        unweighted_gpa: student.unweighted,
        weighted_gpa: student.weighted,
        intended_major: student.major,
      })
      .eq("user_id", user.id);
    if (profileError) throw profileError;

    await supabase.from("school_matches").update({ is_active: false }).eq("user_id", user.id);
    const matchRows = buildMatches(user.id, student);
    const { error: matchError } = await supabase.from("school_matches").insert(matchRows);
    if (matchError) throw matchError;

    await supabase.from("timeline_items").delete().eq("user_id", user.id);
    const topSchools = [
      matchRows.find((m) => m.category === "reach").school_name,
      matchRows.find((m) => m.category === "target").school_name,
    ];
    const timelineRows = buildTimeline(user.id, student.major, topSchools);
    const { error: timelineError } = await supabase.from("timeline_items").insert(timelineRows);
    if (timelineError) throw timelineError;

    const last_login_at = email === NEVER_LOGGED_IN_EMAIL ? null : LOGIN_TIMESTAMP;
    const { error: loginError } = await supabase.from("profiles").update({ last_login_at }).eq("user_id", user.id);
    if (loginError) throw loginError;

    console.log(
      `  ${email} -> ${student.name} (${student.major}): GPA ${student.unweighted}/${student.weighted}, 15 matches, 6 timeline items, ` +
        `last_login_at=${last_login_at ?? "null (never logged in)"}`
    );
  }
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
