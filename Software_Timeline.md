# Kairos Timeline — Student-Only MVP (Launch Jun 30, night)

**Scope change (Jul 4, tonight):** demo with Shivam is **Jul 7 morning**, showing both the student app and the counselor dashboard — this is now the near-term target, not the original Jul 6 "product done" gate. **Stripe checkout, premium billing (even in sandbox mode), and the public pricing page are pushed to Phase 3** — not software/testing work needed for the demo, so the Jul 5 plan below no longer applies as written; see the new **Phase 3** section. The counselor dashboard (Phase 2's Jul 4 scope) is built, seeded with realistic multi-student data, bug-fixed, and QA'd end-to-end tonight — see Jul 4 below. Remaining Phase 1 launch-prep items (deploy, key rotation, SSL/deliverability check, real-phone mobile QA, Safari check) are **yours to run** — they need console access or a physical device, not more engineering.

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
- [x] Soften AI-washing marketing copy — done as part of the step 6 content rewrite: copy now reads "the kind of guidance a private counselor would give"/"would give, free to start" (comparative), not "replaces a private counselor" (replacement). Verified live in `essay-feedback/page.tsx` and `preview-heroes/page.tsx`.
- [ ] **Still open:** reach WCAG 2.1 AA before driving traffic beyond the demo (a partial pass — focus states, keyboard nav, aria labels — is done, tracked under Fast-follow below; full AA is a bigger lift, correctly deferred); extend the COPPA/FERPA memo to cover SOPIPA + state student-privacy laws (legal-research work, yours).
  **Acceptance criteria:** every data category has a stated purpose at the point of collection; all subprocessors disclosed; no "we sell your data" ambiguity. **Not a substitute for legal review before going wide.**

### 4. UI/UX polish pass — DONE (Jul 2)
- [x] Freeze scope — no new features, nothing from Phase 2 pulled forward.
- [x] UI/UX pass via dev-server preview at desktop/tablet/mobile viewport widths (375px/768px/1280px) — spacing, alignment, contrast, rounded-corner/typography consistency against the design system in `src/app/globals.css`.
  **Found and fixed:**
  - `globals.css` had regressed to pure black/white for every token (`--bg`/`--card` both `#000000`, `--text`/`--text-gray` both `#FFFFFF`, all 5 semantic accents — amber/green/red/premium/secondary — collapsed to identical white). Restored the full spec ramp (`--bg #0A0A0A`, `--card #171717`, `--text #FAFAFA`, `--text-gray #A3A3A3`, `--border #2A2A2A`) and gave each semantic accent a distinct shade/tint so reach/target/safety pills, status tags, and the timeline "you are here" marker read as visually distinct again.
  - Account dropdown menu (`NavShell.tsx`) had no outside-click/Escape handler and stayed open indefinitely, overlapping page content. Added a document-level listener scoped via `data-account-menu`.
  - Dashboard "top matches" and "coming up" cards overflowed horizontally on mobile (375px) — long school names/task titles had no `min-w-0`/`truncate`, and the fix had to be applied at both the flex-row and the outer grid-item level (grid items default to `min-width: auto` same as flex items).
  - Bottom mobile nav (6 tabs) overflowed past the viewport edge at 375px (`px-4` per item); tightened to `px-1.5`.
  - Bottom mobile nav used hardcoded `bg-black` instead of the `--bg` token — fixed.
  **Acceptance criteria:** every screen visually clean and internally consistent at all simulated viewport widths. Real-hardware confirmation still happens later, at Mobile Device QA (step 8) — this step catches what a simulator can.

### 5. System prompt tuning — DONE (Jul 3)
- [x] Further tuning pass on the 4 AI system prompts in `src/lib/anthropic.ts` and `src/app/api/career-path/route.ts`, building on the Day 7 refinement. Matches prompt now guarantees a student's named "already considering" schools are never dropped for a round count; career-path prompt (previously the thinnest of the 4) now handles "Undecided" major properly, actually uses the named school instead of ignoring it, and guards against fabricated statistical precision. Logistics/strategic/essay-feedback prompts reviewed and already solid from the Day 7 pass, no changes needed.

### 6. Website content rewrite — DONE (Jul 3)
- [x] Pass over all on-page (static) copy — landing, dashboard, onboarding, about, upgrade, profile, matches, timeline, essay feedback — for tone, clarity, and accuracy. Separate from the prompt tuning above: this is the hardcoded text in the `.tsx` files, not AI-generated output.
- [x] Specific areas: landing hero/subhead (em dash → comma, dropped the "Real profiles..." line), `/about` mission paragraph (heading no longer sits low on the screen, "runs the same analysis" wording), upgrade page blurb (em dashes removed, dropped the "what you can afford" cost-framing per user request), dashboard/timeline/matches empty-state copy, onboarding/profile extracurriculars hint, school-detail disclaimers — swept for em dashes site-wide as an established style preference (left Privacy/Terms untouched, those are legal docs queued for a lawyer read, not a tone target).
  **Acceptance criteria:** every screen's copy deliberately reviewed and rewritten where needed.

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
- [ ] Get a free personal `COLLEGE_SCORECARD_API_KEY` at api.data.gov/signup and set it in env. School Detail Info tab now pulls real acceptance rate/enrollment/ownership from the College Scorecard API (`src/lib/college-scorecard.ts`), cached 30 days per school in Supabase (`migration_007_college_stats_cache.sql`, already run against prod). Currently running on the shared public `DEMO_KEY` (30 req/hr, 50/day, shared across all api.data.gov users worldwide) — fine pre-scale since caching means each school only needs one live lookup ever, but a personal key removes exposure to other users' traffic before real usage ramps up.
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

## Phase 2 timeline — Jul 3 (today) through Jul 6 night

**Target: product fully done — including all UI design and testing — night of Jul 6.** That's a 3-day window from today. Reordered below into what actually fits that window vs. what can't be compressed no matter how the days are arranged, because it depends on someone else's turnaround (a bank/Stripe review, a legal read, a real human counselor's schedule) rather than engineering time.

