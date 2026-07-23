-- Matches lock affordance (Software_Timeline.md 5f): let a student lock a
-- school so a regenerate can't touch it, only fill in/adjust the rest.
alter table school_matches
  add column locked boolean not null default false;
