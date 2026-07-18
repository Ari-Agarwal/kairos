-- At-risk flags had no acknowledge/snooze: once a student was flagged, they
-- stayed flagged (and kept re-surfacing) until the underlying condition
-- resolved itself, even after a counselor had already reached out. This
-- lets a counselor snooze a flag for a fixed window without waiting for
-- the condition to change.

create table if not exists at_risk_dismissals (
  id uuid primary key default gen_random_uuid(),
  counselor_id uuid references counselors(counselor_id) not null,
  student_user_id uuid references auth.users not null,
  dismissed_until timestamptz not null,
  created_at timestamptz default now(),
  unique (counselor_id, student_user_id)
);

alter table at_risk_dismissals enable row level security;

drop policy if exists "counselor manages own at-risk dismissals" on at_risk_dismissals;
create policy "counselor manages own at-risk dismissals" on at_risk_dismissals for all using (
  exists (select 1 from counselors c where c.counselor_id = at_risk_dismissals.counselor_id and c.user_id = auth.uid())
) with check (
  exists (select 1 from counselors c where c.counselor_id = at_risk_dismissals.counselor_id and c.user_id = auth.uid())
);
