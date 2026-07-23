# Scholarship dataset pipeline

`src/data/scholarships.json` is a hand-curated list of real scholarships,
each verified against an official source URL before being added. That bar
(real, verified, official-source-only, no fabricated eligibility/URLs) is
permanent -- these scripts help you *maintain* that bar at lower effort, they
do not relax it. Nothing here writes directly to `scholarships.json`; every
step produces a reviewable file and a human merges it by hand.

## Adding new scholarships

1. Manually research candidates as before (award databases, foundation
   sites, counselor referrals) and note each one's official `source_url`.
2. Put them in a JSON file, e.g. `scripts/scholarships/candidates.json`
   (see `candidates.example.json` for the shape). Fill in any fields you
   already confirmed by hand (`organization`, `eligibility_summary`,
   `award_amount`, `deadline_window`) -- the more you provide up front, the
   less TODO cleanup after.
3. Run:
   ```
   node scripts/scholarships/validate-candidates.mts scripts/scholarships/candidates.json
   ```
   This checks each `source_url` actually resolves and that the page still
   plausibly mentions that scholarship by name, skips anything already in
   the dataset, and writes a patch to
   `scripts/scholarships/output/patch-<date>.json` with three buckets:
   `add` (validated, ready for review), `flagged` (URL broken or page
   didn't match -- needs a manual look), `duplicates`.
4. Open the patch file. Fill in any `"TODO: confirm from source"`
   placeholders by reading the actual page. Never merge a TODO as-is.
5. Copy the finished entries from `add` into the `scholarships` array in
   `src/data/scholarships.json`, and bump `_meta.verified_date` to today.
6. Run `npm run lint` and `npx tsc --noEmit` (or your usual typecheck) since
   `src/lib/scholarships.ts` types against this JSON.

## Checking existing entries haven't gone stale

Run periodically (e.g. once a cycle, or before a launch push):
```
node scripts/scholarships/check-freshness.mts
```
This re-fetches every `source_url` already in `scholarships.json` and
reports:
- **BROKEN** -- URL no longer resolves (404, DNS failure, timeout, etc.)
- **SUSPECT** -- URL resolves, but the page no longer clearly mentions that
  scholarship by name (possible redirect to an unrelated page, or the
  program was discontinued/renamed)

It writes a report to `scripts/scholarships/output/freshness-<date>.json`
and exits non-zero if anything needs attention, so it's CI/cron-friendly.
It never edits the dataset -- for each flagged entry, manually re-search for
the current official page (or confirm the program is gone and remove the
entry), then update `scholarships.json` and bump `_meta.verified_date`.

## Notes

- Both scripts do real network fetches to the candidate/existing URLs --
  no API keys required, just outbound HTTP.
- The "page still mentions the name" check is a cheap heuristic (keyword
  match after stripping HTML), not proof of correctness -- always read the
  page yourself before merging or before trusting a "clean" freshness pass
  on a page you haven't looked at in a while.
- `scripts/scholarships/output/` is gitignored; patches and reports are
  working files, not checked-in artifacts.
- In practice a chunk of "BROKEN" results are `403`s from sites that block
  non-browser user agents/bot traffic (Cloudflare, etc.), not real dead
  links -- confirm broken/suspect flags by opening the URL in an actual
  browser before deciding a scholarship is gone. Treat this script as a
  triage filter that narrows 50+ entries down to a handful worth a human
  look, not a final verdict.
