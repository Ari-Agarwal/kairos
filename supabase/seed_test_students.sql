-- Seed 20 test students and attach them to the counselor at counselor@test.com.
-- Run this in the Supabase SQL editor AFTER seed_counselor.sql (i.e. the counselor row
-- for counselor@test.com must already exist in `counselors`).
--
-- These students are DB-only fixtures (no real login needed): we insert directly into
-- auth.users with a placeholder password hash so profiles.user_id's FK is satisfied,
-- then create matching profiles rows on the counselor's school/roster, plus a few
-- extracurriculars, school matches, and open (incomplete) timeline items each.
--
-- Student #1 (Ava Martinez) is deliberately left at-risk: never logged in, no active
-- school matches, and one overdue timeline item -- computeFlags() in src/lib/at-risk.ts
-- derives the at-risk flag from exactly these signals, there's no stored flag column.
-- She also gets a pending review_requests row so the review-request UI has data too.

do $$
declare
  v_counselor record;
  v_user_id uuid;
  v_name text;
  v_email text;
  v_grade text;
  v_unweighted_gpa decimal;
  v_weighted_gpa decimal;
  v_major text;
  v_names text[] := array[
    'Ava Martinez','Liam Chen','Sophia Patel','Noah Johnson','Mia Rodriguez',
    'Ethan Kim','Isabella Nguyen','Lucas Thompson','Amara Okafor','Mason Lee',
    'Zoe Anderson','Elijah Garcia','Priya Sharma','James Wilson','Chloe Baker',
    'Daniel Park','Layla Hassan','Benjamin Ross','Nora Fitzgerald','Caleb Osei'
  ];
  v_majors text[] := array[
    'Computer Science','Biology','Economics','Mechanical Engineering','Psychology',
    'English','Political Science','Chemistry','Business Administration','Art History',
    'Mathematics','Environmental Science','Sociology','Neuroscience','Finance',
    'Undeclared','Architecture','Public Health','History','Data Science'
  ];
  v_grades text[] := array['Freshman','Sophomore','Junior','Senior'];
  v_sizes text[] := array['Small','Medium','Large','No preference'];
  v_settings text[] := array['Urban','Suburban','Rural','No preference'];
  v_ec_a text[] := array[
    'Debate Team','Varsity Soccer','Robotics Club','Student Newspaper','National Honor Society',
    'Volunteer EMT','Chess Club','Theater','Model UN','Track and Field',
    'Coding Club','Peer Tutoring','Environmental Club','Marching Band','Mock Trial',
    'Yearbook','Key Club','Cross Country','Art Club','Investment Club'
  ];
  v_ec_b text[] := array[
    'Habitat for Humanity','Food Bank Volunteer','Math Olympiad','Newspaper Editor','Community Garden',
    'Hospital Volunteer','Youth Group Leader','Dance Team','Science Olympiad','Swim Team',
    'App Development Project','Special Olympics Volunteer','Recycling Initiative','Jazz Band','Moot Court',
    'Photography Club','Rotary Interact','Cycling Club','Ceramics','Stock Market Club'
  ];
  v_schools text[] := array['Riverdale University','Ashford College','Bellwood State','Crescent Tech','Dunmore College'];
  i int;
