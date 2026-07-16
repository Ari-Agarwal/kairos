-- Phase 3, Section 4: outcome-capture logging.
-- Students log accept/reject/waitlist + aid offer per school after decisions
-- arrive (March–April). Built now so the clock starts as soon as it's live.
-- school_match_id references school_matches.id so the outcome is tied to the
-- exact match record the student sees, not a freehand school name that could
-- diverge from the match list over time.

create table application_outcomes (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users not null,
  school_match_id uuid references school_matches(id) on delete cascade not null,
  decision_type   text not null check (decision_type in ('accept','reject','waitlist','defer')),
  aid_offer_amount numeric(12,2),
  decided_at      date not null,
  notes           text check (char_length(notes) <= 1000),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique (user_id, school_match_id)
);

alter table application_outcomes enable row level security;

create policy "own outcomes" on application_outcomes
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_application_outcomes_user_id on application_outcomes(user_id);
