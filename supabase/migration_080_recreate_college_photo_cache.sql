-- Recreates college_photo_cache for any environment that never ran the
-- original migration_026/migration_027 (those files were since deleted from
-- the repo, presumably consolidated at some point). Discovered when staging
-- was migrated for the first time via migration_065's bootstrap: that
-- bootstrap hard-codes migrations 001-064 as "already applied," which is
-- only true for databases (like production) that had this schema created
-- manually before the tracking system existed. A never-before-migrated
-- database like staging needs the real table. Schema below matches
-- production's college_photo_cache exactly (pulled from information_schema).
create table if not exists college_photo_cache (
  school_name text primary key,
  image_url text,
  width integer,
  height integer,
  attribution_text text,
  attribution_url text,
  found boolean not null default true,
  fetched_at timestamptz not null default now(),
  secondary_image_url text,
  secondary_width integer,
  secondary_height integer
);

alter table college_photo_cache enable row level security;

create policy "authenticated users can read college photo cache"
  on college_photo_cache for select
  to authenticated
  using (auth.role() = 'authenticated');
