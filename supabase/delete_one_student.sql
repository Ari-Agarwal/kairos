-- Deletes one specific student and all dependent rows, by email.
-- Edit the email on the line below, then run in the Supabase SQL editor.

do $$
declare
  v_email text := 'REPLACE_WITH_STUDENT_EMAIL@example.com';
  v_user_id uuid;
begin
  select id into v_user_id from auth.users where email = v_email;

  if v_user_id is null then
    raise exception 'No user found with email %', v_email;
  end if;

  delete from review_requests where user_id = v_user_id;
  delete from reminder_log where student_user_id = v_user_id;
  delete from counselor_notes where student_user_id = v_user_id;
  delete from regeneration_log where user_id = v_user_id;
  delete from timeline_items where user_id = v_user_id;
  delete from school_matches where user_id = v_user_id;
  delete from profiles where user_id = v_user_id;
  delete from auth.users where id = v_user_id;
end $$;
