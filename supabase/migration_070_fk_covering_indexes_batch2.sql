-- Supabase performance-advisor backlog (Software_Timeline.md Section 1, item 5).
-- Covering indexes for the 15 unindexed-foreign-key findings from
-- get_advisors(type: "performance") as of 2026-07-23. Low-risk, purely
-- additive -- an index never changes query results, only lookup/join speed
-- and (for FK columns specifically) the cost of the child-row scan Postgres
-- does on every parent-row delete/update. `if not exists` makes this safe
-- to re-run.
--
-- Distinct from migration_060_fk_covering_indexes.sql, which covered an
-- earlier batch of unindexed-FK findings -- this one covers what get_advisors
-- still flags after that migration.
create index if not exists idx_activity_evaluations_user_id on public.activity_evaluations (user_id);
create index if not exists idx_application_outcomes_school_match_id on public.application_outcomes (school_match_id);
create index if not exists idx_at_risk_dismissals_student_user_id on public.at_risk_dismissals (student_user_id);
create index if not exists idx_counselor_notes_student_user_id on public.counselor_notes (student_user_id);
create index if not exists idx_counselor_student_notes_student_user_id on public.counselor_student_notes (student_user_id);
create index if not exists idx_counselor_student_notes_counselor_id on public.counselor_student_notes (counselor_id);
create index if not exists idx_counselors_school_id on public.counselors (school_id);
create index if not exists idx_counselors_user_id on public.counselors (user_id);
create index if not exists idx_essay_feedback_history_user_id on public.essay_feedback_history (user_id);
create index if not exists idx_mentor_messages_sender_id on public.mentor_messages (sender_id);
create index if not exists idx_reminder_log_counselor_id on public.reminder_log (counselor_id);
create index if not exists idx_reminder_log_student_user_id on public.reminder_log (student_user_id);
create index if not exists idx_review_requests_user_id on public.review_requests (user_id);
create index if not exists idx_school_matches_user_id on public.school_matches (user_id);
create index if not exists idx_timeline_items_user_id on public.timeline_items (user_id);
