-- Section 16: shareable (opt-in) public student portfolio -- a clean,
-- link-able page a student can hand to a scholarship application, put in a
-- LinkedIn-style profile, or send a recommender, with none of the
-- counselor/parent-facing data (grades, scores, financial info, essays,
-- school matches).
--
-- Follows the same "token on the row, service-role client resolves it"
-- pattern as shared_links (migration_015) and recommenders.share_token --
-- but the token lives directly on profiles since a student has at most one
-- public portfolio, not a list of revocable links.
--
-- Separate opt-in from share_narrative_with_counselor (migration_055) on
-- purpose: that flag exposes narrative/essay work to a school counselor
-- inside Kairos; this one exposes throughline + core values (never essay
-- content) to the entire public internet. Reusing the counselor flag would
-- silently widen its blast radius, so this gets its own explicit toggle.
alter table profiles
  add column public_portfolio_enabled boolean not null default false,
  add column public_portfolio_token text unique;

create index if not exists idx_profiles_public_portfolio_token
  on profiles (public_portfolio_token)
  where public_portfolio_token is not null;
