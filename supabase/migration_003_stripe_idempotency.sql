-- Migration 003: Stripe webhook idempotency
-- Records every Stripe event id we've already processed so redelivered events
-- (Stripe retries on timeout/non-2xx, and may deliver an event more than once)
-- are skipped instead of re-applied. Only the service role touches this table.

create table processed_stripe_events (
  event_id text primary key,
  type text not null,
  processed_at timestamptz not null default now()
);

-- RLS on with no policies: the anon/authenticated keys get zero access; the
-- webhook uses the service role, which bypasses RLS.
alter table processed_stripe_events enable row level security;
