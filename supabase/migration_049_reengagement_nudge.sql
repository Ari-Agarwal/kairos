-- Direct-to-student re-engagement (Software_Timeline.md 6b): the counselor-
-- side "at-risk"/inactivity detection (shipped Jul 18) has no equivalent for
-- a student with no counselor at all -- the primary audience per the
-- direct-to-student launch strategy. Tracks the last time this nudge was
-- sent so the daily cron can send it at most once per ~14-day window.
alter table profiles
  add column last_reengagement_sent_at timestamptz;
