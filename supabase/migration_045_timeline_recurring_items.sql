-- Recurring/standing timeline items (Software_Timeline.md 5g): distinguishes
-- an ongoing habit ("check email weekly," "SAT retake window") from a
-- one-off task that simply has no fixed date yet -- today both look
-- identical (due_date: null).
alter table timeline_items
  add column is_recurring boolean not null default false;
