// Regression-guard comparison mode for the eval harness (Software_Timeline.md
// Section 1, item 1). Diffs a saved baseline snapshot against the most recent
// `npm run eval` run and flags anything that looks like a material output
// shift from a prompt change: a heuristic check that used to pass now
// failing, a school's category (tier) changing for the same golden profile,
// or a school's admission percentage swinging by more than a threshold.
//
// This script itself never calls the Anthropic API and has no
// ANTHROPIC_API_KEY dependency -- it only reads JSON files already written
// by run-eval.mts, so it always runs (and is safe to run in CI) even when no
// API key is configured. If the required snapshot files don't exist yet
// (e.g. `npm run eval` has never been run), it says so and exits cleanly
// rather than throwing.
//
// Usage:
//   node scripts/eval/compare-eval.mts             # compare baseline.json vs latest.json
//   node scripts/eval/compare-eval.mts --promote    # copy latest.json -> baseline.json
//   node scripts/eval/compare-eval.mts <a.json> <b.json>  # compare two specific files

import { existsSync, readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const resultsDir = join(__dirname, "results");
const baselinePath = join(resultsDir, "baseline.json");
const latestPath = join(resultsDir, "latest.json");

// A percentage swing at or above this many points on the same school (same
// golden profile, same school name) is flagged as material. Small
// single-digit drift is expected model-to-model noise, not a regression.
const PERCENTAGE_SWING_THRESHOLD = 10;

interface CheckResult {
  name: string;
  pass: boolean;
  detail: string;
}

interface Snapshot {
  promptVersion?: string;
  ranAt?: string;
  summary: { totalChecks: number; totalPassed: number };
  results: Record<
    string,
    {
      matches?: { output?: { schools?: { name: string; category?: string; percentage: number }[] }; checks?: CheckResult[]; error?: string };
      essayFeedback?: { checks?: CheckResult[]; error?: string };
      narrative?: { checks?: CheckResult[]; error?: string };
    }
  >;
}

function loadSnapshot(path: string): Snapshot | null {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf-8"));
}

function diffChecks(profileKey: string, section: string, before?: CheckResult[], after?: CheckResult[]): string[] {
  const flags: string[] = [];
  if (!before || !after) return flags;
  for (const b of before) {
    const a = after.find((c) => c.name === b.name);
    if (!a) continue;
    if (b.pass && !a.pass) {
      flags.push(`[${profileKey}] ${section}: "${b.name}" was PASS, now FAIL -- ${a.detail}`);
    }
  }
  return flags;
}

function diffMatches(profileKey: string, before?: { name: string; category?: string; percentage: number }[], after?: { name: string; category?: string; percentage: number }[]): string[] {
  const flags: string[] = [];
  if (!before || !after) return flags;
  for (const b of before) {
    const a = after.find((s) => s.name === b.name);
    if (!a) continue; // school dropped/added entirely -- not flagged here, that's expected list churn
    if (b.category && a.category && b.category !== a.category) {
      flags.push(`[${profileKey}] matches: "${b.name}" tier changed ${b.category} -> ${a.category}`);
    }
    const swing = Math.abs(a.percentage - b.percentage);
    if (swing >= PERCENTAGE_SWING_THRESHOLD) {
      flags.push(`[${profileKey}] matches: "${b.name}" percentage swung ${b.percentage} -> ${a.percentage} (${swing} pts)`);
    }
  }
  return flags;
}

function main() {
  const args = process.argv.slice(2);

  if (args[0] === "--promote") {
    if (!existsSync(latestPath)) {
      console.error("No results/latest.json found -- run `npm run eval` first.");
      process.exit(1);
    }
    writeFileSync(baselinePath, readFileSync(latestPath, "utf-8"));
    console.log(`Promoted ${latestPath} -> ${baselinePath}`);
    return;
  }

  const [aPath, bPath] = args.length >= 2 ? args : [baselinePath, latestPath];
  const before = loadSnapshot(aPath);
  const after = loadSnapshot(bPath);

  if (!before || !after) {
    console.log(
      `Regression-guard comparison skipped: missing snapshot(s). baseline=${existsSync(baselinePath)} latest=${existsSync(latestPath)}.\n` +
        `Run \`npm run eval\` (with ANTHROPIC_API_KEY set) at least twice -- once to establish a baseline via ` +
        `\`node scripts/eval/compare-eval.mts --promote\`, then again after a prompt change -- before this comparison has anything to diff.`,
    );
    // Clean exit, not a failure: this is the expected state on a machine
    // without ANTHROPIC_API_KEY configured, mirroring run-eval.mts's own
    // "verify the pipeline runs and stops cleanly" behavior.
    return;
  }

  console.log(`Comparing baseline (${before.promptVersion ?? "unknown version"}, ${before.ranAt ?? "?"}) vs latest (${after.promptVersion ?? "unknown version"}, ${after.ranAt ?? "?"})`);

  const flags: string[] = [];
  const profileKeys = new Set([...Object.keys(before.results), ...Object.keys(after.results)]);
  for (const key of profileKeys) {
    const b = before.results[key];
    const a = after.results[key];
    if (!b || !a) {
      flags.push(`[${key}] golden profile present in only one snapshot -- skipped detailed diff`);
      continue;
    }
    flags.push(...diffChecks(key, "matches", b.matches?.checks, a.matches?.checks));
    flags.push(...diffChecks(key, "essayFeedback", b.essayFeedback?.checks, a.essayFeedback?.checks));
    flags.push(...diffChecks(key, "narrative", b.narrative?.checks, a.narrative?.checks));
    flags.push(...diffMatches(key, b.matches?.output?.schools, a.matches?.output?.schools));
  }

  if (flags.length === 0) {
    console.log("No material regressions detected.");
    return;
  }

  console.log(`\n${flags.length} potential regression(s) flagged:\n`);
  for (const f of flags) console.log(`  - ${f}`);
  process.exit(1);
}

main();
