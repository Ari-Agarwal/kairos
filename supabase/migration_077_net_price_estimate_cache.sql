-- Net price calculator equivalent (Software_Timeline.md "Financial aid
-- buildout", item 1). Rough AI-estimated net price RANGE per school, keyed
-- by school + income bracket + family size + state -- deliberately NOT keyed
-- by student, since the estimate should be identical for any student sharing
-- those inputs at the same school. Mirrors the college_stats_cache /
-- career_path_cache pattern already used elsewhere in this app.
--
-- Never stores anything about a specific student -- income bracket is
-- already a range (never an exact figure), and no student identifier is
-- present on this table at all.
create table if not exists financial_aid_net_price_cache (
  cache_key text primary key,
  school_name text not null,
  income_bracket text not null,
  family_size integer not null,
  state text,
  estimated_net_price_low integer not null,
  estimated_net_price_high integer not null,
  aid_generosity text check (aid_generosity in ('low', 'moderate', 'high')),
  rationale text not null,
  fetched_at timestamptz not null default now()
);

alter table financial_aid_net_price_cache enable row level security;

-- Shared, non-personal reference data (same estimate for any student with
-- the same inputs) -- readable by any authenticated user, writable only by
-- the service role (the API route that populates it), same shape as the
-- existing college_stats_cache / career_path_cache policies.
create policy "financial_aid_net_price_cache_select_authenticated"
  on financial_aid_net_price_cache for select
  to authenticated
  using (true);
