-- Financial aid / affordability (Software_Timeline.md Section 10): FAFSA and
-- CSS Profile deadlines were already being generated inside the "logistics"
-- section of the timeline (LOGISTICS_PROMPT already instructs the model to
-- surface FAFSA opening Oct 1 and CSS Profile deadlines for ED applicants),
-- but nothing distinctly tagged them as financial-aid items -- there was no
-- way to filter a student's timeline down to just the aid-related deadlines,
-- which are some of the highest-stakes dates in the whole process (missing
-- one can eliminate aid eligibility entirely, unlike a merely-late application).
alter table timeline_items
  add column if not exists is_financial_aid boolean default false not null;
