-- Migration 002: replace location_preference/college_goals with schools_already_considering,
-- and make intended_major required. Matches the schema.sql change from the Day 7 onboarding rework.
--
-- Run this in the Supabase SQL editor (Dashboard -> SQL Editor -> New query) against
-- BOTH staging and production projects.

-- 1. Add the new column, nullable for now (existing rows have no value yet).
alter table profiles add column if not exists schools_already_considering text;

-- 2. Backfill existing rows so the not-null constraint below doesn't fail on old data.
update profiles set schools_already_considering = 'None' where schools_already_considering is null;
update profiles set intended_major = 'Undecided' where intended_major is null;

-- 3. Now enforce the not-null constraints to match schema.sql.
alter table profiles alter column schools_already_considering set not null;
alter table profiles alter column intended_major set not null;

-- 4. Drop the old, no-longer-used columns.
alter table profiles drop column if exists location_preference;
alter table profiles drop column if exists college_goals;
