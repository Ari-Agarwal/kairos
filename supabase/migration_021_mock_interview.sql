-- Phase 3, Section 5: AI mock interview simulator. Voice I/O runs entirely
-- in the browser (Web Speech API for speech-to-text input and
-- speech-synthesis output) rather than a third-party voice provider -- no
-- audio is ever sent to or stored on our servers, only the transcribed
-- text, which meaningfully reduces the consent/retention burden of
-- recording a minor's voice flagged for this item.

create table interview_sessions (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        not null references auth.users(id) on delete cascade,
  question          text        not null check (char_length(question) <= 2000),
  answer_transcript text        not null check (char_length(answer_transcript) <= 10000),
  score             int         check (score between 1 and 10),
  strengths         jsonb,
  improvements      jsonb,
  summary           text        check (char_length(summary) <= 2000),
  created_at        timestamptz not null default now()
);

alter table interview_sessions enable row level security;

create policy "owner_all" on interview_sessions
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_interview_sessions_user_id on interview_sessions(user_id);
