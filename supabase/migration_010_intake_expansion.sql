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
