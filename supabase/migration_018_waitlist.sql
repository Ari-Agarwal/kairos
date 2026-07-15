-- Public "notify me at launch" waitlist. No auth required to sign up —
-- collected via a service-role API route (src/app/api/waitlist/route.ts),
-- same pattern as shared_links: no anon/public policy grants direct access,
-- the route is the only writer/reader.

create table waitlist_signups (
  id           uuid        primary key default gen_random_uuid(),
  contact      text        not null,
  contact_type text        not null check (contact_type in ('email', 'phone')),
  grad_year    text,
  sms_consent  boolean     not null default false,
  source       text,
  created_at   timestamptz not null default now()
);

alter table waitlist_signups enable row level security;

-- No policies: service-role client only, same as shared_links' anonymous-write pattern.

create unique index idx_waitlist_signups_contact on waitlist_signups(contact_type, contact);
create index idx_waitlist_signups_created_at on waitlist_signups(created_at);
