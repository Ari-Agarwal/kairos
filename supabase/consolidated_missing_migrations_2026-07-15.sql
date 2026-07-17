-- Consolidated missing migrations, generated 2026-07-15.
-- Verified against the Supabase project in .env.local via PostgREST schema introspection:
-- applied = 001, 002, 005, 007, 008, 009, 018 (waitlist, applied out of order separately).
-- missing = everything concatenated below, in original migration order.
-- Paste this whole file into the Supabase Dashboard SQL Editor and run ONCE.
-- NOT safe to blindly re-run in full: most `create table` statements here
-- (processed_stripe_events, rate_limits, application_outcomes, shared_links,
-- recommenders, blocks, reports, interview_sessions, mentor_requests,
-- mentor_messages, war_room_comments) have no IF NOT EXISTS guard, matching
-- how their source migrations were originally written, and will error if
-- that specific table already exists. The `alter table ... add column if
-- not exists` and `drop policy if exists` statements ARE safe to re-run.
-- If a run partially fails partway through, re-running the whole file will
-- error on any table already created by the partial run — re-run from the
-- migration after the last one that succeeded instead, or add IF NOT EXISTS
-- to the specific create table statement(s) that already landed.

-- ============================================================
-- migration_003_stripe_idempotency.sql
-- ============================================================
-- Migration 003: Stripe webhook idempotency
-- Records every Stripe event id we've already processed so redelivered events
-- (Stripe retries on timeout/non-2xx, and may deliver an event more than once)
-- are skipped instead of re-applied. Only the service role touches this table.

create table processed_stripe_events (
  event_id text primary key,
  type text not null,
  processed_at timestamptz not null default now()
);

-- RLS on with no policies: the anon/authenticated keys get zero access; the
-- webhook uses the service role, which bypasses RLS.
alter table processed_stripe_events enable row level security;


-- ============================================================
-- migration_004_rate_limits.sql
-- ============================================================
-- Migration 004: distributed rate limiting
-- Replaces the per-instance in-memory limiter with a shared Postgres-backed one
-- so limits hold across serverless instances. A single atomic upsert per check
-- (fixed window). Accessed only through the SECURITY DEFINER function below;
-- the table itself is locked down with RLS and no policies.

create table rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  count int not null default 0
);

alter table rate_limits enable row level security;

-- Atomically record a hit for p_key and report whether the caller is still
-- within p_limit hits per p_window_ms window. Returns true = allowed.
create function public.check_rate_limit(p_key text, p_limit int, p_window_ms bigint)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_window interval := make_interval(secs => p_window_ms / 1000.0);
  v_count int;
begin
  insert into rate_limits (key, window_start, count)
  values (p_key, v_now, 1)
  on conflict (key) do update
    set count = case when rate_limits.window_start < v_now - v_window then 1
                     else rate_limits.count + 1 end,
        window_start = case when rate_limits.window_start < v_now - v_window then v_now
                            else rate_limits.window_start end
  returning count into v_count;
  return v_count <= p_limit;
end;
$$;

grant execute on function public.check_rate_limit(text, int, bigint) to authenticated, service_role;


-- ============================================================
-- migration_010_intake_expansion.sql
-- ============================================================
-- Phase 3, Section 1: richer intake fields (financial aid, dual SAT/ACT,
-- class rank, course rigor, career goals, geographic pref, first-gen/legacy),
-- feeding both onboarding and matching/timeline prompts, not just stored inert.
alter table profiles
  add column if not exists financial_aid_need boolean,
  add column if not exists budget_ceiling numeric,
  add column if not exists sat_score int,
  add column if not exists act_score int,
  add column if not exists class_rank text,
  add column if not exists ap_ib_count int,
  add column if not exists career_goals text,
  add column if not exists geographic_pref text,
  add column if not exists first_gen boolean,
  add column if not exists legacy_school text;


