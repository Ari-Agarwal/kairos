-- Shared links: students create invite tokens for parent/counselor read-only views.
-- Token is generated in the API route (crypto.randomBytes(32).toString('hex'), 256 bits),
-- stored as the primary key. No sequential ID — cannot be enumerated.
-- Anonymous viewers never query this table directly; the API route uses the
-- service-role client so no RLS policy grants anonymous/public access.

create table shared_links (
  token     text        primary key,
  user_id   uuid        not null references auth.users(id) on delete cascade,
  label     text,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '30 days',
  revoked_at  timestamptz
);

alter table shared_links enable row level security;

create policy "owner_all" on shared_links
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_shared_links_user_id on shared_links(user_id);