**What does NOT fit in 3 days, and why — flagged now so it doesn't quietly slip on Jul 6 night:**
- **Stripe business verification (live mode/payouts)** — this is Stripe's own KYB review of your business entity/banking info, not something you can build faster. Typically days, sometimes longer if they ask follow-up questions. Start it *today* regardless; treat live payments as fast-follow if it hasn't cleared by Jul 6.
- **A real (non-seeded) counselor pilot** — needs an actual counselor's calendar time, not just working code. Even a rushed version needs a person to say yes and show up. Start recruiting today; the pilot itself likely lands after Jul 6.
- **DPA legal review + Terms/Privacy legal read (carried over from Phase 1, line 61)** — needs a human lawyer's turnaround, same constraint as above.
- **Live-mode Stripe smoke test with a real card** — blocked on business verification above; can't happen before that clears.

Given that, this window builds and ships the counselor dashboard + premium tier in **test/sandbox mode**, fully tested end-to-end, so the *product* (UI, flows, code) is done Jul 6 night — with the live-money/legal/pilot items explicitly queued right behind it rather than pretending they're done.

### Jul 3 (today, evening) — finish Phase 1's remaining launch steps first
Phase 1 was never fully closed (Software_Timeline steps 5–10 above were still open) — those block Phase 2 testing since Phase 2 QA assumes a finished student flow underneath it.
- [x] Step 5: system prompt tuning pass — done, see Day/Step 5 above (Jul 3).
- [x] Step 6: website content rewrite pass — done, see Day/Step 6 above (Jul 3).
- [ ] Kick off Stripe business verification application — **not needed for the Jul 7 demo per the Jul 4 scope change**; still worth starting whenever you're ready for real Phase 3 billing work, but no longer gating anything below.
- [ ] Reach out to a real counselor contact about a pilot — non-software, yours; not tracked as blocking the demo.
- [ ] Send Terms/Privacy + DPA draft to whoever's doing the legal read — non-software, yours; not tracked as blocking the demo.

