-- Narrative Builder: guided questionnaire that synthesizes a student's
-- application throughline (values, formative moments, growth arc) into a
-- structured, saved doc they can reference across essays/activities.
-- Free feature, one row per user (answers + latest synthesis together,
-- like a living profile rather than a history log).

create table narrative_profiles (
  id                  uuid        primary key default gen_random_uuid(),
  user_id             uuid        not null unique references auth.users(id) on delete cascade,
  answers             jsonb       not null,
  throughline         text        check (char_length(throughline) <= 500),
  core_values         jsonb,
  growth_arc          text        check (char_length(growth_arc) <= 2000),
  differentiator      text        check (char_length(differentiator) <= 1000),
  essay_angles        jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table narrative_profiles enable row level security;

create policy "owner_all" on narrative_profiles
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_narrative_profiles_user_id on narrative_profiles(user_id);
