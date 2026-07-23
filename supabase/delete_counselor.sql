-- Deletes one specific counselor account and all dependent rows, by email.
-- Edit the email on the line below, then run in the Supabase SQL editor.
--
-- Note: students assigned to this counselor are NOT deleted -- their
-- profiles.counselor_id is just cleared, so they fall back to unassigned.

do $$
declare
  v_email text := 'REPLACE_WITH_COUNSELOR_EMAIL@example.com';
  v_user_id uuid;
  v_counselor_id uuid;
begin
  select user_id, counselor_id into v_user_id, v_counselor_id
  from counselors where email = v_email;

  if v_counselor_id is null then
    raise exception 'No counselor found with email %', v_email;
  end if;

  update profiles set counselor_id = null where counselor_id = v_counselor_id;
  delete from reminder_log where counselor_id = v_counselor_id;
  delete from counselor_notes where counselor_id = v_counselor_id;
  delete from counselors where counselor_id = v_counselor_id;
  delete from auth.users where id = v_user_id;
end $$;
