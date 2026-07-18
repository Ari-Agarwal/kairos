-- Essay feedback was entirely stateless -- switching modes cleared results
-- and nothing persisted across submissions, so a student couldn't compare
-- feedback across drafts. This adds a history table, written to on every
-- successful feedback generation.

create table if not exists essay_feedback_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  school text,
  essay_text text not null,
  feedback jsonb not null,
  is_rubric boolean not null default false,
  created_at timestamptz default now()
);

alter table essay_feedback_history enable row level security;

drop policy if exists "own essay feedback history" on essay_feedback_history;
create policy "own essay feedback history" on essay_feedback_history
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
