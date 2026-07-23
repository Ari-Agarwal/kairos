-- Multi-counselor coordination (Software_Timeline.md Section 1, Counselor
-- tools). Product decision: broaden reminder_log / at_risk_dismissals
-- visibility to school-wide, so counselors at the same school can see each
-- other's outreach and snoozes on a shared student -- avoiding duplicate
-- reminders and redundant at-risk review. No student-ownership/assignment
-- model was requested; any counselor at the school can also act (snooze,
-- un-snooze, delete, log a reminder) the same way any counselor can already
-- see/message any student at their school today.
--
-- Previously both tables had a single "for all" policy scoped to
-- `c.user_id = auth.uid()` (the individual counselor). That's replaced here
-- with a school-scoped SELECT policy (matching the join idiom already used
-- by "counselor reads assigned student matches" / "...timeline" on
-- school_matches / timeline_items: counselors c join profiles p on
-- p.school_id = c.school_id, matched on the student's user id) plus
-- separate INSERT/UPDATE/DELETE policies scoped to school as well, since no
-- ownership model exists to restrict writes further.

drop policy if exists "counselor manages own reminders" on reminder_log;

create policy "counselor reads school reminders" on reminder_log for select using (
  exists (
    select 1 from counselors c
    join profiles p on p.school_id = c.school_id
    where c.user_id = (select auth.uid()) and p.user_id = reminder_log.student_user_id
  )
);

create policy "counselor logs reminders for school students" on reminder_log for insert with check (
  exists (
    select 1 from counselors c
    join profiles p on p.school_id = c.school_id
    where c.user_id = (select auth.uid()) and p.user_id = reminder_log.student_user_id
  )
);

create policy "counselor updates school reminders" on reminder_log for update using (
  exists (
    select 1 from counselors c
    join profiles p on p.school_id = c.school_id
    where c.user_id = (select auth.uid()) and p.user_id = reminder_log.student_user_id
  )
) with check (
  exists (
    select 1 from counselors c
    join profiles p on p.school_id = c.school_id
    where c.user_id = (select auth.uid()) and p.user_id = reminder_log.student_user_id
  )
);

create policy "counselor deletes school reminders" on reminder_log for delete using (
  exists (
    select 1 from counselors c
    join profiles p on p.school_id = c.school_id
    where c.user_id = (select auth.uid()) and p.user_id = reminder_log.student_user_id
  )
);

drop policy if exists "counselor manages own at-risk dismissals" on at_risk_dismissals;

create policy "counselor reads school at-risk dismissals" on at_risk_dismissals for select using (
  exists (
    select 1 from counselors c
    join profiles p on p.school_id = c.school_id
    where c.user_id = (select auth.uid()) and p.user_id = at_risk_dismissals.student_user_id
  )
);

create policy "counselor snoozes at-risk for school students" on at_risk_dismissals for insert with check (
  exists (
    select 1 from counselors c
    join profiles p on p.school_id = c.school_id
    where c.user_id = (select auth.uid()) and p.user_id = at_risk_dismissals.student_user_id
  )
);

create policy "counselor updates school at-risk dismissals" on at_risk_dismissals for update using (
  exists (
    select 1 from counselors c
    join profiles p on p.school_id = c.school_id
    where c.user_id = (select auth.uid()) and p.user_id = at_risk_dismissals.student_user_id
  )
) with check (
  exists (
    select 1 from counselors c
    join profiles p on p.school_id = c.school_id
    where c.user_id = (select auth.uid()) and p.user_id = at_risk_dismissals.student_user_id
  )
);

create policy "counselor deletes school at-risk dismissals" on at_risk_dismissals for delete using (
  exists (
    select 1 from counselors c
    join profiles p on p.school_id = c.school_id
    where c.user_id = (select auth.uid()) and p.user_id = at_risk_dismissals.student_user_id
  )
);
