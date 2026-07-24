// Creates (or refreshes) a single, dedicated Apple/Google reviewer demo
// account -- separate from student1@test.com, per docs/app_store_listing_draft.md
// ("Reviewer demo account" section), so App Review always has clean, populated
// data without touching the internal dev-seed accounts used for screenshots.
//
// Usage: node --env-file=.env.local scripts/seed-reviewer-account.mjs

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

const REVIEWER_EMAIL = "reviewer@kairosadmissions.com";
const REVIEWER_PASSWORD = "AppReview2026!";
const REVIEWER_NAME = "Jordan Reviewer";

const SCHOOL_INFO = {
  Stanford: { baseRate: 3.7, category: "reach", detail: "cross-registration with its engineering school and close ties to Silicon Valley" },
  MIT: { baseRate: 4.0, category: "reach", detail: "UROP undergraduate research funding available from freshman year" },
  "University of Michigan": { baseRate: 18, category: "target", detail: "one of the largest alumni networks in the country by major" },
  "Georgia Tech": { baseRate: 16, category: "target", detail: "co-op programs that place students in industry roles between semesters" },
  "Ohio State": { baseRate: 53, category: "safety", detail: "a scale that supports nearly every major with dedicated advising" },
  Purdue: { baseRate: 53, category: "safety", detail: "a long-standing reputation specifically in engineering and applied sciences" },
};

const MAJOR = "Computer Science";
const UNWEIGHTED_GPA = 3.8;
const WEIGHTED_GPA = 4.25;
const EC = "Led the school's robotics team to a regional final for 2 years running.";

function whyText(school, { category, baseRate }) {
  const pct = category === "reach" ? 12 : category === "target" ? 55 : 88;
  const framing = {
    reach: `A real stretch at roughly ${pct}%`,
    target: `A realistic, likely-but-not-guaranteed admit at roughly ${pct}%`,
    safety: `A high-probability admit at roughly ${pct}%`,
  }[category];
  return { pct, text: `${framing} given ${school}'s overall selectivity -- stands out for ${SCHOOL_INFO[school].detail}, a genuine fit for a ${MAJOR} applicant.` };
}

async function getOrCreateReviewer() {
  const { data, error } = await supabase.auth.admin.createUser({
    email: REVIEWER_EMAIL,
    password: REVIEWER_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: REVIEWER_NAME },
  });
  if (!error) return data.user;
  if (error.code !== "email_exists") throw error;

  let page = 1;
  while (true) {
    const { data: list, error: listError } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (listError) throw listError;
    const match = list.users.find((u) => u.email === REVIEWER_EMAIL);
    if (match) return match;
    if (list.users.length < 200) throw new Error(`Could not find existing user ${REVIEWER_EMAIL}`);
    page++;
  }
}

