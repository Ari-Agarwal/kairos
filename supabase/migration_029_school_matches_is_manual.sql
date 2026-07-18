-- MatchListClient.tsx detected manually-added schools by string-comparing
-- why_text against a hardcoded sentinel ("Added manually by you.") -- a
-- fragile flag that would misfire if AI-generated why_text ever happened to
-- match it. Replace with a real boolean, backfilled from the same sentinel.

alter table school_matches add column if not exists is_manual boolean not null default false;

update school_matches set is_manual = true where why_text = 'Added manually by you.';
