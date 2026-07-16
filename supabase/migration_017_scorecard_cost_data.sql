-- Migration 017: add cost/outcome columns to college_stats_cache pulled from
-- College Scorecard's cost and earnings endpoints. All nullable — Scorecard
-- doesn't carry every field for every school. Run in Supabase SQL editor
-- against both staging and production.

alter table college_stats_cache
  add column if not exists avg_net_price integer,
  add column if not exists cost_of_attendance integer,
  add column if not exists median_debt numeric,
  add column if not exists median_earnings_10yr integer;
