// Shared helpers for the scholarship pipeline scripts (validate-candidates.mts,
// check-freshness.mts). See README.md in this directory for the workflow.

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

export const __dirname = dirname(fileURLToPath(import.meta.url));
export const DATA_PATH = join(__dirname, "..", "..", "src", "data", "scholarships.json");

export interface Scholarship {
  name: string;
  organization: string;
  eligibility_summary: string;
  award_amount?: string;
  deadline_window: string;
  source_url: string;
}

export interface ScholarshipDataset {
  _meta: { verified_date: string; note: string };
  scholarships: Scholarship[];
}

export function loadDataset(): ScholarshipDataset {
  return JSON.parse(readFileSync(DATA_PATH, "utf-8"));
}

export interface UrlCheckResult {
  url: string;
  ok: boolean;
  status: number | null;
  error: string | null;
  bodySnippet: string | null;
}

// Fetches a URL and reports whether it resolves with a successful status.
// Some scholarship sites reject HEAD or block default fetch UAs, so we do a
// real GET with a browser-like UA and a reasonable timeout, and treat any
// network failure or non-2xx status as a failure worth a human's attention
// rather than retrying/guessing.
export async function checkUrl(url: string, timeoutMs = 15000): Promise<UrlCheckResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      },
    });
    const text = await res.text().catch(() => "");
    return {
      url,
      ok: res.ok,
      status: res.status,
      error: res.ok ? null : `HTTP ${res.status}`,
      bodySnippet: text.slice(0, 20000),
    };
  } catch (err) {
    return {
      url,
      ok: false,
      status: null,
      error: err instanceof Error ? err.message : String(err),
      bodySnippet: null,
    };
  } finally {
    clearTimeout(timer);
  }
}

// Very rough "does this page still seem to be about this scholarship" check:
// strips HTML, lowercases, and looks for a few significant words from the
// name. Not a substitute for a human reading the page -- just a fast
// spot-check to flag likely-stale/misdirected URLs (e.g. a domain that now
// redirects to an unrelated parked page) for closer review.
export function pageMentionsName(bodySnippet: string, name: string): boolean {
  const text = bodySnippet
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .toLowerCase();
  const stopwords = new Set([
    "the", "a", "an", "of", "for", "and", "program", "scholarship", "scholarships",
    "award", "foundation", "national", "college", "fund", "high", "school",
  ]);
  const words = name
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !stopwords.has(w));
  if (words.length === 0) return true; // nothing distinctive to check
  const hits = words.filter((w) => text.includes(w));
  // Require at least half the distinctive words to still appear on the page.
  return hits.length >= Math.ceil(words.length / 2);
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
