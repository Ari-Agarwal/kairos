-- Covering indexes for FKs added in 050/054 (Software_Timeline.md 19):
-- flagged by the Supabase performance advisor right after those migrations
-- landed -- an uncovered FK forces a seq scan on the referenced table for
-- every delete/update, which matters here since both parent tables
-- (auth.users, counselors) see regular writes.
create index idx_profiles_referred_by_user_id on profiles(referred_by_user_id);
create index idx_timeline_items_assigned_by_counselor_id on timeline_items(assigned_by_counselor_id);
