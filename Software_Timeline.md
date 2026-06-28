# Telos Timeline — MVP to Market-Ready (Launch Aug 11)

Starts today (Jun 27) and ends with a market-ready launch on **August 11** — 6.5 weeks. Synthesized from `Telos Master.pdf`'s spec, the current state of the repo, and a market-readiness gap review, compressed from a 12-week plan down to fit the deadline by merging adjacent phases.

**Where we actually are:** the full student flow is built — auth, onboarding, school matches + breakdown, school detail, AI timeline, essay feedback, profile, upgrade/Stripe. The `profiles`, `school_matches`, `timeline_items`, `regeneration_log` tables exist. The counselor side is mid-build: `migration_001_counselor_dashboard.sql` and `seed_counselor.sql` exist but the `/counselor/*` routes and screens are not finished.

---

## Failure modes common to AI-generated ("vibe-coded") apps — and where this plan catches them

| Failure mode | Why it happens in AI-generated code | Caught by |
|---|---|---|
| Row-level security missing or too permissive | AI scaffolds tables/CRUD before policies; permissive defaults demo fine | Week 1 (written with tables), verified Week 3 |
| Authorization checked only in the UI, not the API/DB | Client checks get added first; server checks get forgotten since the happy path "looks" secure | Week 1, Week 3 |
| Secrets committed to git or shipped to the client bundle | Copy-pasted `.env` examples, or a key used client-side instead of server-side | Week 1 |
| No rate limiting on expensive AI endpoints | Endpoints get built to "call Anthropic and return"; abuse/cost limits added last or never | Week 3, Week 4 |
| Trusting client-supplied state (tier, role, user ID) instead of re-deriving it server-side | Fastest way to ship is to read what the client already sent | Week 2, Week 3 |
| Unvalidated/unsanitized input reaching the DB or an LLM prompt (injection, prompt injection) | Forms wired to API calls without a validation layer; free-text user content concatenated into prompts | Week 3 |
| Billing logic trusts the client redirect instead of the webhook, or double-processes replayed events | Client-side "payment succeeded" redirect is the easy first implementation | Week 2, Week 4 |
| No monitoring, so breaches/outages/cost spikes are discovered by users or invoices | Monitoring isn't part of the "build the feature" loop; first thing skipped under deadline pressure | Week 4 |
| Placeholder/fabricated content left in production | AI fills gaps with plausible-looking placeholders that are easy to miss | Week 5, Week 6 |
| Unpatched dependency vulnerabilities from rapid scaffolding | Packages added on demand without an audit pass | Week 3 |
| Backups assumed to exist/work but never tested | Backups assumed because "the platform probably handles it" | Week 4 |

---

## Week 1: Jun 27–Jul 3 — Foundations + counselor dashboard, part 1
- [ ] Secrets audit: confirm `.env.local` is gitignored, check git history for committed secrets
  **Acceptance criteria:** no historical commit contains a real secret; `.gitignore` covers all env files. (Key rotation happens again right before launch in Week 7 — this pass is to catch and stop any existing exposure immediately.)
- [ ] 2FA enabled on Stripe, Supabase, and Anthropic admin accounts
  **Acceptance criteria:** all 3 accounts require a second factor to log in, verified by attempting a fresh login.
- [ ] Staging environment separate from production Supabase project, with its own Stripe test keys and Anthropic key
  **Acceptance criteria:** staging exists and has zero shared credentials with production, before any further feature work lands.
- [ ] Production deployment pipeline: hosting, custom domain, SSL, and CI (build/lint/test gate on every merge)
  **Acceptance criteria:** the app is reachable at its real production domain over HTTPS with a valid certificate; a PR with a failing build, lint, or test cannot be merged without the CI check passing — in place before the counselor-dashboard work below starts landing.
- [ ] Write automated tests for the highest-risk paths (RLS access boundaries, regeneration cap enforcement, Stripe webhook handling) so the CI test gate above is actually checking something, not just passing on an empty suite
  **Acceptance criteria:** at least one automated test exists per highest-risk path and fails when the corresponding protection is deliberately broken, verified by breaking it once on purpose.
