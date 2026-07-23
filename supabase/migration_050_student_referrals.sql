-- Student referral / invite-a-friend surface (Software_Timeline.md 6b):
-- lightweight growth loop for already-onboarded students, distinct from the
-- waitlist referral system (migration_037) which only applies pre-launch.
-- referral_code is generated per-profile so a student always has something
-- to share the moment their account exists.
alter table profiles
  add column referral_code text unique default substr(md5(gen_random_uuid()::text), 1, 8),
  add column referred_by_user_id uuid references auth.users(id) on delete set null;

create index idx_profiles_referral_code on profiles(referral_code);