-- ============================================================
-- migration_012_living_profile_nudge.sql
-- ============================================================
-- Phase 3, Section 1: "living profile" nudges -- treat onboarding as a
-- starting point, not a one-time event. last_profile_check_at tracks when the
-- student last confirmed/updated their profile, so we can prompt a light
-- re-check once a grading period has passed instead of never asking again.
alter table profiles
  add column if not exists last_profile_check_at timestamptz not null default now();


-- ============================================================
-- migration_013_outcome_logging.sql
-- ============================================================
-- Phase 3, Section 4: outcome-capture logging.
-- Students log accept/reject/waitlist + aid offer per school after decisions
-- arrive (March–April). Built now so the clock starts as soon as it's live.
-- school_match_id references school_matches.id so the outcome is tied to the
-- exact match record the student sees, not a freehand school name that could
-- diverge from the match list over time.

create table application_outcomes (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users not null,
  school_match_id uuid references school_matches(id) on delete cascade not null,
  decision_type   text not null check (decision_type in ('accept','reject','waitlist','defer')),
  aid_offer_amount numeric(12,2),
  decided_at      date not null,
  notes           text check (char_length(notes) <= 1000),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique (user_id, school_match_id)
);

alter table application_outcomes enable row level security;

create policy "own outcomes" on application_outcomes
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_application_outcomes_user_id on application_outcomes(user_id);


-- ============================================================
-- migration_014_human_escalation.sql
-- ============================================================
-- Migration 014: human-escalation review requests table.
-- One request per student per calendar year (yearly cap mirrors the weekly
-- regeneration cap in regeneration_log but enforced in-app rather than via
-- a separate log table — the review_requests rows ARE the canonical record).

create table if not exists review_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  status text check (status in ('pending', 'in_progress', 'completed')) default 'pending' not null,
  review_notes text not null,
  created_at timestamptz default now()
);

alter table review_requests enable row level security;

-- Students see and create only their own requests.
drop policy if exists "student owns review requests" on review_requests;
create policy "student owns review requests" on review_requests
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Counselors see requests only from students assigned to their school,
-- mirroring the "counselor reads assigned student matches" pattern in
-- migration_001_counselor_dashboard.sql.
drop policy if exists "counselor reads assigned student review requests" on review_requests;
create policy "counselor reads assigned student review requests" on review_requests
  for select
  using (
    exists (
      select 1 from counselors c
      join profiles p on p.school_id = c.school_id
      where c.user_id = auth.uid() and p.user_id = review_requests.user_id
    )
  );


-- ============================================================
-- migration_015_shared_views.sql
-- ============================================================
-- Shared links: students create invite tokens for parent/counselor read-only views.
-- Token is generated in the API route (crypto.randomBytes(32).toString('hex'), 256 bits),
-- stored as the primary key. No sequential ID — cannot be enumerated.
-- Anonymous viewers never query this table directly; the API route uses the
-- service-role client so no RLS policy grants anonymous/public access.

create table shared_links (
  token     text        primary key,
  user_id   uuid        not null references auth.users(id) on delete cascade,
  label     text,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '30 days',
  revoked_at  timestamptz
);

alter table shared_links enable row level security;

create policy "owner_all" on shared_links
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_shared_links_user_id on shared_links(user_id);


-- ============================================================
-- migration_016_rec_letters.sql
-- ============================================================
-- Rec-letter collaboration: student fills a brag sheet per recommender,
-- gets a share token, and the recommender views AI talking points via a
-- public link with no login required.
--
-- brag_sheet stored as jsonb on recommenders (not a separate table) because
-- the content is always accessed alongside the recommender row, is never
-- queried independently across recommenders, and needs no normalization.
-- A separate table would only add a join on every read with no benefit.

