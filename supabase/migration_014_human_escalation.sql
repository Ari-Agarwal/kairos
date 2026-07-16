-- Migration 014: human-escalation review requests table.
-- One request per student per calendar year (yearly cap mirrors the weekly
-- regeneration cap in regeneration_log but enforced in-app rather than via
-- a separate log table — the review_requests rows ARE the canonical record).

create table if not exists review_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  status text check (status in ('pending', 'in_progress', 'completed')) default 'pending' not null,
  review_notes text not null,
  created_at timestamptz default now()
);

alter table review_requests enable row level security;

-- Students see and create only their own requests.
drop policy if exists "student owns review requests" on review_requests;
create policy "student owns review requests" on review_requests
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Counselors see requests only from students assigned to their school,
-- mirroring the "counselor reads assigned student matches" pattern in
-- migration_001_counselor_dashboard.sql.
drop policy if exists "counselor reads assigned student review requests" on review_requests;
create policy "counselor reads assigned student review requests" on review_requests
  for select
  using (
    exists (
      select 1 from counselors c
      join profiles p on p.school_id = c.school_id
      where c.user_id = auth.uid() and p.user_id = review_requests.user_id
    )
  );