async function main() {
  console.log(`Finding or creating reviewer account (${REVIEWER_EMAIL})...`);
  const user = await getOrCreateReviewer();

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      grade_level: "Senior",
      unweighted_gpa: UNWEIGHTED_GPA,
      weighted_gpa: WEIGHTED_GPA,
      intended_major: [MAJOR],
      last_login_at: new Date("2026-07-24T12:00:00.000Z").toISOString(),
    })
    .eq("user_id", user.id);
  if (profileError) throw profileError;

  await supabase.from("school_matches").delete().eq("user_id", user.id);
  const matchRows = Object.entries(SCHOOL_INFO).map(([school, info]) => {
    const { pct, text } = whyText(school, info);
    return {
      user_id: user.id,
      school_name: school,
      category: info.category,
      percentage: pct,
      why_text: text,
      factors: {
        gpa_comparison: `Unweighted ${UNWEIGHTED_GPA} / weighted ${WEIGHTED_GPA} puts this student in a competitive range at ${school}.`,
        course_rigor: "Course rigor is in line with what admitted students typically present here.",
        ec_strength: `${EC} -- reads as sustained depth rather than a broad resume.`,
        major_fit: `${school} is known for ${info.detail}, a strong signal for a ${MAJOR} applicant.`,
        social_fit: `Campus setting is worth weighing against the student's stated preferences.`,
      },
      is_active: true,
    };
  });
  const { data: insertedMatches, error: matchError } = await supabase
    .from("school_matches")
    .insert(matchRows)
    .select("id, school_name");
  if (matchError) throw matchError;
  console.log(`  ${insertedMatches.length} school matches seeded (reach/target/safety).`);

  await supabase.from("timeline_items").delete().eq("user_id", user.id);
  const topSchools = ["Stanford", "University of Michigan"];
  const timelineRows = [
    { title: "Draft Common App personal statement", due_date: "2026-08-15", completed: true, is_strategic: true, why_text: "Starting early leaves room for revisions.", what_to_do: { steps: ["Brainstorm 3 topics", "Write a rough draft", "Get teacher feedback"] } },
    { title: "Request letters of recommendation", due_date: "2026-09-01", completed: true, is_strategic: true, why_text: "Teachers need lead time.", what_to_do: { steps: ["Ask 2 teachers", "Provide a resume"] } },
    { title: `Finalize college list (${topSchools.join(", ")})`, due_date: "2026-09-20", completed: true, is_strategic: false, why_text: "Locking the list focuses effort.", what_to_do: { steps: ["Confirm reach/target/safety balance"] } },
    { title: "Submit FAFSA", due_date: "2026-10-01", completed: false, is_strategic: false, why_text: "Some aid is first-come, first-served.", what_to_do: { steps: ["Gather tax documents", "Create an FSA ID", "Submit"] } },
    { title: `Submit Early Action application to ${topSchools[0]}`, due_date: "2026-11-01", completed: false, is_strategic: true, why_text: "Early Action can improve odds.", what_to_do: { steps: ["Finalize essay", "Proofread", "Submit before 11:59pm"] } },
    { title: "Submit remaining Regular Decision applications", due_date: "2027-01-01", completed: false, is_strategic: true, why_text: "Most RD deadlines cluster around Jan 1.", what_to_do: { steps: ["Finalize supplements", "Confirm submission status"] } },
  ].map((item) => ({
    user_id: user.id,
    title: item.title,
    due_date: item.due_date,
    school_tags: topSchools,
    tier: "free",
    is_strategic: item.is_strategic,
    completed: item.completed,
    why_text: item.why_text,
    what_to_do: item.what_to_do,
  }));
  const { error: timelineError } = await supabase.from("timeline_items").insert(timelineRows);
  if (timelineError) throw timelineError;
  console.log(`  ${timelineRows.length} timeline items seeded (mix of done/pending).`);

  await supabase.from("essay_feedback_history").delete().eq("user_id", user.id);
  const { error: essayError } = await supabase.from("essay_feedback_history").insert({
    user_id: user.id,
    school: "Stanford",
    essay_text:
      "The robot wasn't supposed to catch fire. I remember staring at the smoking chassis three days before regionals, my team looking at me like I had an answer. I didn't -- not yet. But debugging that failure taught me more about leadership than any competition win could have...",
    feedback: [
      { category: "Opening", note: "Strong in-scene opening that avoids the generic 'ever since I was young' cliche -- keep this." },
      { category: "Specificity", note: "The robotics detail is vivid; consider naming the exact wiring issue to ground the reader further." },
      { category: "Reflection", note: "The pivot to leadership is a bit abrupt -- spend one more sentence bridging the technical failure to what you learned about people." },
    ],
    is_rubric: false,
    prompt_version: "reviewer-seed-v1",
  });
  if (essayError) throw essayError;
  console.log("  1 essay + feedback history seeded.");

  console.log(`\nDone. Reviewer login:\n  email: ${REVIEWER_EMAIL}\n  password: ${REVIEWER_PASSWORD}`);
  console.log("Paste these into the 'Demo account' field in docs/app_store_listing_draft.md before submitting.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
