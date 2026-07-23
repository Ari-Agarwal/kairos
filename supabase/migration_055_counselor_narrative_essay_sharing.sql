-- Counselor-side narrative/essay visibility, with consent (Software_Timeline.md 8):
-- counselors currently see profile/roster/at-risk data but not essay drafts
-- or narrative-builder output. Single opt-in toggle (not per-document) --
-- a student either shares this qualitative work with their counselor or
-- doesn't; defaults to false so nothing is exposed without an explicit choice.
alter table profiles
  add column share_narrative_with_counselor boolean not null default false;

create policy "counselor reads shared student narrative" on narrative_profiles
  for select
  using (
    exists (
      select 1 from counselors c
      join profiles p on p.school_id = c.school_id
      where c.user_id = auth.uid()
        and p.user_id = narrative_profiles.user_id
        and p.share_narrative_with_counselor = true
    )
  );

create policy "counselor reads shared student essay feedback" on essay_feedback_history
  for select
  using (
    exists (
      select 1 from counselors c
      join profiles p on p.school_id = c.school_id
      where c.user_id = auth.uid()
        and p.user_id = essay_feedback_history.user_id
        and p.share_narrative_with_counselor = true
    )
  );