- [ ] Confirm a fast rollback path exists for the deployment pipeline (revert to last known-good deploy)
  **Acceptance criteria:** a rollback has been performed once against a non-production deploy and restores the previous working version within minutes.
- [ ] Add `schools`, `counselors`, `counselor_notes`, `reminder_log` tables to `supabase/schema.sql`, with RLS policies written alongside each table (not deferred to a later audit); add `school_id`/`counselor_id`/`last_login_at` to `profiles`
  **Acceptance criteria:** all 4 tables exist with correct foreign keys and RLS enabled from creation; `profiles` has the 3 new columns; migration applies cleanly to a fresh DB and the existing dev DB with no data loss.
- [ ] `isCounselor(user)` access-control function; guard all `/counselor/*` routes; redirect logged-in students away from `/counselor/*` and logged-out users to login
  **Acceptance criteria:** a student session hitting any `/counselor/*` URL is redirected with no flash of counselor content; a logged-out session is redirected to `/login`; the check is enforced server-side, not just hidden client-side.
- [ ] Screen C1 — Counselor Home (roster, stat strip, status badges: On Track / Needs Attention / No Activity, filter + sort)
  **Acceptance criteria:** roster shows only students linked to the logged-in counselor's `school_id`; all 3 badges render under their spec-defined condition; filter and sort work in combination.
- [ ] Screen C2 — Student Detail View (4 read-only tabs: Profile, School Matches, Timeline, Counselor Notes)
  **Acceptance criteria:** all 4 tabs render real seeded data; no write actions appear; a counselor cannot reach this screen for a student outside their school via direct URL.
- [ ] Submit Stripe business verification (business details, bank account, identity) to activate live payouts
  **Acceptance criteria:** the Stripe account shows "payouts enabled" / fully activated for live mode, started now since approval can take days and the rest of the billing work depends on a live-capable account by Week 7.

## Week 2: Jul 4–10 — Counselor dashboard, part 2 + close student-flow gaps
- [ ] Screen C3 — At-Risk Flags and Priority Queue (Overdue Deadlines, Stalled Profiles, No School Matches)
  **Acceptance criteria:** each of the 3 flag categories surfaces correct seeded students and excludes non-matching ones; queue reflects underlying data changes without staleness.
- [ ] Screen C4 — Send Reminder (3 pre-filled templates, preview, logs to `reminder_log`)
  **Acceptance criteria:** all 3 templates pre-fill correctly; preview matches what's sent; every send creates exactly one `reminder_log` row with counselor, student, template, timestamp.
- [ ] Screen C5 — Class-Level Aggregate View (4 grade panels, bar charts, read-only)
  **Acceptance criteria:** all 4 panels render correct counts for seeded data, matched by manual count; no write/edit affordances present.
- [ ] Seed a test school + counselor account end-to-end to dry-run the full counselor flow against real student data
  **Acceptance criteria:** a counselor logs in with the seeded account and completes every C1–C5 screen against real rows with no manual DB intervention mid-flow.
- [ ] Verify Screen 0 (Profile Completeness Popup) exists and re-triggers correctly each session
  **Acceptance criteria:** popup appears every login while incomplete; never appears once complete; doesn't permanently suppress if profile later becomes incomplete again.
- [ ] Verify "you are here" marker priority logic on the timeline matches spec exactly (nearest due date → most schools tied → never on strategic items)
  **Acceptance criteria:** constructed test cases for each tiebreak level all produce the spec-correct marker position.
- [ ] Verify profile-sync-on-complete behavior on timeline items
  **Acceptance criteria:** editing a profile field a timeline item depends on updates that item without a full regeneration or stale-reload inconsistency.
- [ ] Verify Stripe webhook (not client redirect) is the source of truth for `subscription_tier`, both grant and revoke paths
  **Acceptance criteria:** manually firing `checkout.session.completed` grants premium even if the client redirect never fires; firing a cancellation event revokes premium even if the user never returns to the app.
- [ ] Confirm regeneration cap (3/week free, unlimited premium) is enforced server-side via `regeneration_log`
  **Acceptance criteria:** a free-tier test account is blocked on the 4th attempt within a 7-day window per server-side count, not a client-side counter; premium is never blocked.
