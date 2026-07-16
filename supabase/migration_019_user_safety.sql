-- Phase 3, Section 8: user-to-user safety infrastructure. Built before any
-- feature that puts one student in contact with another (mentor loop, war
-- room) -- Section 5's own scoping note requires the safety policy decided
-- and built first, not bolted on after minors are already messaging.
--
-- Policy decision (Jul 15): default to the more conservative contact model.
-- Any future user-to-user feature must check both `blocks` (mutual silence,
-- no notification to the blocked party) and route first contact through
-- moderation/flagging rather than fully open direct messaging. `reports`
-- covers arbitrary content types via (content_type, content_id) rather than
-- a foreign key, since mentor_message / war_room_comment tables don't exist
-- yet -- each new contact feature just picks a content_type string.

create table blocks (
  id          uuid        primary key default gen_random_uuid(),
  blocker_id  uuid        not null references auth.users(id) on delete cascade,
  blocked_id  uuid        not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  constraint no_self_block check (blocker_id <> blocked_id),
  constraint unique_block unique (blocker_id, blocked_id)
);

alter table blocks enable row level security;

-- A user can see and create their own blocks (who they've blocked), but
-- never sees who has blocked them -- that stays silent by design.
create policy "owner_manages_own_blocks" on blocks
  for all
  using (auth.uid() = blocker_id)
  with check (auth.uid() = blocker_id);

create index idx_blocks_blocker on blocks(blocker_id);
create index idx_blocks_blocked on blocks(blocked_id);

create table reports (
  id               uuid        primary key default gen_random_uuid(),
  reporter_id      uuid        not null references auth.users(id) on delete cascade,
  reported_user_id uuid        references auth.users(id) on delete set null,
  content_type     text        not null check (char_length(content_type) <= 100),
  content_id       uuid,
  reason           text        not null check (char_length(reason) <= 2000),
  status           text        not null default 'pending'
                               check (status in ('pending', 'reviewed', 'actioned', 'dismissed')),
  created_at       timestamptz not null default now(),
  reviewed_at      timestamptz
);

alter table reports enable row level security;

-- A reporter can create and see their own reports (e.g. to confirm it went
-- through), but not other people's reports or the moderation queue itself --
-- that requires a separate admin surface, not exposed to students.
create policy "reporter_creates_and_reads_own" on reports
  for all
  using (auth.uid() = reporter_id)
  with check (auth.uid() = reporter_id);

create index idx_reports_reporter on reports(reporter_id);
create index idx_reports_reported_user on reports(reported_user_id);
create index idx_reports_status on reports(status);
