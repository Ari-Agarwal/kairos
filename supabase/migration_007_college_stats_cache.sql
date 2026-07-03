-- Migration 007: shared cache for real per-school stats pulled from the
-- College Scorecard API (acceptance rate, enrollment, ownership). Keyed by
-- normalized school name rather than user, since this is public reference
-- data shared across all students. Writes go through the service-role
-- client only (src/lib/college-scorecard.ts) — no client-side insert/update
-- policy is needed. Run in the Supabase SQL editor against BOTH staging and
-- production.

create table college_stats_cache (
  school_name text primary key,
  acceptance_rate numeric,
  enrollment integer,
  ownership text,
  found boolean not null default true,
  fetched_at timestamptz default now() not null
);

alter table college_stats_cache enable row level security;

create policy "authenticated users can read college stats cache" on college_stats_cache
  for select using (auth.role() = 'authenticated');
