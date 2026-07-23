-- Prompt versioning (Section 6a): right now there's no record of which
-- version of a prompt a given student's AI output was generated under, which
-- makes "why did my matches change" debugging and any future eval-harness
-- regression check impossible to do precisely. Adds a `prompt_version` text
-- column (a plain date-stamp string, see PROMPT_VERSION in lib/anthropic.ts)
-- to every table that persists AI-generated content, stamped at insert time
-- going forward. Nullable, and existing rows are left null rather than
-- backfilled with a guess -- we don't actually know what version produced
-- them.

alter table school_matches add column if not exists prompt_version text;
alter table timeline_items add column if not exists prompt_version text;
alter table narrative_profiles add column if not exists prompt_version text;
alter table essay_feedback_history add column if not exists prompt_version text;
alter table activity_evaluations add column if not exists prompt_version text;
