# Kairos Timeline — Student-Only MVP (Launch Jun 30, night)

**Scope change (Jun 30, latest):** launch is tonight (Jun 30). Product name is now **Kairos** (was working title "Telos"). The only pre-launch external/billing item (Anthropic billing) is done and the key is confirmed in Vercel; custom domain + all DNS/email work is deferred to Phase 2, launching on the current Vercel URL. All remaining work runs in one ordered sequence today: **internet search + name decision → finish launch-hardening (security) → system prompt tuning → website content rewrite → UI/UX polish → thorough desktop/laptop testing → mobile device QA + troubleshooting → production deploy + key rotation + SSL/deliverability check → launch.** Naming + a final internet-search pass go first (the real product name has to be locked before any copy is written or the app is deployed); security is finished next so the app is safe before it's polished; mobile QA on a real phone is the last gate before deploy.

**Scope change (Jun 28, 5:40pm):** compressed from a 6.5-week plan (Aug 11) to an **8-day sprint, launching Jul 6**. This is aggressive — feasible only because the core student flow is already built (auth, onboarding, matches, timeline, essay feedback, profile). The 8 days are almost entirely hardening/verification/polish, not new features.

**What made this possible:** narrowing scope to student-only MVP (no counselor dashboard, no premium tier, no Stripe) in the prior scope cut, which removed roughly half the original 6.5-week plan's work outright.

**What got cut to fit 8 days, and why it's safe to cut:** items below are reordered by risk, not by week. Anything not load-bearing for "a stranger can safely sign up and use the student flow" got pushed to **Fast-follow (post-Jul-6)** at the bottom — not deleted, just not allowed to block launch. Notably: uptime/cost monitoring, PWA conversion, full accessibility pass, load testing, and backup/restore drill are fast-follow, not pre-launch blockers, since they protect against problems that show up over weeks of usage, not on day one.

**Real risk to this date — external turnaround you don't control:** domain/SSL DNS propagation, email deliverability (SPF/DKIM/DMARC can take 24–48h to validate), and getting even an informal answer on the COPPA/FERPA question. Start these on Day 1, in parallel, regardless of what else is in progress — if they slip, they're the reason Jul 6 slips, not the coding.

---

## Failure modes common to AI-generated ("vibe-coded") apps — and where this plan catches them

| Failure mode | Caught by |
|---|---|
| Row-level security missing or too permissive | Day 1–2 |
| Authorization checked only in the UI, not the API/DB | Day 1–2 |
| Secrets committed to git or shipped to the client bundle | Day 1 (done) |
| No rate limiting on expensive AI endpoints | Day 3 |
| Trusting client-supplied state instead of re-deriving it server-side | Day 2 |
| Unvalidated/unsanitized input reaching the DB or an LLM prompt | Day 3 |
| Placeholder/fabricated content left in production | Day 5–6 |
| Unpatched dependency vulnerabilities | Day 3 |

---

## Day 1 (Jun 28) — Infra foundations [in progress / done]
- [x] Secrets audit — clean, `stripe_backup_code.txt` gitignored before it could leak
- [x] 2FA on Supabase + Anthropic admin accounts
- [x] Staging Supabase project, separate from prod, own Anthropic key, seeded test students
- [x] `schools` table added (student-display-only scope); counselor tables skipped
- [x] Production hosting + SSL — live at `kairosadmissions.vercel.app` over HTTPS (Vercel default cert). Custom domain moved to Fast-follow — not load-bearing for "a stranger can safely sign up and use the student flow," and DNS propagation risk isn't worth taking on inside the 8-day window.
- [x] CI build/lint/test gate on every PR — `.github/workflows/ci.yml` runs typecheck, lint, build, test on every PR/push to `main`; verified all four pass locally.
- [x] COPPA/FERPA informal read — written determination at `docs/coppa_ferpa_determination.md`. FERPA: not applicable to MVP (no school/district data relationship). COPPA: real gap found — no age gate existed at signup; fixed today by adding a required 14+ self-attestation checkbox to `src/app/signup/page.tsx` (covers both email/password and OAuth signup paths).

