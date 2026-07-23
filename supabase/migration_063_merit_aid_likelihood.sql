-- Merit aid likelihood (Software_Timeline.md Section 10) -- distinct from
-- need-based aid, which stays blocked on collecting sensitive family
-- financial data + a dedicated consent/UX pass. This is derived purely from
-- the same GPA/test-score percentile placement already computed for each
-- school's category/percentage, so it needs no new inputs from the student.
alter table school_matches
  add column merit_aid_likelihood text check (merit_aid_likelihood in ('low', 'moderate', 'high', 'not applicable'));
