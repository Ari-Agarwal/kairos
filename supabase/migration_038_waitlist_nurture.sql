-- Tracking columns for the waitlist nurture sequence (docs/Launch_Plan.md §3.7/§10):
-- the day-7 content email and the pre-launch reminder are both cron-triggered
-- (time-based, not signup-triggered), so each needs a "have we sent this
-- already" flag to stay idempotent across daily cron runs.

alter table waitlist_signups
  add column if not exists nurture_day7_sent_at timestamptz,
  add column if not exists nurture_prelaunch_sent_at timestamptz;