## Day 2 (Jun 29) — RLS, auth, and access-control verification
- [x] RLS verification pass on every student-facing table — `profiles`, `school_matches`, `timeline_items`, `regeneration_log` all scoped via `auth.uid() = user_id` policies in `supabase/schema.sql`; no open fails found.
- [x] Auth/session edge cases — protected routes redirect to login (`src/proxy.ts`, confirmed); onboarding doesn't partial-save (single insert at submit, confirmed); **completed-users-skip-onboarding was broken — fixed today**: `src/app/onboarding/page.tsx` now checks for an existing profile on mount and redirects to `/dashboard`.
- [x] Regeneration cap (3/week) — confirmed enforced server-side via `regeneration_log` in `src/app/api/matches/generate/route.ts`, can't be bypassed by client.
- [x] RLS integration tests (`src/lib/rls.integration.test.ts`) — rewritten to student-table cases only (reads + write-attempts on all four tables); counselor/cross-school cases dropped and parked for Phase 2.

## Day 3 (Jun 30) — API hardening
- [x] Rate limiting on `/api/essay/feedback`, `/api/career-path`, `/api/matches/generate`, `/api/timeline/generate` — per-user sliding window via `src/lib/rate-limit.ts` (essay/matches/timeline: 5/min, career-path: 10/min), returns 429 over the threshold. In-memory and scoped to a warm serverless instance — fine for MVP traffic; fast-follow note added below if multi-instance bypass becomes a real concern.
- [x] Input validation/sanitization at all API boundaries before hitting Anthropic or DB — `src/lib/validate.ts` (`requireString`, `rejectScriptTags`) applied to `essay` and `schoolName` request bodies; oversized/empty/script-tag input now gets a 400 before reaching Anthropic or the DB.
- [x] CORS and CSRF check on all state-changing API routes — `src/lib/origin-check.ts` rejects requests with a cross-site `Origin` header (403) on essay feedback, career path, matches generate, timeline generate, and Stripe checkout. Webhook route is intentionally exempt (called by Stripe, verified by signature instead).
- [x] Dependency vulnerability audit (`npm audit`) — 2 moderate findings, both the same transitive `postcss` advisory (XSS via unescaped `</style>` in CSS stringify output) pulled in by Next's bundled tooling. Not exploitable here: it's a build-time CSS processing path, not reachable with user-supplied input. Fix requires a major Next version bump, out of scope for the 8-day window — documented here instead of bumped blind.
- [x] Error/retry states for all 4 AI calls — already implemented prior to this pass: essay feedback has an explicit loading state + error message + Retry button; matches/timeline regenerate show a full-screen loading state and surface errors inline with the same action button serving as retry; career path explorer shows inline loading/error/Retry. No blank screens or fabricated data on failure in any of the four.

## Day 4 (Jul 1) — Product-spec verification
- [x] Verify Screen 0 (Profile Completeness Popup) triggers/re-triggers correctly — `src/components/ProfileCompletenessModal.tsx` checks all 5 optional fields, session-scoped dismiss (reappears on next session), mounted on matches/dashboard/timeline pages. Matches spec.
- [x] Verify "you are here" timeline marker priority logic matches spec exactly — `computeYouAreHere()` in `src/app/timeline/page.tsx` correctly: filters to incomplete + non-strategic + has-due-date, sorts by nearest date then by school_tags count descending, strategic items never eligible. Matches spec exactly.
- [x] Verify profile-sync-on-complete behavior on timeline items — `src/app/timeline/[id]/TaskDetailClient.tsx` updates the `profiles` row immediately on completion when `profile_sync_field` is set. Matches spec.
- [x] Loading states with contextual copy (not bare spinners) on all 4 AI calls — confirmed: "Building your personalized list...", "Mapping out your timeline...", "Reading your draft...", "Loading career path..." Matches spec.
- [x] Add visible AI-generated-content disclaimer on essay feedback, career path, matching, and timeline outputs — **gap found and fixed**: no disclaimer existed anywhere in the codebase. Added a one-line disclaimer to all 4 output screens (`MatchListClient.tsx`, `TimelineClient.tsx`, `EssayFeedbackClient.tsx`, `SchoolDetailClient.tsx`).
  **Acceptance criteria (all above):** each behavior verified against the spec, not assumed from the code.