- [ ] Multi-tenant edge cases: student transfers schools mid-year; counselor account is deactivated/leaves
  **Acceptance criteria:** transferring a student's `school_id` moves them out of the old counselor's roster and into the new one with no duplicate or orphaned record; deactivating a counselor either reassigns their students to another counselor or clearly flags them as unassigned, with no students silently losing counselor coverage.

## Week 3: Jul 11–17 — Hardening + security & data protection
- [ ] Error/retry states for all 4 AI calls (matching, timeline, essay, career path) — no blank screens, no fabricated data
  **Acceptance criteria:** simulating a failure on each endpoint shows a real error state with retry, never a blank screen or silently-fabricated content.
- [ ] Loading states with contextual copy (not bare spinners)
  **Acceptance criteria:** each of the 4 AI calls shows copy specific to what it's doing for the duration of the call.
- [ ] Responsive pass focused on Screen 6 (Timeline) and Screen 4 (Percentage Breakdown) at mobile widths
  **Acceptance criteria:** both screens are fully usable with no overlapping/clipped/horizontally-scrolling content at 375px and 414px.
- [ ] Mobile-first pass on the public landing page specifically, since most first visits will arrive via a social bio link on a phone: test on a real mid-range phone over throttled cellular, not just desktop-emulated viewports
  **Acceptance criteria:** the landing page is fully usable and visually clean at 375px and 414px on a real device over a throttled "Slow 4G" connection, not just a resized desktop browser window.
- [ ] Mobile performance/fallback for the 3D hero (`hero-3d.tsx`): confirm load time and frame rate on a real mid-range phone, and provide a lightweight static/animated fallback if the 3D scene is slow to load or fails on lower-end devices
  **Acceptance criteria:** the hero either renders smoothly within ~1.5s on a mid-range phone over throttled cellular, or automatically falls back to a lightweight static/CSS-animated version with no blank space or stall while WebGL loads.
- [ ] First-paint speed budget for the landing page (e.g. meaningful content visible within ~1.5–2s on throttled mobile)
  **Acceptance criteria:** measured with Lighthouse mobile or equivalent, the landing page hits the defined budget, not just "feels okay" on a fast office wifi connection.
- [ ] Auth/session edge cases: protected routes redirect to login; onboarding doesn't partial-save; completed-onboarding users skip onboarding on relogin
  **Acceptance criteria:** any protected route hit while logged out redirects to login and returns post-login; abandoning onboarding mid-flow doesn't leave a half-complete profile treated as complete; a finished user never sees onboarding again.
- [ ] RLS verification pass on every table in `schema.sql` + `migration_001_counselor_dashboard.sql` (policies were written in Week 1; this confirms they hold) — counselors see only their own school's students, students never see other students
  **Acceptance criteria:** a test query run as a non-owner role returns zero rows for every table; a counselor from school A querying school B's data returns zero rows; documented table-by-table pass/fail with no open fails.
- [ ] Rate limiting on `/api/essay`, `/api/career-path`, `/api/matches`, `/api/timeline`
  **Acceptance criteria:** each endpoint rejects requests beyond a defined per-user threshold, verified by a scripted burst against a test account.
- [ ] Input validation/sanitization at all API boundaries (essay text, profile fields) before hitting Anthropic or DB
  **Acceptance criteria:** every API route accepting user input rejects malformed/oversized/script-tag-containing input with a 4xx before it reaches the DB or an Anthropic prompt.
- [ ] COPPA/FERPA review — students are likely minors; determine if parental consent or age-gating is required
  **Acceptance criteria:** a written determination exists; if consent/age-gating is required, it's scoped as a tracked follow-up, not silently skipped.
- [ ] Add a visible AI-generated-content disclaimer on essay feedback, career path, matching, and timeline outputs (not professional/official advice)
  **Acceptance criteria:** every one of the 4 AI-output screens shows a clear, visible disclaimer that the content is AI-generated guidance, not a guarantee or professional counseling advice.
- [ ] Account deletion / data deletion request flow
  **Acceptance criteria:** a user-initiated deletion request removes or anonymizes all of that user's rows across every table within a defined SLA, verified by post-deletion query.
