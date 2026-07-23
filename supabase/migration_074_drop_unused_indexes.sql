-- 074_drop_unused_indexes.sql
-- Drops genuinely stale, zero-scan, non-unique/non-PK indexes confirmed via
-- pg_stat_user_indexes during the Jul 23 Supabase performance-advisor pass.
-- idx_shared_list_reactions_token and idx_waitlist_signups_referred_by were
-- also dropped here but turned out to be each table's sole FK-covering
-- index; they are recreated in migration_075_restore_fk_covering_indexes.sql.

DROP INDEX IF EXISTS idx_reports_status;
DROP INDEX IF EXISTS idx_profiles_referral_code;
DROP INDEX IF EXISTS idx_profiles_public_portfolio_token;
DROP INDEX IF EXISTS idx_ai_usage_log_endpoint_created;
DROP INDEX IF EXISTS idx_shared_list_reactions_token;
DROP INDEX IF EXISTS idx_waitlist_signups_referred_by;
