-- Counselor-initiated timeline/task assignment (Software_Timeline.md 8):
-- today only the AI generates each student's timeline; counselors have no
-- way to add a school-specific or cohort-wide task themselves. Tracks which
-- counselor assigned an item (nullable -- every other insert path leaves it
-- null) both for the student's own context and for the multi-counselor
-- coordination audit this same section flags.
alter table timeline_items
  add column assigned_by_counselor_id uuid references counselors(counselor_id) on delete set null;

-- The existing "own timeline" policy only lets a student insert rows for
-- themselves (auth.uid() = user_id) -- a counselor-authenticated request
-- needs its own insert policy, mirroring "counselor reads assigned student
-- timeline"'s existing school-scoped join, restricted to rows the counselor
-- is actually assigning (assigned_by_counselor_id must be their own row).
create policy "counselor assigns tasks to own students" on timeline_items
  for insert
  with check (
    assigned_by_counselor_id is not null
    and exists (
      select 1 from counselors c
      join profiles p on p.school_id = c.school_id
      where c.counselor_id = timeline_items.assigned_by_counselor_id
        and c.user_id = auth.uid()
        and p.user_id = timeline_items.user_id
    )
  );
