-- Security audit (Software_Timeline.md Section 12), Jul 23. Fixes the two
-- items from the advisors check that were safe to act on without a product
-- decision:
--
-- 1. notify_waitlist_growth_webhook() is a trigger function only (fires on
--    waitlist_signups insert) -- it was never meant to be callable directly
--    via /rest/v1/rpc/notify_waitlist_growth_webhook by anon/authenticated.
--    Revoking direct EXECUTE doesn't affect the trigger itself, which runs
--    as the table owner regardless of role grants.
-- 2. Its search_path was mutable -- pinned to prevent a search-path-hijack
--    attack via a same-named function in another schema.
--
-- check_rate_limit and get_student_count are left as-is: both are
-- intentionally called from unauthenticated routes (waitlist signup, the
-- public shared-link view, the pre-auth landing page's student counter), so
-- their anon/authenticated EXECUTE grants are real requirements, not gaps.
-- The remaining rls_enabled_no_policy INFOs (ai_usage_log,
-- processed_stripe_events, rate_limits, waitlist_signups) are all
-- service-role-only tables with no client-facing policy by design -- no
-- change needed, matching the Section 19 note that first flagged these.

alter function public.notify_waitlist_growth_webhook() set search_path = public;

-- Revoking from anon/authenticated alone isn't enough -- Postgres grants
-- EXECUTE to the implicit PUBLIC role by default at function creation, and
-- both anon/authenticated inherit through it, so PUBLIC itself must be
-- revoked too (verified live: only revoking anon/authenticated left the
-- advisor warning in place because PUBLIC still granted it).
revoke execute on function public.notify_waitlist_growth_webhook() from anon;
revoke execute on function public.notify_waitlist_growth_webhook() from authenticated;
revoke execute on function public.notify_waitlist_growth_webhook() from public;
