-- Timeline generation blocked the whole prep flow in the foreground for up
-- to ~50s behind a client-side AbortController, with only a generic loading
-- label. This backs a background-job pattern: the route validates and
-- kicks off generation, then the client polls this table for completion
-- instead of holding one long-lived request open.

create table if not exists generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  feature text not null,
  status text check (status in ('pending', 'done', 'error')) not null default 'pending',
  error_message text,
  updated_at timestamptz default now(),
  unique (user_id, feature)
);

alter table generation_jobs enable row level security;

drop policy if exists "own generation jobs" on generation_jobs;
create policy "own generation jobs" on generation_jobs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
