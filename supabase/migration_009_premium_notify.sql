alter table profiles
  add column if not exists premium_notify_requested boolean not null default false;

-- Intended major (dropdown) and interests (free text) used to be crammed into
-- one field; splitting them so students can pick a major without losing the
-- ability to describe broader interests that don't map to a formal major.
alter table profiles
  add column if not exists interests text;