begin
  select c.school_id, c.counselor_id into v_counselor
  from counselors c
  where c.email = 'counselor@test.com';

  if v_counselor.school_id is null then
    raise exception 'No counselor found with email counselor@test.com — run seed_counselor.sql for this counselor first';
  end if;

  -- Clear out any previously seeded test students so this script can be re-run safely.
  delete from review_requests where user_id in (select id from auth.users where email like '%.test%@example.com');
  delete from timeline_items where user_id in (select id from auth.users where email like '%.test%@example.com');
  delete from school_matches where user_id in (select id from auth.users where email like '%.test%@example.com');
  delete from profiles where user_id in (select id from auth.users where email like '%.test%@example.com');
  delete from auth.users where email like '%.test%@example.com';

  for i in 1..20 loop
    v_user_id := gen_random_uuid();
    v_name := v_names[i];
    v_email := lower(replace(v_name, ' ', '.')) || '.test' || i || '@example.com';
    v_grade := v_grades[1 + (i % 4)];
    v_unweighted_gpa := round((2.8 + random() * 1.2)::numeric, 2);
    v_weighted_gpa := round(least(v_unweighted_gpa + random() * 0.6, 5.0)::numeric, 2);
    v_major := v_majors[i];

    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change,
      email_change_token_new, email_change_token_current,
      phone_change, phone_change_token, reauthentication_token
    ) values (
      v_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      v_email, crypt('test-password-not-for-login', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', v_name),
      -- GoTrue's Go sql.Scan fails on NULL here (expects '' not NULL) -- any password-grant
      -- login attempt against a row missing these 500s with "converting NULL to string is
      -- unsupported", even though the row's comment above says login was never needed.
      -- Fixed Jul 23 2026 after this exact bug broke login for all 20 seeded rows.
      '', '', '', '', '', '', '', ''
    );

    insert into profiles (
      user_id, grade_level, unweighted_gpa, weighted_gpa, intended_major, current_school,
      extracurriculars, schools_already_considering, test_scores,
      campus_size_pref, campus_setting_pref, school_id, counselor_id, last_login_at, display_name
    ) values (
      v_user_id, v_grade, v_unweighted_gpa, v_weighted_gpa, array[v_major], 'Test High School',
      array[v_ec_a[i], v_ec_b[i]], 'A few reach and safety schools',
      jsonb_build_object('sat', 1200 + (i * 15)),
      array[v_sizes[1 + (i % 4)]], array[v_settings[1 + (i % 4)]],
      v_counselor.school_id, v_counselor.counselor_id,
      case when i = 1 then null else now() - (i || ' days')::interval end,
      v_name
    );

    -- School matches: skip student #1 so she has zero active matches (at-risk signal).
    if i <> 1 then
      insert into school_matches (user_id, school_name, category, percentage, why_text, factors)
      values
        (v_user_id, v_schools[1 + (i % 5)], 'reach', 20 + (i % 10), 'Stretch fit based on selectivity and profile strength.', jsonb_build_object('gpa_fit', 'below median')),
        (v_user_id, v_schools[1 + ((i + 1) % 5)], 'target', 50 + (i % 15), 'Solid fit based on academic profile and interests.', jsonb_build_object('gpa_fit', 'at median')),
        (v_user_id, v_schools[1 + ((i + 2) % 5)], 'safety', 80 + (i % 10), 'High likelihood of admission given academic strength.', jsonb_build_object('gpa_fit', 'above median'));
    end if;

    -- Open (incomplete) timeline items for everyone; student #1 gets an overdue one too.
    if i = 1 then
      insert into timeline_items (user_id, title, due_date, tier, why_text, what_to_do, completed)
      values (v_user_id, 'Submit Common App essay draft', current_date - 10, 'free', 'This deadline has already passed and needs immediate attention.', jsonb_build_object('steps', array['Finish draft', 'Send to counselor for review']), false);
    end if;

    insert into timeline_items (user_id, title, due_date, tier, why_text, what_to_do, completed)
    values
      (v_user_id, 'Request teacher recommendation letters', current_date + 14 + i, 'free', 'Give recommenders enough lead time before deadlines.', jsonb_build_object('steps', array['Ask two teachers', 'Provide a resume and brag sheet']), false),
      (v_user_id, 'Finalize college list', current_date + 30 + i, 'free', 'Lock in reach/target/safety balance before applications open.', jsonb_build_object('steps', array['Review matches', 'Confirm with counselor']), false);
  end loop;

  -- Review request for the at-risk student.
  insert into review_requests (user_id, status, review_notes)
  select id, 'pending', 'Requesting a counselor review of my college list and overall plan.'
  from auth.users
  where email = 'ava.martinez.test1@example.com';
end $$;
