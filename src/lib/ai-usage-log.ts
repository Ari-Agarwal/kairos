// Structured AI usage logging. Logs metadata only — never essay text,
// profile content, or any user-supplied free-form data.
// Shape is a single JSON line to stdout so log aggregators can parse it,
// and (best-effort, fire-and-forget) persisted to ai_usage_log so a real
// cost/volume dashboard (Software_Timeline.md 6d) can query it -- callers
// stay synchronous, the DB write never blocks or fails the request.

import { createServiceClient } from "@/lib/supabase/server";

export interface AiUsageRecord {
  event: "ai_usage";
  endpoint: string;
  user_id: string;
  model: string;
  timestamp: string;
  latency_ms: number;
  input_tokens: number;
  output_tokens: number;
  success: boolean;
  error?: string;
}

interface UsageShape {
  input_tokens: number;
  output_tokens: number;
}

// Call this after each Anthropic messages.create() call.
// Pass the response object on success or an Error on failure.
// startedAt should be the value of Date.now() captured before the call.
export function logAiUsage(
  endpoint: string,
  userId: string,
  model: string,
  startedAt: number,
  result: { usage?: UsageShape } | Error
): void {
  const latency_ms = Date.now() - startedAt;

  let record: AiUsageRecord;

  if (result instanceof Error) {
    record = {
      event: "ai_usage",
      endpoint,
      user_id: userId,
      model,
      timestamp: new Date().toISOString(),
      latency_ms,
      input_tokens: 0,
      output_tokens: 0,
      success: false,
      error: result.message,
    };
  } else {
    record = {
      event: "ai_usage",
      endpoint,
      user_id: userId,
      model,
      timestamp: new Date().toISOString(),
      latency_ms,
      input_tokens: result.usage?.input_tokens ?? 0,
      output_tokens: result.usage?.output_tokens ?? 0,
      success: true,
    };
  }

  console.log(JSON.stringify(record));

  void createServiceClient()
    .from("ai_usage_log")
    .insert({
      endpoint: record.endpoint,
      user_id: record.user_id,
      model: record.model,
      latency_ms: record.latency_ms,
      input_tokens: record.input_tokens,
      output_tokens: record.output_tokens,
      success: record.success,
      error: record.error ?? null,
    })
    .then(({ error }) => {
      if (error) console.error("ai_usage_log insert failed:", error);
    });
}

// Flag if a single user has issued an unusually high number of AI calls
// in a short window. Uses the in-process rate-limit memory bucket (same
// mechanism as checkRateLimitMemory in rate-limit.ts) — no DB round-trip.
// This is a soft anomaly flag only: it logs a warning, it does not block.
// Threshold: >30 calls from one user in a 60-minute window.
const ANOMALY_WINDOW_MS = 60 * 60 * 1000;
const ANOMALY_THRESHOLD = 30;
const anomalyBuckets = new Map<string, number[]>();

export function flagAnomalousUsage(endpoint: string, userId: string): void {
  const now = Date.now();
  const key = userId;
  const hits = (anomalyBuckets.get(key) ?? []).filter((t) => now - t < ANOMALY_WINDOW_MS);
  hits.push(now);
  anomalyBuckets.set(key, hits);

  if (hits.length > ANOMALY_THRESHOLD) {
    console.warn(
      JSON.stringify({
        event: "ai_usage_anomaly",
        endpoint,
        user_id: userId,
        call_count_in_window: hits.length,
        window_ms: ANOMALY_WINDOW_MS,
        timestamp: new Date().toISOString(),
      })
    );
  }
}
