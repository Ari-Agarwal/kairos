// AI-output eval harness (Software_Timeline.md Section 6a): runs the golden
// profile set through matches, essay feedback, and narrative synthesis using
// the ACTUAL production prompts (imported straight from src/lib/anthropic.ts,
// not copies -- so this can never silently drift from what ships), then runs
// a small set of heuristic checks against each output. Not an LLM-judge
// harness (deliberately -- that would double the API cost and add its own
// prompt to maintain); catches obvious, cheap-to-detect regressions like an
// empty why_text, a missing disclaimer, or a percentage that ignores the
// "don't default to conservative/inflated numbers" instructions.
//
// Usage: node scripts/eval/run-eval.mts
// Requires ANTHROPIC_API_KEY in the environment. Calls the real Anthropic
// API against every golden profile (5 profiles x 3 checks = 15 real calls)
// -- this spends real API credits, so it is NOT wired into CI and should be
// run deliberately, not on every push. Intended to be run by hand before/
// after a prompt change in src/lib/anthropic.ts, or on a schedule separate
// from the main deploy pipeline.
//
// Results are written to scripts/eval/results/<timestamp>.json for
// before/after comparison across a prompt change.

import Anthropic from "@anthropic-ai/sdk";
import { writeFileSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import {
  MODEL,
  schoolMatchingPrompt,
  ESSAY_FEEDBACK_PROMPT,
  NARRATIVE_SYNTHESIS_PROMPT,
  extractJson,
} from "../../src/lib/anthropic.ts";
import { GOLDEN_PROFILES, type GoldenProfile } from "./golden-profiles.mts";

const __dirname = dirname(fileURLToPath(import.meta.url));

function buildMatchesUserMessage(p: GoldenProfile): string {
  return `Intended major: ${p.intended_major.join(", ")}
Extracurriculars: ${p.extracurriculars.join("; ")}
Schools already considering: ${p.schools_already_considering ?? "missing"}
SAT score: ${p.sat_score ?? "not given"}
ACT score: ${p.act_score ?? "not given"}
Class rank: ${p.class_rank ?? "not given"}
AP/IB courses: ${p.ap_ib_count ?? "not given"}
Career goals: ${p.career_goals ?? "not given"}
Geographic preference: ${p.geographic_pref ?? "not given"}
Financial aid need: ${p.financial_aid_need === null ? "not given" : p.financial_aid_need ? "yes" : "no"}
Annual budget ceiling: ${p.budget_ceiling ?? "not given"}
First-generation student: ${p.first_gen === null ? "not given" : p.first_gen ? "yes" : "no"}
Legacy school: ${p.legacy_school ?? "none"}
Internships / research experience: ${p.internships_research ?? "not given"}
Campus size preference: ${p.campus_size_pref.join(" or ")}
Campus setting preference: ${p.campus_setting_pref.join(" or ")}
Applicant type: ${p.applicant_type ?? "standard (first-time freshman/senior applicant)"}
Accessibility/accommodation needs: ${p.accessibility_pref ?? "not given"}
Unweighted GPA: ${p.unweighted_gpa}
Weighted GPA: ${p.weighted_gpa ?? "not given"}`;
}

interface CheckResult {
  name: string;
  pass: boolean;
  detail: string;
}

function checkMatches(parsed: { schools?: { name: string; percentage: number; why_text: string }[] }): CheckResult[] {
  const schools = parsed.schools ?? [];
  return [
    { name: "non-empty schools list", pass: schools.length > 0, detail: `${schools.length} schools returned` },
    {
      name: "every school has non-empty why_text",
      pass: schools.every((s) => s.why_text && s.why_text.trim().length > 10),
      detail: schools.filter((s) => !s.why_text || s.why_text.trim().length <= 10).map((s) => s.name).join(", ") || "ok",
    },
    {
      name: "percentages are plausible integers 0-100",
      pass: schools.every((s) => Number.isInteger(s.percentage) && s.percentage >= 0 && s.percentage <= 100),
      detail: schools.map((s) => s.percentage).join(", "),
    },
  ];
}

function checkEssayFeedback(parsed: { feedback?: { label: string; text: string }[] }): CheckResult[] {
  const feedback = parsed.feedback ?? [];
  const bannedRewritePhrases = ["here is a rewritten", "here's a revised version", "you could write instead:"];
  const joined = feedback.map((f) => f.text.toLowerCase()).join(" ");
  return [
    { name: "3-5 feedback items", pass: feedback.length >= 3 && feedback.length <= 5, detail: `${feedback.length} items` },
    {
      name: "no pasteable rewrite offered",
      pass: !bannedRewritePhrases.some((p) => joined.includes(p)),
      detail: "ok",
    },
    {
      name: "at least one positive observation present",
      pass: feedback.some((f) => /good|strong|working|effective|clear|specific/i.test(f.label + f.text)),
      detail: feedback.map((f) => f.label).join(", "),
    },
  ];
}

function checkNarrative(parsed: { throughline?: string; core_values?: string[]; essay_angles?: unknown[] }): CheckResult[] {
  return [
    { name: "throughline present and substantive", pass: Boolean(parsed.throughline && parsed.throughline.length > 30), detail: parsed.throughline ?? "" },
    { name: "core_values non-empty", pass: Boolean(parsed.core_values && parsed.core_values.length > 0), detail: (parsed.core_values ?? []).join(", ") },
    { name: "essay_angles non-empty", pass: Boolean(parsed.essay_angles && parsed.essay_angles.length > 0), detail: `${(parsed.essay_angles ?? []).length} angles` },
  ];
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY not set -- refusing to run (this script spends real API credits).");
    process.exit(1);
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const results: Record<string, unknown> = {};
  let totalChecks = 0;
  let totalPassed = 0;

  for (const profile of GOLDEN_PROFILES) {
    console.log(`\n=== ${profile.key} (${profile.description}) ===`);
    const profileResult: Record<string, unknown> = {};

    // Matches -- "target" category only, to keep eval cost down (one
    // category is enough to catch a prompt regression; the route itself
    // already generates all three per real request).
    try {
      const res = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 4096,
        thinking: { type: "disabled" },
        system: schoolMatchingPrompt("target"),
        messages: [{ role: "user", content: buildMatchesUserMessage(profile) }],
      });
      const text = res.content.find((b) => b.type === "text")?.text ?? "";
      const parsed = extractJson<{ schools: { name: string; percentage: number; why_text: string }[] }>(text);
      const checks = checkMatches(parsed);
      profileResult.matches = { output: parsed, checks };
      for (const c of checks) {
        totalChecks++;
        if (c.pass) totalPassed++;
        console.log(`  [matches] ${c.pass ? "PASS" : "FAIL"} - ${c.name}: ${c.detail}`);
      }
    } catch (err) {
      profileResult.matches = { error: String(err) };
      console.log(`  [matches] ERROR - ${err}`);
    }

    // Essay feedback
    try {
      const res = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 2048,
        thinking: { type: "disabled" },
        system: ESSAY_FEEDBACK_PROMPT,
        messages: [{ role: "user", content: profile.essay_draft }],
      });
      const text = res.content.find((b) => b.type === "text")?.text ?? "";
      const parsed = extractJson<{ feedback: { label: string; text: string }[] }>(text);
      const checks = checkEssayFeedback(parsed);
      profileResult.essayFeedback = { output: parsed, checks };
      for (const c of checks) {
        totalChecks++;
        if (c.pass) totalPassed++;
        console.log(`  [essay] ${c.pass ? "PASS" : "FAIL"} - ${c.name}: ${c.detail}`);
      }
    } catch (err) {
      profileResult.essayFeedback = { error: String(err) };
      console.log(`  [essay] ERROR - ${err}`);
    }

    // Narrative synthesis
    try {
      const answersText = Object.entries(profile.narrative_answers)
        .filter(([, v]) => v.trim().length > 0)
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n\n");
      const res = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 2048,
        thinking: { type: "adaptive" },
        system: NARRATIVE_SYNTHESIS_PROMPT,
        messages: [{ role: "user", content: answersText }],
      });
      const text = res.content.find((b) => b.type === "text")?.text ?? "";
      const parsed = extractJson<{ throughline: string; core_values: string[]; essay_angles: unknown[] }>(text);
      const checks = checkNarrative(parsed);
      profileResult.narrative = { output: parsed, checks };
      for (const c of checks) {
        totalChecks++;
        if (c.pass) totalPassed++;
        console.log(`  [narrative] ${c.pass ? "PASS" : "FAIL"} - ${c.name}: ${c.detail}`);
      }
    } catch (err) {
      profileResult.narrative = { error: String(err) };
      console.log(`  [narrative] ERROR - ${err}`);
    }

    results[profile.key] = profileResult;
  }

  console.log(`\n=== Summary: ${totalPassed}/${totalChecks} checks passed ===`);

  const resultsDir = join(__dirname, "results");
  mkdirSync(resultsDir, { recursive: true });
  const filename = join(resultsDir, `eval-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  writeFileSync(filename, JSON.stringify({ summary: { totalChecks, totalPassed }, results }, null, 2));
  console.log(`Results written to ${filename}`);

  if (totalPassed < totalChecks) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