create table recommenders (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        not null references auth.users(id) on delete cascade,
  recommender_name  text        not null check (char_length(recommender_name) <= 200),
  recommender_email text        check (char_length(recommender_email) <= 254),
  relationship      text        not null check (char_length(relationship) <= 200),
  status            text        not null default 'requested'
                                check (status in ('requested', 'reminded', 'submitted')),
  share_token       text        not null unique,
  brag_sheet        jsonb       not null default '{}',
  last_reminded_at  timestamptz,
  created_at        timestamptz not null default now()
);

alter table recommenders enable row level security;

create policy "owner_all" on recommenders
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_recommenders_user_id   on recommenders(user_id);
create index idx_recommenders_share_token on recommenders(share_token);


-- ============================================================
-- migration_017_scorecard_cost_data.sql
-- ============================================================
-- Migration 017: add cost/outcome columns to college_stats_cache pulled from
-- College Scorecard's cost and earnings endpoints. All nullable — Scorecard
-- doesn't carry every field for every school. Run in Supabase SQL editor
-- against both staging and production.

alter table college_stats_cache
  add column if not exists avg_net_price integer,
  add column if not exists cost_of_attendance integer,
  add column if not exists median_debt numeric,
  add column if not exists median_earnings_10yr integer;


-- ============================================================
-- migration_019_user_safety.sql
-- ============================================================
-- Phase 3, Section 8: user-to-user safety infrastructure. Built before any
-- feature that puts one student in contact with another (mentor loop, war
-- room) -- Section 5's own scoping note requires the safety policy decided
-- and built first, not bolted on after minors are already messaging.
--
-- Policy decision (Jul 15): default to the more conservative contact model.
-- Any future user-to-user feature must check both `blocks` (mutual silence,
-- no notification to the blocked party) and route first contact through
-- moderation/flagging rather than fully open direct messaging. `reports`
-- covers arbitrary content types via (content_type, content_id) rather than
-- a foreign key, since mentor_message / war_room_comment tables don't exist
-- yet -- each new contact feature just picks a content_type string.

create table blocks (
  id          uuid        primary key default gen_random_uuid(),
  blocker_id  uuid        not null references auth.users(id) on delete cascade,
  blocked_id  uuid        not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  constraint no_self_block check (blocker_id <> blocked_id),
  constraint unique_block unique (blocker_id, blocked_id)
);

alter table blocks enable row level security;