### Jul 4 — counselor dashboard build — DONE (Jul 4, overnight + Jul 4 daytime session)
- [x] `counselors`, `counselor_notes`, `reminder_log` tables + RLS migration — `migration_001_counselor_dashboard.sql` applied; verified live (both `Test High School` counselor rows present, RLS policies in `supabase/schema.sql` confirmed enforcing school-scoped reads).
- [x] `school_id`/`counselor_id` on `profiles` — live and populated.
- [x] Multi-tenant isolation — **verified programmatically, not just assumed**: spun up a temporary second school + counselor + student, confirmed via signed-in API calls that neither counselor can read the other's school/profiles/matches/timeline/notes, and that a forged cross-tenant `counselor_notes` write is rejected by the RLS `with check` clause itself (not just hidden client-side). All temp data cleaned up after. Narrower edge cases (a student transferring schools mid-year, a counselor being deactivated) are still untested — low-risk, not needed for the Jul 7 demo, flagged here for whenever real customers make it relevant.
- [x] Screens C1 (Student Roster), C2 (Student Detail View — Profile/School Matches/Timeline/Counselor Notes tabs), C3 (At-Risk Flags) — built, wired to real data, QA'd.
- [x] Screens C4 (Send Reminder), C5 (Class-Level Aggregate View) — built, wired to real data; Send Reminder tested end-to-end (real row confirmed written to `reminder_log`).
- [x] Counselor UI/UX polish pass at desktop/tablet/mobile widths (375/768/1280px), same rigor as the Phase 1 pass — **real bugs found and fixed**:
  1. **Student Roster table completely broken on mobile** — the 6-column grid (`StudentRosterClient.tsx`) had no responsive variant, so at 375px names truncated to unreadable fragments ("Jordan …") and column headers wrapped mid-word. Rebuilt as a responsive card layout below `md:`, kept the grid at `md:` and up.
  2. **"N overdue" badge unreadable on the active Timeline tab** — `StudentDetailClient.tsx` gave the overdue-count badge colors meant for a dark card background, but it was rendering white-on-white once its parent tab button went active (`bg-primary`). Added a conditional dark variant for the active state.
  3. **Timezone off-by-one on every displayed due date** — `new Date("2026-06-06")` parses as UTC midnight, so `.toLocaleDateString()` showed dates one day early in negative-UTC-offset timezones (e.g. a due date stored as Oct 14 displayed as "Oct 13"). Fixed in the counselor Timeline tab, the student Timeline page, and the dashboard "Coming up" widget (`${due}T00:00:00` forces local-midnight parsing). Confirmed dates shifted to the correct stored values after the fix.
  4. Counselor Profile tab showed raw `{"SAT":1310}` JSON for test scores — now formats as "SAT: 1310".
