-- Migration 006: weekly regeneration cap for the timeline, mirroring the
-- existing matches cap. Reuses regeneration_log (already keyed by
-- user_id + week_start_date) instead of a new table. Run in the Supabase
-- SQL editor against BOTH staging and production.

alter table regeneration_log add column if not exists timeline_count int default 0 not null;
