// Reports how many people have signed up on the waitlist (waitlist_signups),
// broken down by contact type and source.
//
// Usage: node --env-file=.env.local scripts/count-waitlist.mjs

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

const { count: total, error: countError } = await supabase
  .from("waitlist_signups")
  .select("*", { count: "exact", head: true });
if (countError) {
  console.error("Failed to count waitlist_signups:", countError.message);
  process.exit(1);
}

const { data: rows, error: rowsError } = await supabase
  .from("waitlist_signups")
  .select("contact_type, source, created_at");
if (rowsError) {
  console.error("Failed to fetch waitlist_signups:", rowsError.message);
  process.exit(1);
}

const byType = {};
const bySource = {};
for (const row of rows) {
  byType[row.contact_type] = (byType[row.contact_type] || 0) + 1;
  const source = row.source || "(none)";
  bySource[source] = (bySource[source] || 0) + 1;
}

console.log(`Total waitlist signups: ${total}`);

console.log("\nBy contact type:");
for (const [type, count] of Object.entries(byType)) {
  console.log(`  ${type}: ${count}`);
}

console.log("\nBy source:");
for (const [source, count] of Object.entries(bySource).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${source}: ${count}`);
}

if (rows.length > 0) {
  const sorted = [...rows].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  console.log(`\nFirst signup: ${sorted[0].created_at}`);
  console.log(`Latest signup: ${sorted[sorted.length - 1].created_at}`);
}