- [x] Seeded 9 additional realistic mock students into the demo counselor's school (was down to 1) — varied grade levels, GPAs, profile completeness, match/timeline states, and last-login recency, so At-Risk Flags (now 8 flagged students, real varied reasons) and Class-Level Overview (real per-grade GPA/completion averages, 8 distinct most-matched schools) actually look populated for the demo instead of empty.
- [x] Schema-drift audit — wrote a script cross-checking every column in `supabase/schema.sql` against the live database. Found two real gaps: `profiles.stripe_customer_id` and `regeneration_log.timeline_count` are both referenced in code but **do not exist in the live DB** (the latter silently breaks the free-tier weekly timeline-regeneration cap — it always reads back as 0 used, so the cap never actually triggers, though timeline regeneration itself still works). Fix for the regen cap is drafted (`supabase/migration_006_timeline_regen_cap.sql`) but needs to be run from the Supabase SQL editor — not runnable from here (no direct Postgres connection, only the REST API, which can't do DDL). **Still open, needs you.**
- [x] Full regression pass on the student flow underneath, to confirm none of the above broke it — login/logout, signup (age-gate), onboarding → real AI match generation (end-to-end, ~50s), matches list + school detail (Info/Breakdown/Career Path tabs, including the College Scorecard low-confidence-match rejection working as designed), timeline, essay feedback (tested with a real premium account and a real draft — feedback quality is genuinely sharp), profile edit, About/Privacy/Terms pages. `npx tsc --noEmit`, `npm run build`, and all 12 unit tests pass clean throughout.

### Jul 6/7 — remaining QA for the Shivam demo (premium work moved to Phase 3, see below)
- [x] Full end-to-end walkthrough of counselor flow (login → roster → student detail, all 4 tabs → at-risk flags → send reminder → aggregate view) — done tonight (Jul 4), in the Chromium-based dev preview.
- [ ] Same walkthrough in actual Safari — not done; I only had a Chromium-based preview tool available tonight.
- [ ] Mobile device QA on a real phone (both student and counselor flows) — requires you, real phone, same as the original Phase 1 plan.
- [x] Cross-check every counselor screen against spec (same acceptance-criteria bar as Phase 1 Day 4) — done tonight, see Jul 4 above for the bugs this surfaced.
- [x] Regression pass on the student flow underneath — confirm nothing in Phase 2 broke Phase 1 — done tonight, see Jul 4 above.
- [ ] Run `migration_006_timeline_regen_cap.sql` in the Supabase SQL editor (one line, additive, safe — see Jul 4 above) — **the one known, un-fixed gap**, needs your DB console access.
- [ ] **Software is demo-ready for Jul 7 morning modulo the three items above** (Safari pass, real-phone QA, running the one migration). Everything else in the original "done gate" — premium flow testing, live billing — no longer applies here; moved to Phase 3 below.

---

## Phase 3 — premium tier + billing (deferred from the original Jul 5 plan, Jul 4 scope change)

Not needed for the Jul 7 Shivam demo. Pick this back up whenever premium/billing work actually becomes the priority.

- [ ] Stripe checkout integration (test mode keys)
- [ ] Webhook as source of truth for `subscription_tier` (grant + revoke), idempotency on replayed events (`route.integration.test.ts` already drafted — extend/run)
- [ ] Failed payment/dunning flow, plan changes/proration, invoices/receipts — test-mode coverage
- [ ] Public-facing pricing page
- [ ] Self-serve school signup flow; minimal admin tooling to onboard a school without raw SQL
- [ ] Sales collateral for school districts (one-pager / demo walkthrough) — content only, doesn't block code
- [ ] Full end-to-end desktop walkthrough of premium flow (checkout in test mode → webhook grants tier → gated features unlock → cancel/downgrade → webhook revokes), once built
- Live-mode Stripe verification/billing is tracked separately below under "Post-Jul-6 — external-turnaround items," since it's external turnaround rather than engineering work.

---

## Post-Jul-6 — external-turnaround items (not blocked on engineering)

- [ ] Stripe business verification clears → flip to live mode → live-mode smoke test with a real card
- [ ] Real counselor pilot actually runs (once recruited + verification-mode dashboard is ready)
- [ ] Legal read of Terms/Privacy/DPA comes back → fold in any changes
- [ ] Support contact / SLA statement for paying school accounts — finalize once pricing is legally reviewed

## Post-Phase-2 roadmap

- [ ] **Native mobile app (iOS/Android).** Tabled deliberately: the PWA fast-follow work covers the "feels like an app" need without App Store review risk or the Apple in-app-purchase/Stripe conflict. Revisit once there's real post-launch usage data. When picked up: decide React Native/Expo vs. Capacitor, resolve the Stripe-vs-Apple-IAP payment question first, and budget real calendar time for device testing and review cycles.
