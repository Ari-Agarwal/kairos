// Staleness/freshness pass for the existing scholarship dataset
// (Software_Timeline.md Section 1, "Scholarship database"). Re-checks every
// entry's source_url in src/data/scholarships.json: does it still resolve,
// and does the page still plausibly mention the scholarship. Never edits
// scholarships.json itself -- it only produces a report so a human can
// decide what to fix, remove, or re-verify. See README.md for the workflow.
//
// Usage:
//   node scripts/scholarships/check-freshness.mts
//   node scripts/scholarships/check-freshness.mts --concurrency 5

import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { __dirname, checkUrl, loadDataset, pageMentionsName, todayIso } from "./lib.mts";

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function main() {
  const concurrencyFlagIndex = process.argv.indexOf("--concurrency");
  const concurrency = concurrencyFlagIndex >= 0 ? Number(process.argv[concurrencyFlagIndex + 1]) || 4 : 4;

  const dataset = loadDataset();
  console.log(`Checking ${dataset.scholarships.length} scholarship source URLs (concurrency ${concurrency})...`);
  console.log(`Dataset last verified: ${dataset._meta.verified_date}\n`);

  const results = await mapWithConcurrency(dataset.scholarships, concurrency, async (scholarship) => {
    const check = await checkUrl(scholarship.source_url);
    const stillMentionsIt = check.ok && check.bodySnippet ? pageMentionsName(check.bodySnippet, scholarship.name) : null;
    return { scholarship, check, stillMentionsIt };
  });

  const broken = results.filter((r) => !r.check.ok);
  const suspect = results.filter((r) => r.check.ok && r.stillMentionsIt === false);
  const clean = results.filter((r) => r.check.ok && r.stillMentionsIt !== false);

  for (const r of broken) {
    console.log(`BROKEN   ${r.scholarship.name} -- ${r.scholarship.source_url} (${r.check.error})`);
  }
  for (const r of suspect) {
    console.log(`SUSPECT  ${r.scholarship.name} -- ${r.scholarship.source_url} (page no longer clearly mentions this scholarship; possible redirect/expired program)`);
  }
  console.log(`\n${clean.length} OK, ${suspect.length} suspect, ${broken.length} broken (of ${dataset.scholarships.length}).`);

  const outDir = join(__dirname, "output");
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const stamp = todayIso();
  const reportPath = join(outDir, `freshness-${stamp}.json`);

  const report = {
    generated: new Date().toISOString(),
    dataset_verified_date: dataset._meta.verified_date,
    total: dataset.scholarships.length,
    ok: clean.length,
    suspect: suspect.length,
    broken: broken.length,
    broken_entries: broken.map((r) => ({ name: r.scholarship.name, source_url: r.scholarship.source_url, error: r.check.error })),
    suspect_entries: suspect.map((r) => ({ name: r.scholarship.name, source_url: r.scholarship.source_url })),
  };
  writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
  console.log(`\nWrote report: ${reportPath}`);

  if (broken.length > 0 || suspect.length > 0) {
    console.log(`\nNext step: for each broken/suspect entry, manually re-search for the current official URL (or confirm the program was discontinued and remove it), then update src/data/scholarships.json and bump "_meta.verified_date" to today (${todayIso()}).`);
    process.exitCode = 1;
  } else {
    console.log(`\nAll source URLs resolved and still reference their scholarship. Consider bumping "_meta.verified_date" to ${todayIso()} to record this pass.`);
  }
}

main();
