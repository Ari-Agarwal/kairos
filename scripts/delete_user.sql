-- Fully delete a user and all their data from Kairos.
-- Run in Supabase SQL editor. Replace the UUID below with the target user's id.

do $$
declare
  target_user_id uuid := '00000000-0000-0000-0000-000000000000'; -- <-- replace me
begin
  delete from reminder_log where student_user_id = target_user_id;
  delete from counselor_notes where student_user_id = target_user_id;
  delete from regeneration_log where user_id = target_user_id;
  delete from timeline_items where user_id = target_user_id;
  delete from school_matches where user_id = target_user_id;
  delete from counselors where user_id = target_user_id;
  delete from profiles where user_id = target_user_id;

  -- finally remove the auth user itself (cascades to any remaining auth-owned data)
  delete from auth.users where id = target_user_id;
end $$;
