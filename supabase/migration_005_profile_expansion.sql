-- Migration 005: richer profile — current school and required social/campus
-- preferences used by matching. Run in the Supabase SQL editor against BOTH
-- staging and production. Nothing has run yet as of this file's last edit.

-- 1. Current school the student attends.
alter table profiles add column if not exists current_school text;
update profiles set current_school = 'Not specified' where current_school is null;
alter table profiles alter column current_school set not null;

-- 2. Campus-fit preferences — required (not optional): every student picks a
--    size and setting, "No preference" being an explicit valid answer.
alter table profiles add column if not exists campus_size_pref text
  check (campus_size_pref in ('Small','Medium','Large','No preference'));
update profiles set campus_size_pref = 'No preference' where campus_size_pref is null;
alter table profiles alter column campus_size_pref set not null;

alter table profiles add column if not exists campus_setting_pref text
  check (campus_setting_pref in ('Urban','Suburban','Rural','No preference'));
update profiles set campus_setting_pref = 'No preference' where campus_setting_pref is null;
alter table profiles alter column campus_setting_pref set not null;
