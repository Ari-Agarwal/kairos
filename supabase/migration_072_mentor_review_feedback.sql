-- Admissions-officer feedback substitutes, alumni/near-peer review network
-- (Software_Timeline.md Section 1, item 4). Extends the existing
-- mentor_messages table (migration_022_mentor_loop.sql) rather than building
-- a parallel system: a mentor (recent admit / current student) can now tag a
-- message as structured "application review feedback" distinct from an
-- ordinary chat message, reusing the same thread, RLS policies, and
-- moderation (isBlocked / ReportBlockMenu) already in place for mentor
-- messaging.
alter table mentor_messages
  add column if not exists message_type text not null default 'chat'
    check (message_type in ('chat', 'review_feedback'));

-- Only the mentor side of a request should be able to post review_feedback
-- (a mentee giving themselves "review feedback" wouldn't make sense) --
-- enforced at the RLS layer, not just the UI, so this can't be spoofed by a
-- direct API call either.
-- Written with (select auth.uid()) throughout (not bare auth.uid()) to stay
-- consistent with the auth_rls_initplan fix in migration_071.
drop policy if exists "participants_send_messages" on mentor_messages;
create policy "participants_send_messages" on mentor_messages
  for insert
  with check (
    (select auth.uid()) = sender_id
    and exists (
      select 1 from mentor_requests r
      where r.id = mentor_messages.request_id
        and r.status = 'accepted'
        and ((select auth.uid()) = r.mentee_id or (select auth.uid()) = r.mentor_id)
    )
    and (
      message_type = 'chat'
      or (
        message_type = 'review_feedback'
        and exists (
          select 1 from mentor_requests r
          where r.id = mentor_messages.request_id and r.mentor_id = (select auth.uid())
        )
      )
    )
  );
