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
const COUNSELOR_EMAIL = "counselor@test.com";

// Approximate real overall acceptance rates plus a specific, non-generic
// detail about each school so per-school text doesn't read as one template
// with the name swapped.
const SCHOOL_INFO = {
  Harvard: { baseRate: 3.4, detail: "its concentration system and small proseminar sections", setting: "an urban campus in a college town" },
  Stanford: { baseRate: 3.7, detail: "cross-registration with its engineering school and close ties to Silicon Valley", setting: "a large suburban campus" },
  MIT: { baseRate: 4.0, detail: "UROP undergraduate research funding available from freshman year", setting: "a mid-size urban campus" },
  Columbia: { baseRate: 3.9, detail: "the Core Curriculum's small discussion-based classes", setting: "a dense urban campus" },
  Duke: { baseRate: 6.0, detail: "the Bass Connections interdisciplinary research program", setting: "a mid-size suburban campus" },
  "University of Michigan": { baseRate: 18, detail: "one of the largest alumni networks in the country by major", setting: "a large campus in a college town" },
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
const TARGET_SCHOOLS = ["University of Michigan", "Georgia Tech", "UT Austin", "UCLA", "NYU"];
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

// Phase 3 features (outcome logging, mentor loop, war room) shipped after the
// original 10-student seed and had no seeded data of their own, so a live
// demo hit real empty states on every one of them. This section backfills
// enough realistic data to exercise all three end to end.
//
//   - Outcome logging: 6 of the 10 students log a decision for UMich (their
//     shared target-category school) -- clears MIN_COHORT_SIZE (5 in
//     src/lib/cohort-types.ts) so the school-detail "Outcomes" tab shows real
//     aggregate stats instead of "not enough data yet" for at least one
//     school on the demo path.
//   - Mentor loop: Ava (student1) gets the one logged "accept" she needs to
//     pass the /api/mentor/opt-in eligibility check, opts in, and has an
//     accepted request + a short exchange with Liam (student2) so the
//     mentor thread isn't empty either.
//   - War room: two comments (one student, one counselor) on Ava's UMich
//     match so that tab has content on the demo path too.
const OUTCOME_SCHOOL = "University of Michigan";
// index into STUDENTS (0 = Ava) -> decision_type. Deliberately not all
// "accept" -- reject/waitlist mixed in reads as real data, not a highlight reel.
const OUTCOMES = [
  { i: 0, decision_type: "accept", aid_offer_amount: 18000 },
  { i: 1, decision_type: "accept", aid_offer_amount: 22000 },
  { i: 2, decision_type: "reject", aid_offer_amount: null },
  { i: 3, decision_type: "accept", aid_offer_amount: 14500 },
  { i: 4, decision_type: "waitlist", aid_offer_amount: null },
  { i: 5, decision_type: "accept", aid_offer_amount: 9000 },
];
const DECIDED_AT = "2027-03-18";

async function main() {
  // user.id keyed by STUDENTS index, and each student's UMich school_matches
  // row (id needed for outcomes/war-room, which both reference school_match_id).
  const userIdByIndex = [];
  const umichMatchByIndex = [];

  for (let i = 0; i < STUDENTS.length; i++) {
    const email = `student${i + 1}@test.com`;
    const student = STUDENTS[i];

    const user = await findUserByEmail(email);
    if (!user) {
      console.warn(`  ${email}: no auth user found, skipping`);
      userIdByIndex.push(null);
      umichMatchByIndex.push(null);
      continue;
    }
    userIdByIndex.push(user.id);

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

    // Hard-delete rather than soft-deactivate: outcome/war-room/mentor rows
    // cascade off school_matches.id, so re-running this script previously
    // left orphaned application_outcomes rows behind (12 raw rows for 6 real
    // seeded decisions) every time it deactivated+reinserted matches instead
    // of removing the old ones outright.
    await supabase.from("school_matches").delete().eq("user_id", user.id);
    const matchRows = buildMatches(user.id, student);
    const { data: insertedMatches, error: matchError } = await supabase
      .from("school_matches")
      .insert(matchRows)
      .select("id, school_name");
    if (matchError) throw matchError;
    umichMatchByIndex.push(insertedMatches.find((m) => m.school_name === OUTCOME_SCHOOL) ?? null);

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

  console.log(`\nSeeding ${OUTCOMES.length} application_outcomes for ${OUTCOME_SCHOOL} (cohort view demo)...`);
  for (const o of OUTCOMES) {
    const userId = userIdByIndex[o.i];
    const match = umichMatchByIndex[o.i];
    if (!userId || !match) continue;
    const { error } = await supabase.from("application_outcomes").upsert(
      {
        user_id: userId,
        school_match_id: match.id,
        decision_type: o.decision_type,
        aid_offer_amount: o.aid_offer_amount,
        decided_at: DECIDED_AT,
      },
      { onConflict: "user_id,school_match_id" }
    );
    if (error) throw error;
    console.log(`  ${STUDENTS[o.i].name}: ${o.decision_type}${o.aid_offer_amount ? ` ($${o.aid_offer_amount})` : ""}`);
  }

  console.log("\nSeeding mentor loop (Ava <-> Liam on UMich)...");
  const avaId = userIdByIndex[0];
  const liamId = userIdByIndex[1];
  const avaUmichMatch = umichMatchByIndex[0];
  if (avaId && liamId && avaUmichMatch) {
    const { error: optInError } = await supabase
      .from("profiles")
      .update({ mentor_opt_in: true, mentor_bio: "Happy to talk about CS admissions, essays, or what freshman year is actually like." })
      .eq("user_id", avaId);
    if (optInError) throw optInError;

    const { data: existingRequest } = await supabase
      .from("mentor_requests")
      .select("id")
      .eq("mentee_id", liamId)
      .eq("mentor_id", avaId)
      .eq("school_name", OUTCOME_SCHOOL)
      .maybeSingle();

    let requestId = existingRequest?.id;
    if (!requestId) {
      const { data: newRequest, error: requestError } = await supabase
        .from("mentor_requests")
        .insert({
          mentee_id: liamId,
          mentor_id: avaId,
          school_name: OUTCOME_SCHOOL,
          intro: "Hi! I saw you got into UMich -- would love any advice on the supplement essays.",
          status: "accepted",
          responded_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (requestError) throw requestError;
      requestId = newRequest.id;
    } else {
      await supabase.from("mentor_requests").update({ status: "accepted" }).eq("id", requestId);
    }

    await supabase.from("mentor_messages").delete().eq("request_id", requestId);
    const { error: messagesError } = await supabase.from("mentor_messages").insert([
      { request_id: requestId, sender_id: liamId, body: "Thanks for accepting! Did you write about CS specifically in your UMich supplement, or keep it more general?" },
      { request_id: requestId, sender_id: avaId, body: "I kept it specific -- talked about a robotics project that went wrong and what I learned debugging it. Specific beats general every time." },
    ]);
    if (messagesError) throw messagesError;
    console.log(`  mentor_requests: Ava <- Liam, accepted, 2 messages`);

    console.log("Seeding war room comments on Ava's UMich match...");
    const counselor = await findUserByEmail(COUNSELOR_EMAIL);
    await supabase.from("war_room_comments").delete().eq("school_match_id", avaUmichMatch.id);
    const warRoomRows = [
      { school_match_id: avaUmichMatch.id, user_id: avaId, role: "student", body: "Submitted the supplement today -- feeling good about it after the essay feedback pass." },
    ];
    if (counselor) {
      warRoomRows.push({
        school_match_id: avaUmichMatch.id,
        user_id: counselor.id,
        role: "counselor",
        body: "Great work on this one, Ava. Your EC section really shows depth over breadth -- that'll stand out.",
      });
    }
    const { error: warRoomError } = await supabase.from("war_room_comments").insert(warRoomRows);
    if (warRoomError) throw warRoomError;
    console.log(`  war_room_comments: ${warRoomRows.length} seeded`);
  } else {
    console.warn("  Skipping mentor loop / war room seed -- missing Ava, Liam, or their UMich match.");
  }

  // Ava (student1) stays free-tier deliberately -- she's the demo's main
  // account and should show the honest free-tier product, not a paywall
  // dressed up as a feature. Liam (student2) is flipped to premium so the
  // Demo_Script.md "premium reveal" step (essay feedback, activity eval,
  // career path) has a real account to switch to instead of hitting the
  // upgrade paywall mid-demo.
  if (liamId) {
    const { error: premiumError } = await supabase.from("profiles").update({ subscription_tier: "premium" }).eq("user_id", liamId);
    if (premiumError) throw premiumError;
    console.log("\nLiam (student2) set to premium tier for the demo's premium-reveal step.");
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
