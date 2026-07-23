// Candidate ingestion/validation script (Software_Timeline.md Section 1,
// "Scholarship database"). This is deliberately NOT a scraper that
// auto-publishes: it takes a manually-curated list of candidate scholarships
// (name + claimed official source_url, plus whatever fields the researcher
// already knows), checks each source URL actually resolves and still looks
// like it's about that scholarship, and writes a reviewable JSON patch --
// never touching the live src/data/scholarships.json directly. A human
// reviews the patch, fills in any missing fields, and merges by hand. See
// README.md in this directory for the full workflow.
//
// Usage:
//   node scripts/scholarships/validate-candidates.mts <candidates.json>
//   node scripts/scholarships/validate-candidates.mts scripts/scholarships/candidates.example.json
//
// Candidate input file: a JSON array of objects with at minimum
// { "name": string, "source_url": string }, optionally also
// { "organization", "eligibility_summary", "award_amount", "deadline_window" }
// for anything the researcher already confirmed by hand.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { __dirname, checkUrl, loadDataset, pageMentionsName, todayIso, type Scholarship } from "./lib.mts";

interface Candidate {
  name: string;
  source_url: string;
  organization?: string;
  eligibility_summary?: string;
  award_amount?: string;
  deadline_window?: string;
}

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error("Usage: node scripts/scholarships/validate-candidates.mts <candidates.json>");
    process.exit(1);
  }
  if (!existsSync(inputPath)) {
    console.error(`Candidate file not found: ${inputPath}`);
    process.exit(1);
  }

  const candidates: Candidate[] = JSON.parse(readFileSync(inputPath, "utf-8"));
  if (!Array.isArray(candidates) || candidates.length === 0) {
    console.error("Candidate file must be a non-empty JSON array.");
    process.exit(1);
  }

  const existing = loadDataset();
  const existingNames = new Set(existing.scholarships.map((s) => s.name.toLowerCase()));

  console.log(`Validating ${candidates.length} candidate(s)...\n`);

  const toAdd: Scholarship[] = [];
  const flagged: { name: string; source_url: string; reason: string }[] = [];
  const duplicates: string[] = [];

  for (const candidate of candidates) {
    if (!candidate.name || !candidate.source_url) {
      flagged.push({ name: candidate.name ?? "(missing name)", source_url: candidate.source_url ?? "", reason: "Candidate is missing required field(s): name and/or source_url." });
      continue;
    }

    if (existingNames.has(candidate.name.toLowerCase())) {
      duplicates.push(candidate.name);
      console.log(`SKIP  (already in dataset): ${candidate.name}`);
      continue;
    }

    process.stdout.write(`CHECK ${candidate.name} -> ${candidate.source_url} ... `);
    const result = await checkUrl(candidate.source_url);

    if (!result.ok) {
      console.log(`FAIL (${result.error})`);
      flagged.push({ name: candidate.name, source_url: candidate.source_url, reason: `URL did not resolve: ${result.error}` });
      continue;
    }

    const looksRelevant = result.bodySnippet ? pageMentionsName(result.bodySnippet, candidate.name) : false;
    if (!looksRelevant) {
      console.log(`FLAG (page doesn't clearly mention "${candidate.name}" -- verify by hand)`);
      flagged.push({ name: candidate.name, source_url: candidate.source_url, reason: "URL resolves, but the page text doesn't clearly reference this scholarship's name. Confirm manually before merging." });
      continue;
    }

    console.log("OK");

    const missing: string[] = [];
    for (const field of ["organization", "eligibility_summary", "deadline_window"] as const) {
      if (!candidate[field]) missing.push(field);
    }
    if (missing.length > 0) {
      console.log(`      note: still needs manual fill-in for: ${missing.join(", ")}`);
    }

    toAdd.push({
      name: candidate.name,
      organization: candidate.organization ?? "TODO: confirm from source",
      eligibility_summary: candidate.eligibility_summary ?? "TODO: confirm from source",
      award_amount: candidate.award_amount,
      deadline_window: candidate.deadline_window ?? "TODO: confirm from source",
      source_url: candidate.source_url,
    });
  }

  const outDir = join(__dirname, "output");
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const stamp = todayIso();
  const patchPath = join(outDir, `patch-${stamp}.json`);

  const patch = {
    generated: new Date().toISOString(),
    source_file: inputPath,
    summary: {
      candidates: candidates.length,
      validated_ready_to_add: toAdd.length,
      flagged_for_manual_review: flagged.length,
      already_in_dataset: duplicates.length,
    },
    // Diffable against src/data/scholarships.json: apply by hand, filling any
    // remaining TODOs, then re-running `npm run lint`/typecheck.
    add: toAdd,
    flagged,
    duplicates,
  };

  writeFileSync(patchPath, JSON.stringify(patch, null, 2) + "\n");

  console.log(`\nWrote patch: ${patchPath}`);
  console.log(`  ${toAdd.length} candidate(s) validated and ready for review/merge`);
  console.log(`  ${flagged.length} candidate(s) flagged -- needs manual attention before merging`);
  console.log(`  ${duplicates.length} candidate(s) already present in scholarships.json`);
  if (toAdd.some((s) => s.organization?.startsWith("TODO") || s.eligibility_summary?.startsWith("TODO") || s.deadline_window?.startsWith("TODO"))) {
    console.log(`\nNOTE: some validated entries still have TODO placeholders -- fill these in from the source page before merging into scholarships.json. Never merge a TODO as-is.`);
  }
}

main();
