-- Seed a SECOND school + counselor + student, distinct from seed_counselor.sql's
-- "Test High School". Needed so RLS cross-tenant tests have two real tenants to
-- prove isolation between (a counselor/student at school A must never see school B's rows).
-- Run AFTER schema.sql + migration_001_counselor_dashboard.sql, and after creating
-- the counselor B / student B auth users (Authentication > Users), same as seed_counselor.sql.

-- 1. Create the second school.
insert into schools (name, district, license_tier, license_expiry)
values ('Test High School B', 'Test District B', 'small', '2027-06-30')
returning school_id;
-- Copy the returned school_id and paste it into the placeholders below.

-- 2. Link counselor B's auth user to school B.
insert into counselors (user_id, school_id, name, email)
values ('<COUNSELOR_B_AUTH_USER_ID>', '<SCHOOL_B_ID>', 'Test Counselor B', 'counselor-b@test.com');

-- 3. Attach student B to school B.
update profiles
set school_id = '<SCHOOL_B_ID>'
where user_id = '<STUDENT_B_AUTH_USER_ID>';
