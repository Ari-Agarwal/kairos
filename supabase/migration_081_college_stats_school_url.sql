-- Migration 081: add school_url to college_stats_cache, pulled from College
-- Scorecard's "school.school_url" field. Used to build a real school logo
-- (via a domain-keyed logo service) for match-list cards, since the previous
-- Wikipedia-photo-only approach had no logo source at all. Nullable -- not
-- every school in Scorecard has a populated school_url. Run in Supabase SQL
-- editor against both staging and production.

alter table college_stats_cache
  add column if not exists school_url text;
