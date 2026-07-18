-- Counselors could already SELECT review_requests for their assigned
-- students (migration_014_human_escalation.sql) but had no UPDATE policy,
-- so a status-change UI would be silently rejected by RLS. This adds that
-- policy, scoped identically to the existing select policy. Column-level
-- restriction (status only, not review_notes/user_id) is enforced by the
-- API route, not the database -- the same trust boundary already used for
-- every other counselor-facing mutation in this app (e.g. send-reminder).

drop policy if exists "counselor updates assigned student review requests" on review_requests;
create policy "counselor updates assigned student review requests" on review_requests
  for update
  using (
    exists (
      select 1 from counselors c
      join profiles p on p.school_id = c.school_id
      where c.user_id = auth.uid() and p.user_id = review_requests.user_id
    )
  )
  with check (
    exists (
      select 1 from counselors c
      join profiles p on p.school_id = c.school_id
      where c.user_id = auth.uid() and p.user_id = review_requests.user_id
    )
  );
