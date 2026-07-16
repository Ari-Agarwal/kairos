// One-off demo seed: creates a school, a counselor account, and 10 fake
// student accounts (with profiles + school_matches + timeline_items) so a
// counselor login has a populated dashboard to show in a live demo.
//
// Usage:
//   node scripts/seed-demo.mjs
//
// Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the
// environment (already present in .env.local — load with:
//   node --env-file=.env.local scripts/seed-demo.mjs
// ).

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

async function getOrCreateUser(email, password, metadata) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata,
  });
  if (!error) return data.user;
  if (error.code !== "email_exists") throw error;

  let page = 1;
  while (true) {
    const { data: list, error: listError } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (listError) throw listError;
    const match = list.users.find((u) => u.email === email);
    if (match) return match;
    if (list.users.length < 200) throw new Error(`Could not find existing user ${email}`);
    page++;
  }
}

const COUNSELOR_EMAIL = "counselor@test.com";
const COUNSELOR_PASSWORD = "DemoPass123!";
const STUDENT_PASSWORD = "DemoPass123!";

const FIRST_NAMES = ["Ava", "Liam", "Maya", "Noah", "Zoe", "Ethan", "Priya", "Lucas", "Nina", "Omar"];
const MAJORS = ["Computer Science", "Biology", "Business", "Psychology", "Mechanical Engineering", "Economics", "Nursing", "English", "Political Science", "Art History"];
const SCHOOLS = ["Stanford", "University of Michigan", "UT Austin", "NYU", "UCLA", "Georgia Tech", "Boston University", "Purdue", "UNC Chapel Hill", "Ohio State"];
const GRADES = ["Freshman", "Sophomore", "Junior", "Senior"];

async function main() {
  console.log("Finding or creating demo school...");
  const { data: existingSchool } = await supabase
    .from("schools")
    .select("school_id")
    .eq("name", "Demo High School")
    .maybeSingle();
  let schoolId = existingSchool?.school_id;
  if (!schoolId) {
    const { data: school, error: schoolError } = await supabase
      .from("schools")
      .insert({
        name: "Demo High School",
        district: "Demo District",
        license_tier: "small",
        license_expiry: "2027-06-30",
      })
      .select("school_id")
      .single();
    if (schoolError) throw schoolError;
    schoolId = school.school_id;
  }
  console.log("  school_id:", schoolId);

  console.log("Finding or creating counselor auth user...");
  const counselorAuth = await getOrCreateUser(COUNSELOR_EMAIL, COUNSELOR_PASSWORD);

  const { data: existingCounselor } = await supabase
    .from("counselors")
    .select("counselor_id")
    .eq("user_id", counselorAuth.id)
    .maybeSingle();
  if (!existingCounselor) {
    const { error: counselorRowError } = await supabase.from("counselors").insert({
      user_id: counselorAuth.id,
      school_id: schoolId,
      name: "Demo Counselor",
      email: COUNSELOR_EMAIL,
    });
    if (counselorRowError) throw counselorRowError;
  }
  console.log("  counselor login:", COUNSELOR_EMAIL, "/", COUNSELOR_PASSWORD);

  console.log("Creating 10 demo students...");
  for (let i = 0; i < 10; i++) {
    const email = `student${i + 1}@test.com`;
    const studentAuth = await getOrCreateUser(email, STUDENT_PASSWORD, { full_name: `${FIRST_NAMES[i]} Demo` });
    const userId = studentAuth.id;

    const gpa = (2.8 + Math.random() * 1.2).toFixed(2);
    const { error: profileError } = await supabase.from("profiles").upsert({
      user_id: userId,
      grade_level: GRADES[i % GRADES.length],
      gpa,
      intended_major: MAJORS[i],
      current_school: "Demo High School",
      extracurriculars: ["Student Council", "Varsity Track"],
      schools_already_considering: SCHOOLS[i],
      test_scores: { sat: 1100 + i * 30 },
      campus_size_pref: "Medium",
      campus_setting_pref: "Suburban",
      school_id: schoolId,
    });
    if (profileError) throw profileError;

    const category = i % 3 === 0 ? "reach" : i % 3 === 1 ? "target" : "safety";
    const { error: matchError } = await supabase.from("school_matches").insert({
      user_id: userId,
      school_name: SCHOOLS[i],
      category,
      percentage: 40 + i * 5,
      why_text: `Strong fit based on ${MAJORS[i]} program and GPA of ${gpa}.`,
      factors: { gpa, major: MAJORS[i] },
    });
    if (matchError) throw matchError;

    const { error: timelineError } = await supabase.from("timeline_items").insert({
      user_id: userId,
      title: "Submit Common App essay",
      due_date: "2026-11-01",
      school_tags: [SCHOOLS[i]],
      tier: "free",
      is_strategic: true,
      why_text: "Early submission improves review time.",
      what_to_do: { steps: ["Draft essay", "Get feedback", "Submit"] },
    });
    if (timelineError) throw timelineError;

    console.log(`  ${email} / ${STUDENT_PASSWORD}`);
  }

  console.log("\nDone. Counselor dashboard should now show 10 students.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
