import type { SupabaseClient } from "@supabase/supabase-js";

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
}

// Per-instance fallback. Used only when the Postgres limiter is unreachable
// (e.g. the migration hasn't been applied yet) so an endpoint is never left
// completely unprotected. Scoped to one warm serverless instance.
const buckets = new Map<string, number[]>();

function checkRateLimitMemory(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return { ok: false, remaining: 0 };
  }
  hits.push(now);
  buckets.set(key, hits);
  return { ok: true, remaining: limit - hits.length };
}

// Shared limiter backed by Postgres (check_rate_limit RPC, migration 004), so
// limits hold across serverless instances. Falls back to the in-memory limiter
// if the RPC errors, keeping the endpoint protected either way.
export async function checkRateLimit(
  supabase: SupabaseClient,
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  try {
    const { data, error } = await supabase.rpc("check_rate_limit", {
      p_key: key,
      p_limit: limit,
      p_window_ms: windowMs,
    });
    if (error || typeof data !== "boolean") return checkRateLimitMemory(key, limit, windowMs);
    return { ok: data, remaining: data ? 1 : 0 };
  } catch {
    return checkRateLimitMemory(key, limit, windowMs);
  }
}