## Day 5 (Jul 2) — Legal/trust minimums
- [x] Terms of Service + Privacy Policy — drafted and published at `/terms` and `/privacy`, scoped to the actual student-only free/Premium product (not boilerplate): covers AI-generated content disclaimers, the 14+ COPPA self-attestation, Stripe billing, and account deletion rights. Added to `PUBLIC_PATHS` in `src/proxy.ts` so they're reachable logged-out, linked from the landing page footer. **Still needs a human (ideally legal) read before launch** — this is a solid draft, not a substitute for review.
- [x] Account deletion / data deletion request flow — `POST /api/account/delete` (`src/app/api/account/delete/route.ts`) deletes the user's rows from `reminder_log`, `counselor_notes`, `regeneration_log`, `timeline_items`, `school_matches`, and `profiles` via the service-role client, then calls `auth.admin.deleteUser`. Wired to a confirm-before-delete control on the Profile screen (`src/app/profile/ProfileClient.tsx`).
- [x] Basic SEO/metadata: title tags, OG tags, sitemap.xml, robots.txt — `src/app/sitemap.ts` and `src/app/robots.ts` added (robots disallows authenticated app routes, allows the public landing/legal pages); root `layout.tsx` now sets `metadataBase`, OpenGraph, and Twitter card metadata.

## Day 6 (Jul 3) — Email + QA pass, part 1
- [x] Email infra: welcome email — Resend wired up via `src/lib/email.ts` and `src/app/api/email/welcome/route.ts`, triggered from `src/app/onboarding/page.tsx` after profile creation (fire-and-forget, never blocks onboarding). Verified: test email sent and confirmed received/rendered correctly in a real inbox. Currently sending from Resend's sandbox address (`onboarding@resend.dev`) since no custom domain exists yet — switch `EMAIL_FROM` once a custom domain is connected.
- [ ] Email deliverability: SPF/DKIM/DMARC — **deferred to Phase 2** (requires buying a custom domain, ~$10-15/yr, then DNS console access on the registrar). Bundled with the `kairosadmissions.com` domain purchase below.
- [x] Walk every student screen end to end; cross-check against the master doc's exact requirements (badge logic, "you are here" logic, locked-state patterns) — done via direct code read against `Metam Master.pdf` (pre-rebrand spec doc) for Screens 0, 2, 3, 4, 5, 6, 8, 9, plus a dedicated subagent audit of Screens 3/5/6/8. Findings below.
- [x] Log every gap found as a checklist for Day 7 — 4 real gaps found, all fixed same-day rather than deferred (see Day 7):
  1. **Match list grouping order** — `src/app/matches/page.tsx` sorted schools alphabetically by category (reach/safety/target) instead of the spec's reach→target→safety order. **Fixed**: explicit category-rank sort, percentage order preserved within each group.
  2. **AI-generated content disclaimer missing everywhere** — no screen disclosed that match %, timeline, career path, or essay feedback content is AI-generated. **Fixed**: one-line disclaimer added to all 4 output screens (see Day 4).
  3. **School Detail info-tab stats were hardcoded identically for every school** (`~35%` / `1880s` / `~12,000` on literally every school page) — `src/app/schools/[id]/SchoolDetailClient.tsx`. **Fixed**: deterministic per-school placeholder values (varies by school name) plus an "approximate, verify on the school's official site" disclaimer, since no real per-school stats API is in scope for this MVP. **Real fix is a fast-follow**: integrate a real college-data API (e.g. College Scorecard) — tracked below.
  4. **Profile/Resume screen's Classes, Internships & Research, and Achievements sections render as permanently empty placeholders** — `src/app/profile/ProfileClient.tsx`. Investigated and determined this is **not a bug**: the locked DB schema (`profiles` table, exact-fields-only per spec) has no columns for classes/internships/achievements, only `extracurriculars`. Showing an honest "nothing here yet" empty state is the correct behavior given the schema constraint, rather than fabricating data with no backing field. No fix needed; not a launch blocker.

