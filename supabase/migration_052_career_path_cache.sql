-- Career path server-side caching (Software_Timeline.md 6d): results were
-- only cached client-side per session (a useRef Map), so every new session
-- re-hit the AI for the same school+major pairing. Shared across all
-- students, same rationale as college_stats_cache/college_photo_cache --
-- career patterns for a given major/school pairing don't vary per student.
create table career_path_cache (
  cache_key         text        primary key,
  internships       jsonb       not null,
  employer_types    jsonb       not null,
  median_salary     text        not null,
  summary           text        not null,
  confidence        text,
  fetched_at        timestamptz not null default now()
);

alter table career_path_cache enable row level security;

create policy "authenticated users can read career path cache" on career_path_cache
  for select using (auth.role() = 'authenticated');
