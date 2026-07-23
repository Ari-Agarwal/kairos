-- Confidence/uncertainty surfaced, not just cited sourcing (Software_Timeline.md
-- 6a): matches reasoning is probabilistic; showing how confident the model
-- actually is (not just what it's based on) sets more honest expectations,
-- especially since false precision on admissions odds is a named trust risk.
alter table school_matches
  add column confidence text check (confidence in ('low', 'moderate', 'high'));
