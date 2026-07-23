-- Section 8: per-student free-form notes log (chronological, many-per-student),
-- distinct from the existing single auto-saved counselor_notes text field.
-- Counselors juggling dozens of students need a running log ("talked to
-- parent Tuesday, considering gap year") rather than one overwritable blob.

create table if not exists counselor_student_notes (
  id uuid primary key default gen_random_uuid(),
  counselor_id uuid references counselors(counselor_id) not null,
  student_user_id uuid references auth.users not null,
  body text not null,
  created_at timestamptz default now()
);

alter table counselor_student_notes enable row level security;

drop policy if exists "counselor manages own student notes" on counselor_student_notes;
create policy "counselor manages own student notes" on counselor_student_notes for all using (
  exists (select 1 from counselors c where c.counselor_id = counselor_student_notes.counselor_id and c.user_id = auth.uid())
) with check (
  exists (select 1 from counselors c where c.counselor_id = counselor_student_notes.counselor_id and c.user_id = auth.uid())
);
