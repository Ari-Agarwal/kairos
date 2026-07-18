-- Scholarships had no saved/applied tracking -- nothing persisted which
-- scholarships a student had started or submitted. Scholarships aren't
-- rows in the DB (they're a static JSON dataset in lib/scholarships.ts), so
-- this keys off the scholarship's name rather than a foreign key.

create table if not exists scholarship_tracker (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  scholarship_name text not null,
  status text check (status in ('saved', 'applied')) not null,
  created_at timestamptz default now(),
  unique (user_id, scholarship_name)
);

alter table scholarship_tracker enable row level security;

drop policy if exists "own scholarship tracker" on scholarship_tracker;
create policy "own scholarship tracker" on scholarship_tracker
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
