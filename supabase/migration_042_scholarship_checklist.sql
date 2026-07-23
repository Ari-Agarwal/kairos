-- Scholarship application-progress checklist (Software_Timeline.md 5b):
-- a scholarship often has its own mini-application (essay, recommender,
-- form), so the binary saved/applied status alone doesn't show how far
-- along a tracked scholarship actually is. Stored as jsonb on the existing
-- per-scholarship tracker row rather than a new table, since it's always
-- read/written alongside that row and never queried independently.
alter table scholarship_tracker
  add column checklist jsonb not null default '[]'::jsonb;
