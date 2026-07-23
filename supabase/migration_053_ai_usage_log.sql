-- Rate-limit/cost monitoring (Software_Timeline.md 6d): logAiUsage previously
-- only wrote a structured line to stdout (picked up by whatever log
-- aggregator the host provides), with no queryable persisted record -- no
-- dashboard could be built over it without this. Service-role only, no
-- policies, matching processed_stripe_events' pattern; metadata only, never
-- essay/profile content (logAiUsage's own existing contract).
create table ai_usage_log (
  id            uuid        primary key default gen_random_uuid(),
  endpoint      text        not null,
  user_id       uuid,
  model         text        not null,
  latency_ms    integer     not null,
  input_tokens  integer     not null default 0,
  output_tokens integer     not null default 0,
  success       boolean     not null,
  error         text,
  created_at    timestamptz not null default now()
);

alter table ai_usage_log enable row level security;

create index idx_ai_usage_log_endpoint_created on ai_usage_log(endpoint, created_at);
