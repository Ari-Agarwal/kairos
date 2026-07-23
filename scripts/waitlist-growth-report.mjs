// Reports waitlist_signups broken down by day (for the growth-curve tracker)
// and by day+source (for the sourced-signup tracker), to fill in
// Y Combinator/YC_Action_Items_Timeline.md §1 and §2.
//
// Usage: node --env-file=.env.local scripts/waitlist-growth-report.mjs

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(1);
}
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: rows, error } = await supabase
  .from("waitlist_signups")
  .select("source, created_at")
  .order("created_at", { ascending: true });
if (error) {
  console.error("Failed to fetch waitlist_signups:", error.message);
  process.exit(1);
}

if (rows.length === 0) {
  console.log("No signups yet.");
  process.exit(0);
}

// Group by local calendar day.
const dayKey = (iso) => new Date(iso).toLocaleDateString("en-CA"); // YYYY-MM-DD, local tz

const byDay = {};
const byDaySource = {};
for (const row of rows) {
  const day = dayKey(row.created_at);
  byDay[day] = (byDay[day] || 0) + 1;
  const source = row.source || "(none)";
  byDaySource[day] = byDaySource[day] || {};
  byDaySource[day][source] = (byDaySource[day][source] || 0) + 1;
}

const days = Object.keys(byDay).sort();

console.log("=== Daily signups + cumulative (for tracker §1: Waitlist growth curve) ===\n");
console.log("| Date | New signups | Cumulative | % change vs. last entry |");
console.log("|---|---|---|---|");
let cumulative = 0;
let lastCumulative = null;
for (const day of days) {
  cumulative += byDay[day];
  const pctChange =
    lastCumulative && lastCumulative > 0
      ? `${(((cumulative - lastCumulative) / lastCumulative) * 100).toFixed(1)}%`
      : "—";
  console.log(`| ${day} | ${byDay[day]} | ${cumulative} | ${pctChange} |`);
  lastCumulative = cumulative;
}

console.log("\n=== Daily signups by source (for tracker §2: Signup source log) ===\n");
console.log("| Date | Source | Signups from this source |");
console.log("|---|---|---|");
for (const day of days) {
  const sources = byDaySource[day];
  for (const [source, count] of Object.entries(sources).sort((a, b) => b[1] - a[1])) {
    console.log(`| ${day} | ${source} | ${count} |`);
  }
}

console.log(`\nTotal signups: ${rows.length}`);
console.log(`First signup: ${rows[0].created_at}`);
console.log(`Latest signup: ${rows[rows.length - 1].created_at}`);
