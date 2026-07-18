-- Activity evaluation had no persistence -- each run was stateless, so a
-- student editing their activity list and re-evaluating had no way to see
-- whether the score actually improved.

create table if not exists activity_evaluations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  activities_text text not null,
  score int not null,
  score_rationale text not null,
  suggestions jsonb not null,
  per_activity jsonb,
  created_at timestamptz default now()
);

alter table activity_evaluations enable row level security;

drop policy if exists "own activity evaluations" on activity_evaluations;
create policy "own activity evaluations" on activity_evaluations
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
