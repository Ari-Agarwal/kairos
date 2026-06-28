-- Seed a test school + counselor, and attach an existing student to that school.
-- Run AFTER migration_001_counselor_dashboard.sql, and AFTER you've created the
-- counselor's login (see instructions above this file) so you have their auth user_id.

-- 1. Create the school.
insert into schools (name, district, license_tier, license_expiry)
values ('Test High School', 'Test District', 'small', '2027-06-30')
returning school_id;
-- Copy the returned school_id and paste it into the placeholders below.

-- 2. Link the counselor's auth user to that school.
-- Replace '<COUNSELOR_AUTH_USER_ID>' with the UUID from Authentication > Users
-- for the account you created for the counselor.
-- Replace '<SCHOOL_ID>' with the school_id returned above.
insert into counselors (user_id, school_id, name, email)
values ('<COUNSELOR_AUTH_USER_ID>', '<SCHOOL_ID>', 'Test Counselor', 'counselor@test.com');

-- 3. Attach one or more existing students to that school so they show up on the
-- counselor's roster. Replace '<STUDENT_AUTH_USER_ID>' with a student's user_id
-- (the same id used as profiles.user_id).
update profiles
set school_id = '<SCHOOL_ID>'
where user_id = '<STUDENT_AUTH_USER_ID>';