-- A user can see and create their own blocks (who they've blocked), but
-- never sees who has blocked them -- that stays silent by design.
create policy "owner_manages_own_blocks" on blocks
  for all
  using (auth.uid() = blocker_id)
  with check (auth.uid() = blocker_id);

create index idx_blocks_blocker on blocks(blocker_id);
create index idx_blocks_blocked on blocks(blocked_id);

create table reports (
  id               uuid        primary key default gen_random_uuid(),
  reporter_id      uuid        not null references auth.users(id) on delete cascade,
  reported_user_id uuid        references auth.users(id) on delete set null,
  content_type     text        not null check (char_length(content_type) <= 100),
  content_id       uuid,
  reason           text        not null check (char_length(reason) <= 2000),
  status           text        not null default 'pending'
                               check (status in ('pending', 'reviewed', 'actioned', 'dismissed')),
  created_at       timestamptz not null default now(),
  reviewed_at      timestamptz
);

alter table reports enable row level security;

-- A reporter can create and see their own reports (e.g. to confirm it went
-- through), but not other people's reports or the moderation queue itself --
-- that requires a separate admin surface, not exposed to students.
create policy "reporter_creates_and_reads_own" on reports
  for all
  using (auth.uid() = reporter_id)
  with check (auth.uid() = reporter_id);

create index idx_reports_reporter on reports(reporter_id);
create index idx_reports_reported_user on reports(reported_user_id);
create index idx_reports_status on reports(status);


-- ============================================================
-- migration_020_sms_nudges.sql
-- ============================================================
-- Phase 3, Section 5: SMS-first nudges. TCPA-style explicit opt-in --
-- consent is its own field/timestamp, never inferred from providing a phone
-- number, and is not a condition of using the rest of the product.

alter table profiles
  add column if not exists phone_number text check (char_length(phone_number) <= 20),
  add column if not exists sms_opt_in boolean not null default false,
  add column if not exists sms_opt_in_at timestamptz,
  add column if not exists sms_notification_prefs jsonb not null default
    '{"deadline_reminders": true, "weekly_essay_prompt": true, "odds_updates": true}';


-- ============================================================
-- migration_021_mock_interview.sql
-- ============================================================
-- Phase 3, Section 5: AI mock interview simulator. Voice I/O runs entirely
-- in the browser (Web Speech API for speech-to-text input and
-- speech-synthesis output) rather than a third-party voice provider -- no
-- audio is ever sent to or stored on our servers, only the transcribed
-- text, which meaningfully reduces the consent/retention burden of
-- recording a minor's voice flagged for this item.

create table interview_sessions (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        not null references auth.users(id) on delete cascade,
  question          text        not null check (char_length(question) <= 2000),
  answer_transcript text        not null check (char_length(answer_transcript) <= 10000),
  score             int         check (score between 1 and 10),
  strengths         jsonb,
  improvements      jsonb,
  summary           text        check (char_length(summary) <= 2000),
  created_at        timestamptz not null default now()
);

alter table interview_sessions enable row level security;

create policy "owner_all" on interview_sessions
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_interview_sessions_user_id on interview_sessions(user_id);


-- ============================================================
-- migration_022_mentor_loop.sql
-- ============================================================
-- Phase 3, Section 5: mentor loop. A student who logged an "accept" outcome
-- for a school can opt in to mentor applicants to that same school.
--
-- Safety policy (per Section 8's conservative-default decision, applied
-- here): first contact is NOT open direct messaging. A mentee sends a
-- request; messaging only unlocks once the mentor explicitly accepts. Every
-- message insert must also pass the app-layer isBlocked() check from
-- src/lib/safety.ts before being allowed, and ReportBlockMenu is wired into
-- the thread UI from message one.

alter table profiles
  add column if not exists mentor_opt_in boolean not null default false,
  add column if not exists mentor_bio text check (char_length(mentor_bio) <= 1000);

create table mentor_requests (
  id           uuid        primary key default gen_random_uuid(),
  mentee_id    uuid        not null references auth.users(id) on delete cascade,
  mentor_id    uuid        not null references auth.users(id) on delete cascade,
  school_name  text        not null check (char_length(school_name) <= 200),
  intro        text        not null check (char_length(intro) <= 1000),
  status       text        not null default 'pending'
                           check (status in ('pending', 'accepted', 'declined')),
  created_at   timestamptz not null default now(),
  responded_at timestamptz,
  constraint no_self_mentor check (mentee_id <> mentor_id)
);

alter table mentor_requests enable row level security;

-- Both participants can see a request; only the mentee can create one (as
-- themselves); only the mentor can update it (accept/decline, as themselves).
create policy "participants_read" on mentor_requests
  for select
  using (auth.uid() = mentee_id or auth.uid() = mentor_id);

create policy "mentee_creates" on mentor_requests
  for insert
  with check (auth.uid() = mentee_id);

create policy "mentor_responds" on mentor_requests
  for update
  using (auth.uid() = mentor_id)
  with check (auth.uid() = mentor_id);

create index idx_mentor_requests_mentee on mentor_requests(mentee_id);
create index idx_mentor_requests_mentor on mentor_requests(mentor_id);

create table mentor_messages (
  id          uuid        primary key default gen_random_uuid(),
  request_id  uuid        not null references mentor_requests(id) on delete cascade,
  sender_id   uuid        not null references auth.users(id) on delete cascade,
  body        text        not null check (char_length(body) <= 4000),
  created_at  timestamptz not null default now()
);

alter table mentor_messages enable row level security;

-- Only the two participants of the parent request can see or send messages,
-- and only once that request has been accepted -- enforces "moderated first
-- contact" at the database layer, not just in application code.
create policy "participants_read_messages" on mentor_messages
  for select
  using (
    exists (
      select 1 from mentor_requests r
      where r.id = mentor_messages.request_id
        and (auth.uid() = r.mentee_id or auth.uid() = r.mentor_id)
    )
  );

create policy "participants_send_messages" on mentor_messages
  for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from mentor_requests r
      where r.id = mentor_messages.request_id
        and r.status = 'accepted'
        and (auth.uid() = r.mentee_id or auth.uid() = r.mentor_id)
    )
  );

