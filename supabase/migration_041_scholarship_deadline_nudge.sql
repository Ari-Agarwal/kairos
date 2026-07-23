-- Scholarship deadline urgency nudge (Software_Timeline.md 5b): tracks which
-- tracked-but-not-yet-applied scholarships a student has already been sent a
-- "closing soon" SMS for, mirroring notified_scholarship_names' "don't repeat
-- yourself" role for the weekly new-match alert.
alter table profiles
  add column notified_scholarship_deadlines text[] default '{}';
