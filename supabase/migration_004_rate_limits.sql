-- Migration 004: distributed rate limiting
-- Replaces the per-instance in-memory limiter with a shared Postgres-backed one
-- so limits hold across serverless instances. A single atomic upsert per check
-- (fixed window). Accessed only through the SECURITY DEFINER function below;
-- the table itself is locked down with RLS and no policies.

create table rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  count int not null default 0
);

alter table rate_limits enable row level security;

-- Atomically record a hit for p_key and report whether the caller is still
-- within p_limit hits per p_window_ms window. Returns true = allowed.
create function public.check_rate_limit(p_key text, p_limit int, p_window_ms bigint)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_window interval := make_interval(secs => p_window_ms / 1000.0);
  v_count int;
begin
  insert into rate_limits (key, window_start, count)
  values (p_key, v_now, 1)
  on conflict (key) do update
    set count = case when rate_limits.window_start < v_now - v_window then 1
                     else rate_limits.count + 1 end,
        window_start = case when rate_limits.window_start < v_now - v_window then v_now
                            else rate_limits.window_start end
  returning count into v_count;
  return v_count <= p_limit;
end;
$$;

grant execute on function public.check_rate_limit(text, int, bigint) to authenticated, service_role;