- [ ] Dependency vulnerability audit (`npm audit` or equivalent) with no unresolved high/critical findings
  **Acceptance criteria:** zero unresolved high/critical findings, or each remaining one has a documented reason it's not exploitable.
- [ ] CORS and CSRF configuration check on all API routes
  **Acceptance criteria:** cross-origin requests from an untrusted origin are rejected; state-changing requests (POST/PUT/DELETE) without a valid same-origin/CSRF token are rejected, verified by a deliberate cross-origin test request.

## Week 4: Jul 18–24 — Billing hardening + reliability & ops
- [ ] Stripe webhook idempotency (replayed events don't double-grant/revoke `subscription_tier`)
  **Acceptance criteria:** replaying the same webhook event twice produces the same end state as once, verified against a test account.
- [ ] Failed payment / dunning flow — card decline mid-subscription
  **Acceptance criteria:** a simulated decline on renewal leaves the account in a defined, visible state — not silently still-premium with no warning, and not silently revoked without notice.
- [ ] Plan changes: upgrade/downgrade/cancel, proration behavior
  **Acceptance criteria:** each of upgrade/downgrade/cancel produces Stripe-expected proration, and the app's `subscription_tier` matches Stripe's state immediately after.
- [ ] Invoices/receipts accessible to the user; Stripe test mode → live mode checklist (webhook secrets, price IDs, tax settings); refund runbook documented
  **Acceptance criteria:** a logged-in premium user can view/download a recent receipt; a documented test→live checklist has been executed once against the live Stripe account; a written refund process has been dry-run once against a test charge.
- [ ] Error monitoring (Sentry or similar) wired into all API routes
  **Acceptance criteria:** a deliberately thrown error in any API route appears in the monitoring dashboard within minutes with route/user/stack context.
- [ ] Uptime monitoring + alerting on Supabase, Stripe, Anthropic dependencies
  **Acceptance criteria:** an alert fires within a defined window of any of the 3 dependencies becoming unreachable.
- [ ] Structured logging for the 4 AI endpoints (cost, latency, failure rate); Anthropic cost ceiling/alerting
  **Acceptance criteria:** logs capture token cost, latency, and success/failure per call in queryable form; an alert fires before a single user's usage or daily aggregate spend exceeds a defined threshold.
- [ ] Supabase backup/restore actually tested (staging environment itself was set up in Week 1)
  **Acceptance criteria:** a real restore-from-backup has been performed into a separate project and verified to contain correct data.

## Week 5: Jul 25–31 — Legal/trust + paying-customer onboarding
- [ ] Terms of Service + Privacy Policy (real, reviewed — not placeholder)
  **Acceptance criteria:** both published at stable URLs, reflecting Telos's actual data practices, with at least one competent review.
- [ ] Data Processing Agreement template for school districts
  **Acceptance criteria:** a DPA template exists that a school's procurement/legal team can review and sign without custom drafting.
- [ ] Cookie/analytics consent if tracking is added; support contact / SLA statement for paying school accounts
  **Acceptance criteria:** if tracking exists, consent is shown before tracking begins and "no" is honored; a published support channel and response-time commitment is visible to paying accounts.
- [ ] Self-serve or sales-assisted school signup flow (replace manual SQL seeding from `seed_counselor.sql`); admin tooling to onboard a new school without raw SQL
  **Acceptance criteria:** a new school can be onboarded by an internal admin through a UI or scripted tool, with zero raw SQL run against production.
- [ ] Email infra: welcome email, reminder-sent receipts, weekly digest
  **Acceptance criteria:** all 3 email types send successfully to a real test inbox and render correctly.
- [ ] Email deliverability: SPF, DKIM, DMARC configured for the sending domain
  **Acceptance criteria:** a test email sent to a major provider (Gmail/Outlook) lands in the inbox, not spam, and passes SPF/DKIM/DMARC checks per a deliverability test tool.
- [ ] Basic SEO/metadata on public pages: title tags, OG tags, sitemap.xml, robots.txt
  **Acceptance criteria:** the landing and pricing pages have correct title/OG tags verified by a social-share preview tool; `sitemap.xml` and `robots.txt` are reachable and list the public routes.
- [ ] Convert the site into a PWA: manifest.json, app icons, splash screen, service worker for basic offline/caching support
  **Acceptance criteria:** on both iOS and Android, the site can be added to the home screen, opens full-screen with no browser chrome, and shows the correct icon/name — giving students and counselors a real mobile-app experience without an App Store submission.
- [ ] DB indexes on foreign keys used in counselor roster/aggregate queries (N-student fan-out)
  **Acceptance criteria:** roster and aggregate queries against a realistic seeded dataset (200+ students) return in well under a second, verified with `EXPLAIN`.
- [ ] Public-facing pricing page
  **Acceptance criteria:** an unauthenticated visitor can view plan tiers, pricing, and what's included without logging in or starting checkout.
- [ ] Sales collateral for school districts (one-pager and/or short demo walkthrough)
  **Acceptance criteria:** a document or recording exists that a counselor/admin could forward to their own purchasing decision-maker to get budget approval, without needing a live call with you.

## Week 6: Aug 1–7 — Full QA pass
- [ ] Walk every screen end to end as both a student and a counselor
  **Acceptance criteria:** every spec screen has been clicked through once per role, with pass/fail noted per screen.
- [ ] Cross-check every screen against the master doc's exact requirements (badge logic, "you are here" logic, locked-state patterns, etc.)
  **Acceptance criteria:** a line-by-line diff against `Telos Master.pdf` per screen, with every mismatch logged.
- [ ] Cross-browser/device pass beyond Playwright screenshots
  **Acceptance criteria:** manual pass on Safari + Chrome, desktop and a real mobile device.
- [ ] Accessibility pass: focus states, keyboard nav, screen reader labels
  **Acceptance criteria:** every interactive element is reachable/operable via keyboard alone; a screen reader pass confirms meaningful labels on primary flows.
- [ ] Load test the AI endpoints under concurrent student traffic
  **Acceptance criteria:** a simulated concurrent-user load test at realistic cohort size completes with no errors or unacceptable latency degradation.
- [ ] Log every gap found as a checklist for Week 7
  **Acceptance criteria:** every fail from this week's passes is captured as a discrete, actionable item before Week 7 starts.

## Week 7: Aug 8–11 — Fix, freeze, and launch
- [ ] Fix everything QA surfaced
  **Acceptance criteria:** every item logged in Week 6 is fixed and re-verified, or explicitly deferred with a documented reason.
- [ ] Freeze scope — no new features (see "Do not build" list in the master doc)
  **Acceptance criteria:** no commit this week adds a feature not already in scope; new ideas are logged for post-launch, not built.
- [ ] One real (non-seeded) counselor uses the live product with their actual roster for at least one day before public launch
  **Acceptance criteria:** a real counselor outside the project team completes a full session (roster review, at least one reminder send) on the production environment with no blocking bugs encountered.
- [ ] Final regression pass on student + counselor flows
  **Acceptance criteria:** a full end-to-end walkthrough of both roles passes with zero open bugs from the fix list.
- [ ] Live-mode Stripe smoke test with a real card
  **Acceptance criteria:** one real charge and one real refund succeed against the live Stripe account before public launch.
- [ ] Rotate Stripe/Anthropic/Supabase production keys one final time before public launch
  **Acceptance criteria:** every production key in active use was generated after this rotation, not reused from development or earlier testing.
- [ ] **Market-ready launch — August 11**

---

## Post-launch roadmap (not in scope before Aug 11 — tracked so it isn't lost)

- [ ] **Native mobile app (iOS/Android).** Tabled deliberately: the PWA work in Week 5 covers the "feels like an app" need for launch without App Store review risk or the Apple in-app-purchase/Stripe conflict. Revisit once there's real post-launch usage data to justify the build, and once there's bandwidth not already consumed by security/billing/QA. When this gets picked up: decide React Native/Expo vs. Capacitor, resolve the Stripe-vs-Apple-IAP payment question first (before writing any code), and budget real calendar time for device testing and review cycles — not just engineering time.
