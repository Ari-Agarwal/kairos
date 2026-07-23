import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";

// Rate-limit/cost monitoring dashboard (Software_Timeline.md 6d): with 8+
// AI-backed features live, an admin-facing view of call volume/token spend
// per feature catches a runaway cost source before it's a surprise bill.
// Same key-protected pattern as /admin/waitlist and /admin/reports -- no
// admin-role concept in this app, gates on a shared secret instead.

interface UsageRow {
  endpoint: string;
  input_tokens: number;
  output_tokens: number;
  success: boolean;
  created_at: string;
}

const LOOKBACK_DAYS = 7;

export default async function AdminAiUsagePage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>;
}) {
  const { key } = await searchParams;

  if (!key || key !== process.env.AI_USAGE_ADMIN_KEY) {
    notFound();
  }

  const service = createServiceClient();
  const since = new Date();
  since.setDate(since.getDate() - LOOKBACK_DAYS);

  const { data, error } = await service
    .from("ai_usage_log")
    .select("endpoint, input_tokens, output_tokens, success, created_at")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false })
    .limit(20_000);

  if (error || !data) {
    return (
      <main className="min-h-screen bg-bg flex items-center justify-center px-6">
        <p className="text-red">Could not load usage data.</p>
      </main>
    );
  }

  const rows = data as UsageRow[];
  const byEndpoint = new Map<
    string,
    { calls: number; failures: number; inputTokens: number; outputTokens: number }
  >();
  for (const r of rows) {
    const entry = byEndpoint.get(r.endpoint) ?? { calls: 0, failures: 0, inputTokens: 0, outputTokens: 0 };
    entry.calls += 1;
    if (!r.success) entry.failures += 1;
    entry.inputTokens += r.input_tokens;
    entry.outputTokens += r.output_tokens;
    byEndpoint.set(r.endpoint, entry);
  }

  const sorted = [...byEndpoint.entries()].sort((a, b) => b[1].calls - a[1].calls);
  const totalCalls = rows.length;
  const totalTokens = rows.reduce((sum, r) => sum + r.input_tokens + r.output_tokens, 0);

  return (
    <main className="min-h-screen bg-bg px-6 py-10">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-serif text-2xl text-text mb-1">AI usage — last {LOOKBACK_DAYS} days</h1>
        <p className="text-text-gray text-sm mb-6">
          {totalCalls} calls · {totalTokens.toLocaleString()} tokens across all features. Metadata only — no
          essay/profile content is logged.
        </p>
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[1.5fr_0.7fr_0.7fr_1fr_1fr] gap-2 px-4 py-3 text-text-gray text-xs border-b border-border">
            <span>Endpoint</span>
            <span>Calls</span>
            <span>Failures</span>
            <span>Input tokens</span>
            <span>Output tokens</span>
          </div>
          {sorted.map(([endpoint, stats]) => (
            <div
              key={endpoint}
              className="grid grid-cols-[1.5fr_0.7fr_0.7fr_1fr_1fr] gap-2 px-4 py-3 text-sm text-text border-b border-border last:border-b-0"
            >
              <span className="truncate">{endpoint}</span>
              <span>{stats.calls}</span>
              <span className={stats.failures > 0 ? "text-red" : "text-text-gray"}>{stats.failures}</span>
              <span className="text-text-gray">{stats.inputTokens.toLocaleString()}</span>
              <span className="text-text-gray">{stats.outputTokens.toLocaleString()}</span>
            </div>
          ))}
          {sorted.length === 0 && (
            <p className="text-text-gray text-sm text-center py-10">No AI usage logged in this window.</p>
          )}
        </div>
      </div>
    </main>
  );
}
