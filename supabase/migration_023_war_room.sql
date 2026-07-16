-- Phase 3, Section 5: war room mode -- a shared comment thread per
-- application (school_match) for student + parent + mentor + counselor.
--
-- Same safety policy as the mentor loop (Section 8's conservative default):
-- parent access is via the existing shared_links token (read + a comment
-- endpoint, both service-role-backed, no direct RLS grant to anon), mentor
-- access requires an ACCEPTED mentor_requests row for this exact school
-- (not just any mentor relationship), and counselor access mirrors the
-- existing counselor/profile join used everywhere else in this schema.
-- role is set server-side by the API route after checking eligibility --
-- never trusted from client input -- so a comment can't claim to be from a
-- role the poster doesn't actually have.

create table war_room_comments (
  id               uuid        primary key default gen_random_uuid(),
  school_match_id  uuid        not null references school_matches(id) on delete cascade,
  user_id          uuid        references auth.users(id) on delete set null,
  shared_link_token text       references shared_links(token) on delete set null,
  role             text        not null check (role in ('student', 'parent', 'mentor', 'counselor')),
  body             text        not null check (char_length(body) <= 4000),
  created_at       timestamptz not null default now(),
  constraint has_author check (user_id is not null or shared_link_token is not null)
);

alter table war_room_comments enable row level security;

create policy "eligible_participants_read" on war_room_comments
  for select
  using (
    auth.uid() = (select sm.user_id from school_matches sm where sm.id = school_match_id)
    or exists (
      select 1 from counselors c
      join profiles p on p.school_id = c.school_id
      join school_matches sm on sm.user_id = p.user_id
      where c.user_id = auth.uid() and sm.id = school_match_id
    )
    or exists (
      select 1 from mentor_requests r
      join school_matches sm on sm.id = school_match_id
      where r.mentor_id = auth.uid()
        and r.status = 'accepted'
        and r.mentee_id = sm.user_id
        and r.school_name = sm.school_name
    )
  );

-- Parent comments (shared_link_token, no auth.uid()) are inserted via a
-- service-role API route that validates the token itself, so this insert
-- policy only needs to cover the three authenticated roles.
create policy "eligible_participants_write" on war_room_comments
  for insert
  with check (
    auth.uid() = user_id
    and (
      auth.uid() = (select sm.user_id from school_matches sm where sm.id = school_match_id)
      or exists (
        select 1 from counselors c
        join profiles p on p.school_id = c.school_id
        join school_matches sm on sm.user_id = p.user_id
        where c.user_id = auth.uid() and sm.id = school_match_id
      )
      or exists (
        select 1 from mentor_requests r
        join school_matches sm on sm.id = school_match_id
        where r.mentor_id = auth.uid()
          and r.status = 'accepted'
          and r.mentee_id = sm.user_id
          and r.school_name = sm.school_name
      )
    )
  );

create index idx_war_room_comments_match on war_room_comments(school_match_id);
