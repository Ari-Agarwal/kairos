-- Rec-letter collaboration: student fills a brag sheet per recommender,
-- gets a share token, and the recommender views AI talking points via a
-- public link with no login required.
--
-- brag_sheet stored as jsonb on recommenders (not a separate table) because
-- the content is always accessed alongside the recommender row, is never
-- queried independently across recommenders, and needs no normalization.
-- A separate table would only add a join on every read with no benefit.

create table recommenders (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        not null references auth.users(id) on delete cascade,
  recommender_name  text        not null check (char_length(recommender_name) <= 200),
  recommender_email text        check (char_length(recommender_email) <= 254),
  relationship      text        not null check (char_length(relationship) <= 200),
  status            text        not null default 'requested'
                                check (status in ('requested', 'reminded', 'submitted')),
  share_token       text        not null unique,
  brag_sheet        jsonb       not null default '{}',
  last_reminded_at  timestamptz,
  created_at        timestamptz not null default now()
);

alter table recommenders enable row level security;

create policy "owner_all" on recommenders
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_recommenders_user_id   on recommenders(user_id);
create index idx_recommenders_share_token on recommenders(share_token);
