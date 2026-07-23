-- Narrative Builder -> Activities coalescence (Software_Timeline.md 5a):
-- the synthesis can surface activities/contexts the student described in
-- their answers that aren't yet reflected in their tracked activities list.
-- Stored alongside the rest of the synthesis so a re-generate refreshes it
-- the same way essay_angles already does.
alter table narrative_profiles
  add column suggested_activities jsonb;
