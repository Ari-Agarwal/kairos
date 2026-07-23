-- Mock Interview difficulty ramp (Software_Timeline.md 5k): repeat sessions
-- in the same category should get harder/more specific questions rather than
-- resampling the same pool. interview_sessions had no category column, so
-- there was no way to count "how many times has this student practiced this
-- category" -- add it, populated going forward (existing rows stay null,
-- which the ramp logic treats as "no signal," not an error).
alter table interview_sessions
  add column category text;
