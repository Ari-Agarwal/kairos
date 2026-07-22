import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Called by the n8n growth-tracking workflow (docs/Launch_Plan.md §5) on
// every waitlist signup, replacing manual re-runs of
// scripts/waitlist-growth-report.mjs. Returns today's aggregate so n8n can
// write a row to the "Kairos Waitlist Growth" Notion database -- computed
// here via the trusted service-role client rather than n8n's Postgres node,
// which hung indefinitely on this project's Supabase pooler connection even
// on a trivial `select 1`.
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: rows, error } = await service
    .from("waitlist_signups")
    .select("source, created_at");

  if (error) {
    console.error("waitlist-growth-snapshot query failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const todayKey = new Date().toLocaleDateString("en-CA");
  const todayRows = (rows ?? []).filter(
    (row) => new Date(row.created_at).toLocaleDateString("en-CA") === todayKey
  );

  const sourceCounts: Record<string, number> = {};
  for (const row of todayRows) {
    const source = row.source || "(none)";
    sourceCounts[source] = (sourceCounts[source] || 0) + 1;
  }
  const topSource =
    Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return NextResponse.json({
    date: todayKey,
    new_signups: todayRows.length,
    cumulative: rows?.length ?? 0,
    top_source: topSource,
  });
}
