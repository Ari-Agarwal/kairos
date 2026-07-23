-- Deletes all seeded test students (identified by the '%.test%@example.com'
-- email pattern used in seed_test_students.sql) and their dependent rows.
-- Run in the Supabase SQL editor.

delete from review_requests where user_id in (select id from auth.users where email like '%.test%@example.com');
delete from timeline_items where user_id in (select id from auth.users where email like '%.test%@example.com');
delete from school_matches where user_id in (select id from auth.users where email like '%.test%@example.com');
delete from profiles where user_id in (select id from auth.users where email like '%.test%@example.com');
delete from auth.users where email like '%.test%@example.com';
