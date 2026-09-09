-- Replaces the /admin/* routes' shared-secret-in-URL gate (?key=...) with a
-- real per-user flag tied to an authenticated Supabase session. The old
-- pattern meant anyone holding the key had permanent, unaudited, unrevocable
-- access, and the key could leak via browser history or shared screenshots.
alter table profiles add column if not exists is_admin boolean not null default false;

-- Row-level security on profiles already restricts a user to reading their
-- own row (existing "own profile" policy from earlier migrations), so no new
-- policy is needed for a user to see their own is_admin value. The admin
-- pages themselves read this via the service-role client, which bypasses RLS
-- entirely, matching the pattern already used for every other admin query in
-- those routes.
