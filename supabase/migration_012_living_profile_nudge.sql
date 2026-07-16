-- Phase 3, Section 1: "living profile" nudges -- treat onboarding as a
-- starting point, not a one-time event. last_profile_check_at tracks when the
-- student last confirmed/updated their profile, so we can prompt a light
-- re-check once a grading period has passed instead of never asking again.
alter table profiles
  add column if not exists last_profile_check_at timestamptz not null default now();
