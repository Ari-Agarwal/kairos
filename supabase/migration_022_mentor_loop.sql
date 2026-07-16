-- Phase 3, Section 5: mentor loop. A student who logged an "accept" outcome
-- for a school can opt in to mentor applicants to that same school.
--
-- Safety policy (per Section 8's conservative-default decision, applied
-- here): first contact is NOT open direct messaging. A mentee sends a
-- request; messaging only unlocks once the mentor explicitly accepts. Every
-- message insert must also pass the app-layer isBlocked() check from
-- src/lib/safety.ts before being allowed, and ReportBlockMenu is wired into
-- the thread UI from message one.

alter table profiles
  add column if not exists mentor_opt_in boolean not null default false,
  add column if not exists mentor_bio text check (char_length(mentor_bio) <= 1000);

create table mentor_requests (
  id           uuid        primary key default gen_random_uuid(),
  mentee_id    uuid        not null references auth.users(id) on delete cascade,
  mentor_id    uuid        not null references auth.users(id) on delete cascade,
  school_name  text        not null check (char_length(school_name) <= 200),
  intro        text        not null check (char_length(intro) <= 1000),
  status       text        not null default 'pending'
                           check (status in ('pending', 'accepted', 'declined')),
  created_at   timestamptz not null default now(),
  responded_at timestamptz,
  constraint no_self_mentor check (mentee_id <> mentor_id)
);

alter table mentor_requests enable row level security;

-- Both participants can see a request; only the mentee can create one (as
-- themselves); only the mentor can update it (accept/decline, as themselves).
create policy "participants_read" on mentor_requests
  for select
  using (auth.uid() = mentee_id or auth.uid() = mentor_id);

create policy "mentee_creates" on mentor_requests
  for insert
  with check (auth.uid() = mentee_id);

create policy "mentor_responds" on mentor_requests
  for update
  using (auth.uid() = mentor_id)
  with check (auth.uid() = mentor_id);

create index idx_mentor_requests_mentee on mentor_requests(mentee_id);
create index idx_mentor_requests_mentor on mentor_requests(mentor_id);

create table mentor_messages (
  id          uuid        primary key default gen_random_uuid(),
  request_id  uuid        not null references mentor_requests(id) on delete cascade,
  sender_id   uuid        not null references auth.users(id) on delete cascade,
  body        text        not null check (char_length(body) <= 4000),
  created_at  timestamptz not null default now()
);

alter table mentor_messages enable row level security;

-- Only the two participants of the parent request can see or send messages,
-- and only once that request has been accepted -- enforces "moderated first
-- contact" at the database layer, not just in application code.
create policy "participants_read_messages" on mentor_messages
  for select
  using (
    exists (
      select 1 from mentor_requests r
      where r.id = mentor_messages.request_id
        and (auth.uid() = r.mentee_id or auth.uid() = r.mentor_id)
    )
  );

create policy "participants_send_messages" on mentor_messages
  for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from mentor_requests r
      where r.id = mentor_messages.request_id
        and r.status = 'accepted'
        and (auth.uid() = r.mentee_id or auth.uid() = r.mentor_id)
    )
  );

create index idx_mentor_messages_request on mentor_messages(request_id);