create index idx_mentor_messages_request on mentor_messages(request_id);


-- ============================================================
-- migration_023_war_room.sql
-- ============================================================
-- Phase 3, Section 5: war room mode -- a shared comment thread per
-- application (school_match) for student + parent + mentor + counselor.
--
-- Same safety policy as the mentor loop (Section 8's conservative default):
-- parent access is via the existing shared_links token (read + a comment
-- endpoint, both service-role-backed, no direct RLS grant to anon), mentor
-- access requires an ACCEPTED mentor_requests row for this exact school
-- (not just any mentor relationship), and counselor access mirrors the
-- existing counselor/profile join used everywhere else in this schema.
-- role is set server-side by the API route after checking eligibility --
-- never trusted from client input -- so a comment can't claim to be from a
-- role the poster doesn't actually have.

create table war_room_comments (
  id               uuid        primary key default gen_random_uuid(),
  school_match_id  uuid        not null references school_matches(id) on delete cascade,
  user_id          uuid        references auth.users(id) on delete set null,
  shared_link_token text       references shared_links(token) on delete set null,
  role             text        not null check (role in ('student', 'parent', 'mentor', 'counselor')),
  body             text        not null check (char_length(body) <= 4000),
  created_at       timestamptz not null default now(),
  constraint has_author check (user_id is not null or shared_link_token is not null)
);

alter table war_room_comments enable row level security;

create policy "eligible_participants_read" on war_room_comments
  for select
  using (
    auth.uid() = (select sm.user_id from school_matches sm where sm.id = school_match_id)
    or exists (
      select 1 from counselors c
      join profiles p on p.school_id = c.school_id
      join school_matches sm on sm.user_id = p.user_id
      where c.user_id = auth.uid() and sm.id = school_match_id
    )
    or exists (
      select 1 from mentor_requests r
      join school_matches sm on sm.id = school_match_id
      where r.mentor_id = auth.uid()
        and r.status = 'accepted'
        and r.mentee_id = sm.user_id
        and r.school_name = sm.school_name
    )
  );

-- Parent comments (shared_link_token, no auth.uid()) are inserted via a
-- service-role API route that validates the token itself, so this insert
-- policy only needs to cover the three authenticated roles.
create policy "eligible_participants_write" on war_room_comments
  for insert
  with check (
    auth.uid() = user_id
    and (
      auth.uid() = (select sm.user_id from school_matches sm where sm.id = school_match_id)
      or exists (
        select 1 from counselors c
        join profiles p on p.school_id = c.school_id
        join school_matches sm on sm.user_id = p.user_id
        where c.user_id = auth.uid() and sm.id = school_match_id
      )
      or exists (
        select 1 from mentor_requests r
        join school_matches sm on sm.id = school_match_id
        where r.mentor_id = auth.uid()
          and r.status = 'accepted'
          and r.mentee_id = sm.user_id
          and r.school_name = sm.school_name
      )
    )
  );

create index idx_war_room_comments_match on war_room_comments(school_match_id);


-- ============================================================
-- migration_024_scholarship_nudges.sql
-- ============================================================
-- Focus-group action item (Jul 17): Ahana's one ask of her real counselor was
-- unprompted outreach ("emails when she thinks an opportunity fits my
-- interests"). Extends the existing SMS-nudge pattern (migration_020) to
-- proactively surface newly-matching scholarships instead of requiring the
-- student to check /scholarships themselves. `scholarship_alerts` reuses the
-- same jsonb prefs column rather than a new one; a profile with no key set
-- for it is still treated as opted-in (checked via `!== false`, matching the
-- other three nudge types), so this needs no default-value migration for
-- existing rows.
--
-- notified_scholarship_names tracks what's already been texted so the same
-- match isn't re-sent every day -- capped in application code, not by a DB
-- constraint, since "cap the array" isn't expressible as a simple check().

alter table profiles
  add column if not exists notified_scholarship_names text[] not null default '{}';


-- ============================================================
-- migration_025_multiselect_campus_prefs.sql
-- ============================================================
-- Ari's direct follow-up (Jul 17, evening): campus size/setting preference
-- should be selectable as multiple choices, not one. Converts both columns
-- from a single text value to text[]. Existing single values are wrapped in
-- a one-element array rather than dropped, so no student loses previously
-- collected preference data.
--
-- intended_major is NOT included in this migration -- it touches 28 files
-- (counselor dashboards, mentor matching, cohort analytics, outcome-appeal
-- letters, an RLS integration test) vs. 5-6 for these two columns, so it's
-- being done as its own separate, focused follow-up rather than bundled in
-- here at higher risk of an overlooked spot in code that isn't easy to
-- visually smoke-test (counselor/mentor tooling needs a logged-in account
-- of that specific role).

-- The original migration_005 check constraints ("in ('Small','Medium',...)")
-- compare the column against text literals -- Postgres has to rebuild them
-- as part of the type change below, and text[] IN (...) has no matching
-- operator, so they must be dropped first. Not recreated: a fixed-choice
-- check constraint doesn't cleanly express "array of one or more of these
-- values" without a heavier <@ array[...] check, and app-level validation
-- (the multi-select UI only offers these exact options) already covers it.
alter table profiles drop constraint if exists profiles_campus_size_pref_check;
alter table profiles drop constraint if exists profiles_campus_setting_pref_check;

alter table profiles
  alter column campus_size_pref type text[]
  using (case when campus_size_pref is null then null else array[campus_size_pref] end);

alter table profiles
  alter column campus_setting_pref type text[]
  using (case when campus_setting_pref is null then null else array[campus_setting_pref] end);


-- ============================================================
-- migration_026_multiselect_intended_major.sql
-- ============================================================
-- Ari's direct follow-up, part 2: intended_major selectable as multiple
-- choices too. Deferred from migration_025 deliberately -- this column
-- touches 28 files (counselor dashboards, mentor matching, cohort analytics,
-- outcome-appeal letters, interview-question generation, an RLS integration
-- test), so it's its own migration/pass rather than bundled with the lower-
-- risk campus size/setting change. No check constraint exists on this column
-- (only `not null`, from migration_002), so there's no constraint-drop
-- landmine like campus prefs had.
alter table profiles
  alter column intended_major type text[]
  using (case when intended_major is null then null else array[intended_major] end);


-- ============================================================
-- migration_027_college_photo_cache.sql
-- ============================================================
-- Software_Timeline.md Section 3 follow-up: a real photo of each college,
-- visible in that school's info tab. Source is the Wikipedia REST API
-- (free, no key, no billing account) -- researched Jul 17 as the best option
-- over Google Places Photos ($7/1,000 requests) and generic stock photo APIs
-- (not the actual named school). Mirrors college_stats_cache's pattern
-- exactly: keyed by normalized school name, shared across all students, so
-- repeated page views don't re-hit Wikipedia every time.

create table college_photo_cache (
  school_name       text        primary key,
  image_url         text,
  width             integer,
  height            integer,
  attribution_text  text,
  attribution_url   text,
  found             boolean     not null default true,
  fetched_at        timestamptz default now() not null
);

alter table college_photo_cache enable row level security;

create policy "authenticated users can read college photo cache" on college_photo_cache
  for select using (auth.role() = 'authenticated');

