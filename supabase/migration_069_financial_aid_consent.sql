-- Financial aid consent/UX groundwork (Software_Timeline.md Section 1, item 3).
-- This is deliberately scoped to consent + input storage ONLY -- no net
-- price calculator, and nothing here is read by matches/scholarships/timeline
-- generation yet. That's an explicit, separate future pass per the doc's own
-- note that collecting sensitive family financial data needs its own
-- dedicated consent/UX pass first.
--
-- All columns are nullable and gated behind an explicit opt-in boolean
-- (financial_aid_info_consent) that defaults to false -- the product must
-- never require this to use the rest of Kairos. Income is stored as a
-- bracket/range label, never an exact figure, to keep the sensitivity (and
-- the product's liability) as low as reasonably possible for data that
-- isn't even used anywhere yet.
alter table profiles
  add column if not exists financial_aid_info_consent boolean not null default false,
  add column if not exists financial_aid_income_bracket text
    check (financial_aid_income_bracket in (
      'under_30k',
      '30k_60k',
      '60k_100k',
      '100k_150k',
      '150k_250k',
      'over_250k',
      'prefer_not_to_say'
    )),
  add column if not exists financial_aid_state text check (char_length(financial_aid_state) <= 100),
  add column if not exists financial_aid_family_size integer check (financial_aid_family_size is null or (financial_aid_family_size between 1 and 20)),
  add column if not exists financial_aid_info_updated_at timestamptz;
