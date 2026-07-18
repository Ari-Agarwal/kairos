-- Roster/at-risk/aggregate all did an auth.admin.getUserById round-trip per
-- student just to get a display name -- that per-student admin fan-out was
-- the real scaling bottleneck (roster pagination bounded it to a page, but
-- at-risk/aggregate still scan the whole school). Denormalizing the name
-- onto profiles removes the admin API call entirely for these read paths.

alter table profiles add column if not exists display_name text;

-- Backfill existing rows from auth.users metadata/email, same fallback
-- order every getUserById call site already used.
update profiles p
set display_name = coalesce(u.raw_user_meta_data->>'full_name', u.email)
from auth.users u
where u.id = p.user_id and p.display_name is null;