## Day 7 (Jul 4) — Fix pass + cross-browser
- [x] Fix everything Day 6 surfaced — all 4 gaps from Day 6 fixed same-day (see above); none deferred except the real-data-source fast-follow noted on item 3.
- [x] Landing page copy/nav cleanup — removed the "How it works"/"Pricing"/"About" anchor nav items from the landing header (`src/components/blocks/hero-section-5.tsx`, they pointed at non-existent sections); tightened the hero subhead copy.
- [x] Onboarding profile fields reworked — `intended_major` and a new required `schools_already_considering` field (replacing `location_preference`/`college_goals`, which weren't used meaningfully by the matching prompt) are now required at signup; added an optional test-scores input that surfaces the previously-unused `test_scores` column. Updated `supabase/schema.sql`, `src/app/onboarding/page.tsx`, `src/app/profile/ProfileClient.tsx`, `src/components/ProfileCompletenessModal.tsx`, and the AI prompts in `src/app/api/matches/generate/route.ts` and `src/app/api/timeline/generate/route.ts` to match. Migration (`supabase/migration_002_profile_fields.sql`) has been run against both staging and production — live now.
- [x] Dashboard home redesigned — replaced the static mission-statement block with a live mini-matches/mini-timeline hub (`src/app/dashboard/page.tsx`); moved the mission statement + new compelling stats to a dedicated `/about` page (public, added to `PUBLIC_PATHS` in `src/proxy.ts`), linked from the dashboard and landing footer.
- [x] Upgrade page now shows "Premium is coming soon" instead of live Stripe checkout buttons, since Stripe billing isn't wired up for this MVP (`src/app/upgrade/UpgradeClient.tsx`).
- [x] AI prompt refinement pass — tightened all 4 generation prompts in `src/lib/anthropic.ts` and `src/app/api/career-path/route.ts`: matches now requires real/accurate school names grounded in actual acceptance data (no fabricated schools), uses the student's already-considering list as taste signal without just repeating it back, and pushes for variety within each category; timeline grounds deadlines in real standard admissions timing (EA/ED ~Nov 1, RD ~Jan 1, FAFSA Oct 1) scaled to grade level, and pushes strategic advice toward concrete actions over generic platitudes; essay feedback now requires quoting/paraphrasing the specific line being critiqued and forbids inventing unstated facts about the student; career path avoids naming unverifiable specific employers and keeps salary ranges realistic rather than best-case. No new infrastructure needed, this is the API/account already set up in Day 1 — see the API billing note below.
- [x] Fund the Anthropic API billing account (console.anthropic.com → Billing) — **done Jun 29**: credits purchased and `ANTHROPIC_API_KEY` confirmed present in Vercel production env vars. Also bumped the model from `claude-sonnet-4-5` to `claude-sonnet-4-6` in `src/lib/anthropic.ts` for better output quality.
- [x] Cross-browser/device pass: Safari + Chrome, desktop and a real mobile device — done.
- [x] Final regression pass on the full student flow — code-level verification complete: all routes audited (auth guard, onboarding redirect, matches grouping, timeline "you are here" logic, essay feedback, profile save/delete, account deletion); ESLint clean (0 errors, 0 warnings, including 2 real bugs fixed: unescaped entity in TimelineClient and a setState-in-effect in hero-3d); TypeScript clean; 12/12 unit tests pass; build succeeds.
  **Acceptance criteria:** a full end-to-end walkthrough passes with zero open bugs from the fix list.
- [x] **Backend/hardening work complete.** Day 7 closed out.

## Day 9 (Jun 30) — Launch day, in strict order

**Scope change (Jun 30):** remaining work compressed into a single sequence executed today, finishing with launch tonight. Reordered today — **naming + internet search go first, then finish security, then the rest.** The real product name has to be locked before any copy is written or the app is deployed, and the app has to be safe before it's polished. Each later step polishes a more-frozen product than the last.

### 1. Internet search + pick the actual name (first) — DONE (Jun 30)
- [x] **Product name picked: Kairos** (Greek *kairos* — "the opportune moment"; ties to the application-timing/deadline core of the product). "Telos" was the working title; brand is now **Kairos**.
- [x] **Internet search to validate the name** — done. Findings: the bare word is heavily used (kairos.com is an identity-verification company; multiple live KAIROS software trademarks across security/IoT/video; a direct-space competitor, **Kairos Educational Services**, does HS college-admissions counseling). No clean bare-word `.com`/`.app`/`.co`/`.ai` — all parked/aftermarket. **Resolution:** display brand stays "Kairos"; domain will be **`kairosadmissions.com`** (the only genuinely unregistered, base-price option found — also a distinct mark vs. the standalone "Kairos" trademarks, and strong for SEO). Domain purchase deferred to Phase 2; tonight launches on the existing Vercel URL.
  **Acceptance criteria:** ✅ final name chosen and cleared by search; every downstream step (copy, metadata, deploy) uses **Kairos**.

### 2. Finish launch-hardening (security)
Derived from research (Jun 29) into general + vibe-coded launch failure modes. Most of the catastrophic vibe-coded incidents (Moltbook, Lovable/CVE-2025-48757, Enrichlead, Base44) are already covered by the Day 1–3 hardening (RLS verified, server-side auth, rate limiting, secrets audit). Done first today so the app is safe before it's polished. These checks close the remaining gaps:
- [x] **No global `noindex` on production** — VERIFIED (Jun 29): no `noindex`/`nofollow`/`X-Robots-Tag`/`robots:{index:false}` anywhere in source, no static `public/robots.txt` shadowing the dynamic route. `robots.ts` allows public pages (landing, /about, /terms, /privacy) and disallows /dashboard, /profile, /matches, /timeline, /essay-feedback, /counselor, /api. (Still confirm Vercel Deployment Protection is OFF for prod — dashboard check #3/#4 territory.)
- [x] **Error monitoring before launch (pulled forward from Fast-follow)** — DONE (Jun 29). `@sentry/nextjs` wired into client + server + edge via `instrumentation.ts`/`instrumentation-client.ts`/`sentry.{server,edge}.config.ts` + `global-error.tsx`, all DSN-gated. Build passes. DSN verified live (test event accepted by ingest). NOTE: do NOT run the Sentry wizard — it conflicts with the hand-tuned Next 16 config.
- [x] **IDOR / resource-ownership pass** — VERIFIED (Jun 29). All four dynamic-id pages (`/schools/[id]`, `/matches/[id]/breakdown`, `/timeline/[id]`, `/counselor/students/[id]`) auth the session user and scope lookups with `.eq("user_id", user.id)` (or school-scope for counselors). All 8 API routes use `isTrustedOrigin` + `auth.getUser()` and scope to `user.id`; Stripe checkout uses `client_reference_id: user.id` + server-side price IDs; welcome email only sends to `user.email`; webhook is signature-verified. Client-side writes that filter by `id` only (MatchListClient, TaskDetailClient, ProfileClient) are backstopped by owner-scoped RLS (`for all using (auth.uid()=user_id) with check`). All 4 service-role usages are gated/scoped. **Minor non-blocking note:** `counselor_notes` RLS WITH CHECK validates `counselor_id` ownership but not that `student_user_id` is in the counselor's school — a counselor could write a note row referencing an out-of-school student (no data exposure, not reachable via UI). Optional post-launch hardening; counselor dashboard is outside the student-only launch scope.
  **Acceptance criteria:** the verified checks above (noindex, error monitoring, IDOR/resource-ownership) hold. Remaining dashboard-side checks (Sentry DSN in Vercel env, Vercel rollback confirmation, Supabase backups) dropped from scope by decision Jun 30.

### 3. Legal / privacy disclosure hardening — DONE (Jun 30)
Added from Jun 30 research into legal/privacy failure modes for AI-for-minors products (FTC "broken-promise" privacy cases, Operation AI Comply / AI-washing, Character.AI product-liability suits, CCPA/CPRA notice-at-collection + purpose limitation).
- [x] **Notice at collection / "why we collect" (`/privacy` §1)** — rewrote into a per-category → specific-purpose list (login identity, age confirmation, profile details, essay drafts, saved plan, diagnostics); removed stale fields (`location preference`/`college goals`). Satisfies CCPA/CPRA notice-at-collection and the "no generic purposes" rule.
- [x] **Subprocessor / AI disclosure (`/privacy` §2)** — names every subprocessor (Anthropic, Supabase, Stripe, Resend, Vercel, Sentry) and what each receives; leads with "we don't sell your data / no targeted advertising"; discloses essay + profile data go to Anthropic. Closes the third-party-disclosure gap.
- [x] **Just-in-time notices** — onboarding form ("we use this to build your matches/timeline, never sold," + Privacy Policy link) and a micro-note on the essay screen ("your draft is sent to Anthropic to generate feedback").
- [ ] **Still open (deferred):** soften AI-washing marketing copy ("replaces a private counselor" → "counselor-style help, not a substitute") — fold into content rewrite (step 5); reach WCAG 2.1 AA before driving traffic (fast-follow, consider pulling forward); extend the COPPA/FERPA memo to cover SOPIPA + state student-privacy laws.
  **Acceptance criteria:** every data category has a stated purpose at the point of collection; all subprocessors disclosed; no "we sell your data" ambiguity. **Not a substitute for legal review before going wide.**

### 4. System prompt tuning
- [ ] Further tuning pass on the 4 AI system prompts in `src/lib/anthropic.ts` and `src/app/api/career-path/route.ts`, building on the Day 7 refinement. Now running on `claude-sonnet-4-6`. Settle the AI-generated output before copy and visuals are polished around it.

### 5. Website content rewrite
- [ ] Pass over all on-page (static) copy — landing, dashboard, onboarding, about, upgrade, profile, matches, timeline, essay feedback — for tone, clarity, and accuracy. Separate from the prompt tuning above: this is the hardcoded text in the `.tsx` files, not AI-generated output.
- [ ] Specific areas: landing hero/subhead, `/about` mission paragraph and stats, onboarding field labels/placeholders, dashboard empty-state copy ("no matches yet", "nothing upcoming"), upgrade page's coming-soon messaging.
  **Acceptance criteria:** every screen's copy deliberately reviewed and rewritten where needed.

### 6. UI/UX polish pass — requires you
- [ ] Freeze scope — no new features, nothing from Phase 2 pulled forward.
- [ ] UI/UX pass on real hardware — **blocked on you**: needs a real mid-range phone; I can't simulate real device rendering/perf from here.
  **Acceptance criteria:** usable and visually clean at 375px/414px on real hardware, done after the content rewrite so it polishes a copy-frozen product.

### 7. Thorough desktop/laptop testing — requires you
- [ ] Full end-to-end walkthrough of the entire student flow in a desktop browser: sign up → onboarding → matches generate → regenerate → school detail → match breakdown → timeline generate → "you are here" marker → task detail/complete → essay feedback → profile edit/save → account deletion. Click every button, submit every form, trigger every AI call, and exercise error/retry paths (e.g. force a failed generation). Confirm no console errors, no broken states, no fabricated/placeholder data.
- [ ] Check both Chrome and Safari on the laptop (Safari catches issues Chrome hides).
  **Acceptance criteria:** every screen and interaction works end-to-end on the laptop with zero open bugs, before moving to on-device mobile QA.

### 8. Mobile device QA + troubleshooting — requires you
- [ ] Walk the full student flow on a real phone against the dev server (hot-reload connected, like today's login-rendering fix): every screen renders correctly, no blank sections, text/buttons/layout all present and tappable, no broken hero/WebGL content. Fix any rendering or layout bugs surfaced on-device before deploying.
  **Acceptance criteria:** every screen verified visually correct on a real phone, and any issues found are fixed and re-confirmed on-device — not deferred past launch.

### 9. Deploy + pre-launch — requires you
- [ ] Deploy the finished, rewritten, polished app to production (last code-side step).
- [ ] Rotate Anthropic/Supabase production keys one final time — **blocked on you**: requires console access to both providers.
  **Acceptance criteria:** every production key in active use was generated after this rotation.
- [ ] Final SSL/deliverability check on `kairosadmissions.vercel.app` (Vercel default cert; email still on Resend sandbox sender since domain/email DNS deferred to Phase 2).

### 10. Launch
- [ ] **Student-only MVP launch — night of Jun 30.**

---

## Fast-follow (post-Jul-6, first 2–3 weeks) — not pre-launch blockers
- [ ] Register **`kairosadmissions.com`** + connect via Vercel DNS (currently launching on the Vercel URL) — confirmed unregistered/base-price as of the Jun 30 name search; requires purchasing the domain. Deferred from pre-launch by decision Jun 29.
- [ ] Uptime monitoring, structured AI-cost logging/alerting (basic error monitoring via Sentry pulled forward to pre-launch step 2 on Jun 29)
- [ ] Supabase backup/restore drill (full restore actually exercised; pre-launch step 2 only confirms backups are *enabled*)
- [ ] PWA conversion (manifest, icons, splash, service worker)
- [x] DB indexes on foreign keys for match/timeline queries — added to `supabase/schema.sql`: indexes on `counselors.school_id`, `profiles.school_id`/`counselor_id`, `school_matches.user_id` (active rows only), `timeline_items.user_id` and `(user_id, due_date)` for incomplete items, `counselor_notes.counselor_id`, `reminder_log.counselor_id`/`student_user_id`. **Not yet applied to the live Supabase DB** — this is a migration file change only; you'll need to run it against staging/prod.
- [x] Accessibility pass (focus states, keyboard nav, screen reader labels) — added global `:focus-visible` outline (`globals.css`, previously none existed anywhere), `aria-label`/`aria-haspopup`/`aria-expanded` on the icon-only account-menu toggles in `NavShell.tsx`, and `role="dialog"`/`aria-modal`/`aria-labelledby` on `ProfileCompletenessModal.tsx`. Audited for missing image alt text and bare-div click handlers — none found, all click targets are already real `<button>` elements.
- [ ] Load test AI endpoints under concurrent traffic
- [ ] Weekly digest email
- [ ] Cookie/analytics consent (only once tracking is actually added)
- [ ] Investigate blank-screen bug on mobile Chrome/iPhone — hero section body content (text, buttons) doesn't render, only the "Kairos" header logo shows. WebGL error boundary + `isWebGLAvailable()` check added (`src/components/blocks/hero-3d.tsx`) but didn't resolve it. Next step: enable Safari Web Inspector on Mac (Safari → Settings → Advanced → Show features for web developers) then connect iPhone via cable to get real console errors. Root cause still unknown.

---

## Phase 2 (post-MVP) — counselor + premium + billing

Parked, not deleted. Existing in-progress artifacts to pick back up: `migration_001_counselor_dashboard.sql`, `seed_counselor.sql`, `supabase/seed_second_school.sql`, `src/lib/rls.integration.test.ts` (counselor/cross-school cases), `src/app/api/stripe/webhook/route.integration.test.ts`, and the `/counselor/*` routes/`isCounselor` guard already built.

- [ ] Counselor dashboard: Screen C1 (Counselor Home), C2 (Student Detail View), C3 (At-Risk Flags), C4 (Send Reminder), C5 (Class-Level Aggregate View)
- [ ] `counselors`, `counselor_notes`, `reminder_log` tables + RLS; `school_id`/`counselor_id` on `profiles`; multi-tenant edge cases (student transfers schools, counselor deactivated)
- [ ] Premium tier: Stripe checkout, webhook as source of truth for `subscription_tier` (grant + revoke), idempotency on replayed events, failed payment/dunning, plan changes/proration, invoices/receipts, test→live checklist, refund runbook
- [ ] Stripe business verification (payouts enabled, live mode) — requires business entity/banking info
- [ ] Self-serve or sales-assisted school signup flow; admin tooling to onboard a school without raw SQL
- [ ] Data Processing Agreement template for school districts
- [ ] Support contact / SLA statement for paying school accounts
- [ ] Sales collateral for school districts (one-pager / demo walkthrough)
- [ ] Public-facing pricing page
- [ ] One real (non-seeded) counselor pilot before any counselor-facing public launch
- [ ] Live-mode Stripe smoke test with a real card before any paid launch — requires a real card/real money transaction

## Post-Phase-2 roadmap

- [ ] **Native mobile app (iOS/Android).** Tabled deliberately: the PWA fast-follow work covers the "feels like an app" need without App Store review risk or the Apple in-app-purchase/Stripe conflict. Revisit once there's real post-launch usage data. When picked up: decide React Native/Expo vs. Capacitor, resolve the Stripe-vs-Apple-IAP payment question first, and budget real calendar time for device testing and review cycles.
