-- Scholarship provider logos (Software_Timeline.md 5c): a small sponsor logo
-- next to each scholarship card, the same scannability aid college photos
-- give the match list. Mirrors migration_027_college_photo_cache.sql's
-- pattern exactly -- keyed by normalized organization name, shared across
-- all students, source is Wikipedia's REST API (same free/no-key rationale).
create table scholarship_logo_cache (
  organization_name text        primary key,
  image_url         text,
  width             integer,
  height            integer,
  attribution_text  text,
  attribution_url   text,
  found             boolean     not null default true,
  fetched_at        timestamptz default now() not null
);

alter table scholarship_logo_cache enable row level security;

create policy "authenticated users can read scholarship logo cache" on scholarship_logo_cache
  for select using (auth.role() = 'authenticated');
