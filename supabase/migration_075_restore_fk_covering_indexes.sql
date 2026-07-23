-- 075_restore_fk_covering_indexes.sql
-- migration_074 dropped idx_shared_list_reactions_token and
-- idx_waitlist_signups_referred_by as apparently-unused indexes, but each
-- turned out to be the sole covering index for a foreign key constraint on
-- its table (get_advisors immediately surfaced a new unindexed_foreign_keys
-- finding on re-run). Restoring both here.

CREATE INDEX IF NOT EXISTS idx_shared_list_reactions_token
  ON public.shared_list_reactions USING btree (share_token);

CREATE INDEX IF NOT EXISTS idx_waitlist_signups_referred_by
  ON public.waitlist_signups USING btree (referred_by);
