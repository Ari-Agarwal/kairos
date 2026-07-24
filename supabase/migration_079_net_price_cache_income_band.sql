-- Companion to migration_078: financial_aid_net_price_cache was keyed by
-- income BRACKET (low cardinality, cheap to share across students). Now that
-- profiles stores an exact income figure, keying the cache by the raw exact
-- number would fragment it to nearly one row per family. Instead the cache
-- key uses income rounded to the nearest $10,000 band -- still shared across
-- similar families, still never keyed by student or storing an exact figure.
alter table financial_aid_net_price_cache
  rename column income_bracket to income_band;
