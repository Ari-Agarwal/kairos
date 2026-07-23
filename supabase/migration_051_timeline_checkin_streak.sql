-- Timeline check-in streak signal (Software_Timeline.md 6b): a low-pressure
-- habit signal tied to weekly (not daily -- this process isn't a daily-use
-- app, and a daily-streak framing would punish normal usage patterns)
-- timeline visits, mirroring what the single-session progress/momentum
-- indicator (5g) does across sessions instead of within one.
alter table profiles
  add column checkin_streak_weeks int not null default 0,
  add column last_checkin_week text;
