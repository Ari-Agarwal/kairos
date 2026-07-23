-- Activity Evaluation hours-per-week input (Software_Timeline.md 5l): lets
-- the eval reason about depth/commitment (a specific, sustained, escalating
-- commitment vs. a shallow list), not just the free-text description. Keyed
-- by activity text rather than index, since extracurriculars is a plain
-- text[] with no stable id and lines get added/removed/reordered.
alter table profiles
  add column activity_hours jsonb not null default '{}'::jsonb;
