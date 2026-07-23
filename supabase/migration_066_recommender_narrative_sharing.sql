-- Recommender-facing brief export (Software_Timeline.md Section 16) --
-- lets a student optionally share their Narrative Builder highlights on
-- the token-linked recommender page, so the recommender gets a genuinely
-- useful brief (activities + narrative highlights + AI talking points),
-- not just the brag-sheet fields they already had.
--
-- Deliberately a SEPARATE flag from share_narrative_with_counselor
-- (migration_055) rather than reusing it -- a recommender link is a public,
-- no-login token surface (lower trust boundary than an authenticated
-- counselor session), so a student may reasonably want one shared and not
-- the other.
alter table profiles
  add column share_narrative_with_recommender boolean not null default false;
