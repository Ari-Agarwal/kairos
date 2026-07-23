-- Software_Timeline.md Section 1 backlog: second "campus vibe" photo per
-- school, alongside the existing primary infobox photo. Same Wikipedia
-- source and 90-day cache as college_photo_cache (migration_027) -- just
-- extra columns on the same row rather than a new table, since it's the
-- same lookup and the same cache lifetime.

alter table college_photo_cache
  add column if not exists secondary_image_url text,
  add column if not exists secondary_width integer,
  add column if not exists secondary_height integer;
