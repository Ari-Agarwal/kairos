-- Section 13 test-data gap: mentor loop and recommender flow have no
-- exercisable seed data. Neither is a separate auth role -- "mentor" is just
-- a profile flag + a logged accept outcome on an existing student account,
-- and "recommender" is a token-linked page with no login at all -- so this
-- doesn't need new auth.users rows, just real rows layered on top of the
-- students already seeded by seed_test_students.sql (run that first).
--
-- Sets up:
--   1. Liam Chen (student #2) opts in as a mentor for one of his matched
--      schools, backed by a real logged "accept" outcome (mentor opt-in is
--      gated on this in api/mentor/opt-in/route.ts).
--   2. Sophia Patel (student #3) sends Liam a pending mentor request, plus a
--      second, already-accepted request with a couple of exchanged messages
--      so both the "pending" and "in conversation" mentor-loop UI states are
--      exercisable without needing to click through the request flow live.
--   3. A recommenders row for Liam with a real share_token, printed at the
--      end, so /recommender/[token] can be opened directly with no login.

do $$
declare
  v_liam_id uuid;
  v_sophia_id uuid;
  v_liam_school_match_id uuid;
  v_request_pending_id uuid;
  v_request_accepted_id uuid;
  v_share_token text;
begin
  select id into v_liam_id from auth.users where email = 'liam.chen.test2@example.com';
  select id into v_sophia_id from auth.users where email = 'sophia.patel.test3@example.com';

  if v_liam_id is null or v_sophia_id is null then
    raise exception 'Run seed_test_students.sql first -- Liam Chen / Sophia Patel not found';
  end if;

  select id into v_liam_school_match_id from school_matches where user_id = v_liam_id limit 1;
  if v_liam_school_match_id is null then
    raise exception 'Liam Chen has no school_matches rows -- re-run seed_test_students.sql';
  end if;

  -- 1. Logged accept outcome + mentor opt-in for Liam.
  insert into application_outcomes (user_id, school_match_id, decision_type, decided_at, notes)
  values (v_liam_id, v_liam_school_match_id, 'accept', current_date - 30, 'Seeded for mentor-loop testing.')
  on conflict (user_id, school_match_id) do update set decision_type = 'accept';

  update profiles
  set mentor_opt_in = true,
      mentor_bio = 'Happy to talk about the CS program, dorm life, and the application process. Ask me anything!'
  where user_id = v_liam_id;

  -- 2. Sophia -> Liam mentor requests: one pending, one accepted-with-messages.
  delete from mentor_requests where mentee_id = v_sophia_id and mentor_id = v_liam_id;

  insert into mentor_requests (mentee_id, mentor_id, school_name, intro, status)
  values (v_sophia_id, v_liam_id, (select school_name from school_matches where id = v_liam_school_match_id),
          'Hi! I saw you got in and wanted to ask about the CS program culture there.', 'pending')
  returning id into v_request_pending_id;

  insert into mentor_requests (mentee_id, mentor_id, school_name, intro, status, responded_at)
  values (v_sophia_id, v_liam_id, (select school_name from school_matches where id = v_liam_school_match_id),
          'Hi! Would love to hear about your application experience.', 'accepted', now() - interval '2 days')
  returning id into v_request_accepted_id;

  insert into mentor_messages (request_id, sender_id, body)
  values
    (v_request_accepted_id, v_sophia_id, 'Thanks for accepting! What made you choose this school?'),
    (v_request_accepted_id, v_liam_id, 'The CS program''s project-based courses honestly sold me -- happy to share more.');

  -- 3. Recommender share link for Liam.
  delete from recommenders where user_id = v_liam_id and recommender_email = 'seed-recommender@example.com';

  v_share_token := encode(gen_random_bytes(32), 'hex');
  insert into recommenders (user_id, recommender_name, recommender_email, relationship, status, share_token, brag_sheet)
  values (
    v_liam_id, 'Ms. Test Teacher', 'seed-recommender@example.com', 'AP Computer Science teacher', 'requested', v_share_token,
    jsonb_build_object(
      'activities', 'Robotics Club (lead outreach coordinator), Peer Tutoring',
      'achievements', 'Top of class in AP CS A, regional robotics competition finalist',
      'anecdotes', 'Redesigned the club''s onboarding materials so new members ramp up faster.',
      'additional_context', 'Consistently the student other kids go to for debugging help.'
    )
  );

  raise notice 'Recommender share link: /recommender/%', v_share_token;
end $$;
