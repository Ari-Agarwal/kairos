-- Section 9b: two-way layer on top of the existing read-only shared view
-- (migration_015_shared_views.sql). A parent/family member holding the
-- share token can leave a reaction/comment on a specific matched school;
-- the student then sees it on their own /matches page.
--
-- Trust model matches the existing shared view exactly:
--   - Writes require only a valid, non-revoked, non-expired share token.
--     No login for the parent. All writes go through the service-role
--     client in the API route (POST /api/shared/[token]/react), which
--     re-validates the token and confirms the school_match_id belongs to
--     that token's own student before inserting -- same checks as the
--     existing GET route, so a token can never write against a school
--     that isn't the linked student's.
--   - Reads are scoped to the student's own data via RLS below, following
--     the same "own rows only" pattern as school_matches / timeline_items
--     (schema.sql) and counselor_student_notes (migration_059).
--
-- No financial/grades/essay/narrative content is exposed either direction --
-- only a reaction plus a short free-text comment, tied to a school match.

create table if not exists shared_list_reactions (
  id              uuid        primary key default gen_random_uuid(),
  share_token     text        not null references shared_links(token) on delete cascade,
  school_match_id uuid        not null references school_matches(id) on delete cascade,
  reaction        text        check (reaction in ('up', 'down')),
  comment         text        check (char_length(comment) <= 500),
  created_at      timestamptz not null default now(),
  constraint shared_list_reactions_has_content check (reaction is not null or comment is not null)
);

alter table shared_list_reactions enable row level security;

-- Students read reactions left on their own matches. No insert/update/delete
-- policy is granted here -- writes happen exclusively through the
-- service-role client in the API route, gated by token validation rather
-- than auth.uid(), the same split used for shared_links itself.
drop policy if exists "student reads own match reactions" on shared_list_reactions;
create policy "student reads own match reactions" on shared_list_reactions for select using (
  exists (
    select 1 from school_matches sm
    where sm.id = shared_list_reactions.school_match_id
      and sm.user_id = auth.uid()
  )
);

create index if not exists idx_shared_list_reactions_match on shared_list_reactions(school_match_id);
create index if not exists idx_shared_list_reactions_token on shared_list_reactions(share_token);
