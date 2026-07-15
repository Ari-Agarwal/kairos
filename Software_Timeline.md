# Kairos Timeline — Student-Only MVP (Launch Jun 30, night)

**Status:** Phase 1 (launch), Phase 2 (counselor dashboard), and most of Phase 3's build sections are complete — see the completed-work archive in git history (this file was pruned to open items on Jul 15). Current focus is finishing Phase 3 (competitive parity + YC-facing differentiation) before the Phase 3 launch gate.

**#1 priority (Jul 15):** get the signup link live and in front of people — `kairosadmissions.com` (or whatever the current signup URL is). Everything else below this line is important but secondary to this until it's done.

---

## Still open from Phase 1 (deferred, not forgotten)
- [ ] Email deliverability: SPF/DKIM/DMARC — deferred to Phase 2, needs a custom domain purchase (bundled with `kairosadmissions.com` below).
- [ ] Rotate Anthropic/Supabase production keys one final time — deferred by decision (Jul 4/5); needs console access to both providers.

## Fast-follow (not pre-launch blockers)
- [ ] Get a free personal `COLLEGE_SCORECARD_API_KEY` at api.data.gov/signup and set it in env — currently on the shared public `DEMO_KEY` (30 req/hr, 50/day, shared worldwide); fine pre-scale since results are cached, but a personal key removes exposure to other users' traffic.
- [ ] Register **`kairosadmissions.com`** + connect via Vercel DNS (currently launching on the Vercel URL).
- [ ] Uptime monitoring, structured AI-cost logging/alerting (basic error monitoring via Sentry already done).
- [ ] Supabase backup/restore drill (full restore actually exercised, not just confirming backups are enabled).
- [ ] PWA conversion (manifest, icons, splash, service worker).
- [ ] Load test AI endpoints under concurrent traffic.
- [ ] Weekly digest email.
- [ ] Cookie/analytics consent (only once tracking is actually added).
- [ ] Investigate blank-screen bug on mobile Chrome/iPhone — hero section body content doesn't render, only the "Kairos" header logo shows. WebGL error boundary added but didn't resolve it. Next step: Safari Web Inspector + cable-connected iPhone for real console errors. Root cause still unknown.

---

## Phase 2 (Jul 3–7) — Counselor dashboard build, QA, demo-ready
**Complete.** Dashboard built and QA'd (`src/app/counselor/`), multi-tenant isolation verified, demo-ready for Jul 7.

---

## Phase 3 — Competitive parity + YC-facing differentiation features

**North star (Jul 14):** the moment Phase 3 closes, Kairos should be the product Ari would put in front of a YC partner unprompted — not a feature checklist that's "done," but something that feels finished, fast, visually confident, and backed by evidence it works.

Decision (Jul 14): build the full feature set identified in competitive research, not a subset. Runs **before Phase 4 (premium tier + billing)**.

**Workflow discipline for this entire phase (Jul 14 decision):** everything below happens against the local dev server and staging Supabase only. Nothing merges to production or touches `kairosadmissions.vercel.app` until every section of this phase is complete and explicitly signed off. The **only** production deploy in this phase is the single gated step in Section 13.

**Ordering decision (Jul 14):** the visual identity rollout (Section 11) runs **last**, immediately before the investor-readiness pass — after onboarding and other screens are structurally settled, so nothing gets themed twice.

### 1. Onboarding restructure
- [~] Split onboarding into a minimal account-creation step + progressive per-feature intake screens shown at the moment each feature is first opened (Kollegio-style staged pattern). **Partially done (Jul 14):** onboarding shrank from 6 required rounds to 4; deeper fields moved out of the blocking flow into `ProfileCompletenessModal.tsx` → `/profile?edit=true`. **Not done:** true per-feature contextual prompting (financial fields interrupting matching, essay-prompt context inside the essay workspace) — deferred until those feature screens are built.
  **Acceptance criteria:** a new account reaches a first real match with the shortest form path possible (met); deeper fields collected contextually, not upfront (partially met); profile-completeness tracking extends to every new field (met).
- [ ] Naviance/SCOIR import — let students with an existing school-counselor tool pull that data in at onboarding. **Feasibility checked (Jul 14): not buildable as a student-initiated import today** — both platforms require a district-level data-sharing agreement, no student-facing self-service export API. **Recommendation:** park behind the Section 6 institutional/B2B wedge; becomes a partnership conversation if Kairos signs a district relationship, not an engineering task now.

### 2. Matching & timeline depth (P0 from the competitive audit)
- [ ] Rebuild timeline generation off real per-school deadlines/requirements (ED/EA/RD dates, supplement counts, rec-letter counts) instead of the current generic milestone approach. **Blocked on a real per-school deadline data source** — `college-scorecard.ts` carries zero deadline fields; a licensed data provider or manually maintained dataset are the real options, both requiring an account/contract or ongoing content-ops work. Current stopgap: AI states general ED/EA/RD timing patterns, explicitly labeled as general, not confirmed per-school dates.
- [~] Financial aid & net-price data per matched school; scholarship search filtered to profile. **Net-price data done (Jul 15)** via real College Scorecard fields, shown on `SchoolDetailClient.tsx`. **Scholarship search still blocked** — no scholarship database exists or is licensed.

### 3. Essay, activities, and recommendations
**Complete** — essay workspace (brainstorm + rubric feedback), activity evaluation, rec-letter tool, waitlist/deferral letters, fee-waiver detection all shipped Jul 15.

### 4. Outcome data flywheel
**Complete** — outcome-capture logging and "students like you" cohort view both shipped Jul 15. Cohort view is calendar-gated (needs a real decision cycle, roughly March–April) before it shows real numbers instead of "not enough data yet."

### 5. Growth loop / demo-day features
- [ ] Mentor loop productized — students with logged outcomes can mentor others in-app, tying the mentor-driven GTM motion into an in-product referral/retention loop.
- [ ] SMS-first nudges (deadline reminders, weekly essay prompt, odds updates). No SMS provider installed yet — pick one (Twilio default) and scope phone-number collection + delivery/opt-out compliance as part of this item.
- [ ] AI mock interview simulator (voice in/out, scored feedback). No voice provider installed yet. **Flag:** this records a minor's voice — a more sensitive consent case than any text-based feature so far; consent copy and retention policy need deciding alongside the provider choice.
- [ ] War room mode — shared per-application comment space for student + parent + mentor/counselor.
- [ ] **Common App autofill/status-sync browser extension — external-gated.** Common App's ToS restrict automated form submission/scraping; needs a resolved approach (official partnership/API, or a manually-triggered fill-assist pattern) before this is an engineering task rather than a compliance risk. Do not build the scraping version.

### 6. Institutional / B2B wedge (reuses the counselor dashboard from Phase 2)
- [ ] School counselor dashboard rollout beyond the current seeded demo — this is Phase 2 (GTM)'s parked school-sales motion in `Launch_Timeline.md`; the dashboard code already exists, so this is a sales/rollout item more than a build item.
- [ ] API/integration for community-based organizations (CBOs) running cohort-based college-access programs — new build, no existing code to extend.
- [ ] Include the counselor dashboard explicitly in the Section 11 visual redesign — so the product doesn't end up with a beautiful student side and a stale-looking counselor side.

### 7. Trust/credibility
**Complete** — methodology page and human-escalation review flow both shipped Jul 15.

### 8. Security & data hardening for everything new
- [ ] **User-to-user safety infrastructure — the most important open item in this phase.** The mentor loop and war room mode (Section 5) both put a minor in direct contact with other people, and a grep of the codebase turns up zero report/block/moderation mechanism. Scope:
  - Report and block controls on every user-to-user surface, available from message one.
  - A moderation queue or at minimum an admin-visible flagged-content view.
  - Rate limiting on message/comment creation (separate from AI-endpoint rate limits — abuse prevention between people, not cost control).
  - An explicit policy decision, made before building the matching logic: fully anonymized/moderated-first-contact, or direct 1:1 from message one? Default to the more conservative option unless there's a specific reason not to.
  **Acceptance criteria:** no user-to-user messaging/commenting feature ships without report/block available from the first release — not a fast-follow item.
- [ ] RLS policies for every new table (outcome logs, mentor relationships, war-room comments, shared invite links, rec-letter brag sheets) — same `auth.uid() = user_id` discipline as the existing tables, verified by extending `src/lib/rls.integration.test.ts`.
- [ ] Rate limiting on every new AI-calling endpoint (essay brainstorm, activity evaluation, mock interview scoring, aid-appeal generator, rec-letter talking points) — same pattern as `src/lib/rate-limit.ts`.
- [ ] Input validation/sanitization on every new API boundary — extend `src/lib/validate.ts`'s `requireString`/`rejectScriptTags` to new free-text fields (career goals, essay brainstorm prompts, war-room comments).
- [ ] Shared-link security review for the parent/counselor invite feature — its own explicit threat pass: guessable/enumerable links, expiry, revocation, over-sharing.
- [ ] `npm audit` + dependency check re-run once new packages (voice I/O, image generation, SMS provider SDK) are added.
  **Acceptance criteria:** every new table/endpoint passes the identical checklist Phase 1 applied to the original four tables and eight endpoints.

### 9. Legal & privacy updates for new data collection
- [ ] Extend `/privacy` §1 (notice at collection) to cover every new data category from Section 1's richer intake and Section 4's outcome logging.
- [ ] Extend the subprocessor disclosure (`/privacy` §2) for any new vendor added (SMS provider, voice transcription, image generation).
- [ ] SMS-specific consent/opt-in flow if the SMS nudges feature ships (TCPA-style consent, separate from the general privacy policy).
- [ ] Re-check the COPPA/FERPA/SOPIPA memo (`docs/coppa_ferpa_determination.md`) against the CBO integration and any expanded school-district relationship from Section 6.
  **Acceptance criteria:** every new data category has a stated purpose at collection, no "sell your data" ambiguity — still explicitly not a substitute for real legal review.

### 10. QA, regression, and cross-platform verification
- [ ] **AI output quality evaluation.** Sections 2–5 add several new AI-generated outputs and, so far, nothing checks the output is actually good, only that endpoints are secure/rate-limited. Build a small eval pass per new AI feature: real/realistic test profiles run through each prompt, read by a human, checked against the Day 7 bar (grounded in real data, no fabricated specifics, concrete not generic).
  **Acceptance criteria:** every new AI-generated feature read and judged by a human against real test input before it's called done.
- [ ] Cross-browser pass (Chrome + Safari) on every new screen.
- [ ] Real mobile device QA on every new screen — Phase 1 found 3 real bugs only visible on-device; assume Phase 3's larger surface area finds more.
- [ ] Full end-to-end regression across the entire student flow AND the entire counselor flow.
- [ ] `npx tsc --noEmit`, lint, full build, and full test suite green.
  **Acceptance criteria:** zero open bugs from this pass before moving to Section 11.

### 11. Visual identity rollout (last major work item)
The palette and imagery direction were decided this session: dark base retained, one disciplined brand accent (`--primary`/`--amber` `#FFB020`), one reserved urgency color (`--red` `#FF5C4D`), one reserved premium color (`--premium` `#B18AFF`), tier distinction still by shade/label not hue, and every onboarding screen carries real topic-specific imagery. Tokens are already live in `globals.css` on localhost.

- [~] Full token audit — grep every component for hardcoded colors that bypass CSS variables. **Mostly done (Jul 15).** Fixed 5 files plus a dangling off-palette essay-feedback color. Legitimate exceptions confirmed (`ShareChancesCard.tsx`, Three.js hero components — render to canvas/WebGL). **Still open (design decisions, not mechanical):** `bg-white/10`/`bg-white/25` opacity variants in `NavShell.tsx`/`TimelineClient.tsx` (no matching-opacity token exists), shadow/glow `rgba()` values in `TimelineClient.tsx`, a purple gradient in `preview-heroes/page.tsx`.
  **Acceptance criteria:** zero raw color values in component code outside `globals.css`.
- [ ] Apply the palette to every screen — landing, auth, onboarding (all steps), dashboard, matches, timeline, profile, essay workspace, career path, upgrade, about, counselor dashboard (all screens), every Section 1–7 feature screen, 404/error states, loading states.
  **Acceptance criteria:** a full click-through of the entire app shows the same disciplined 3-hue system everywhere.
- [ ] Onboarding imagery — commission or generate one real illustration per onboarding step (per the CLAUDE.md requirement), matching the line-art/topic-specific style validated in the mockup. Covers every step, including conversational-intake and career-quiz paths if shipped.
  **Acceptance criteria:** every onboarding screen has imagery specific to that screen's topic.
- [ ] Typography and motion pass — confirm the serif/sans pairing reads intentional against the new palette, add restrained hover/transition states to primary CTAs and interactive cards, respect `prefers-reduced-motion`.
  **Acceptance criteria:** interactive elements have a visible, non-jarring hover/focus state; nothing animates when reduced-motion is set.
- [ ] Post-redesign regression — a second, shorter cross-browser + real-device pass specifically on the now-themed screens.
  **Acceptance criteria:** desktop, tablet, and a real phone all screenshot clean with the new design; screenshots saved for the investor-readiness section.

### 12. Investor-readiness pass
- [ ] Realistic seeded demo data across every new feature — same discipline as Phase 2's seeded mock students, extended to outcome logs, mentor relationships, and cohort views so a live demo never shows an empty state for a feature that's actually built.
- [ ] A clean, rehearsed demo path — a specific click-through sequence a founder can run live without hitting a dead end, placeholder, or empty state.
- [ ] Metrics the pitch can actually cite — onboarding completion rate, time-to-first-match, essay feedback usage, any early mentor-loop or share-loop activity.
- [ ] One-pager / pitch narrative alignment — confirm the product delivers on every claim in the Week 4 one-pager and press hook from `Launch_Timeline.md`.
- [ ] Update the press kit / screenshots (`Launch_Timeline.md` Week 4 asset) with the redesigned product.
- [ ] Explicit go/no-go review against the phase's north star — walk the full product cold and confirm it's something Ari would feel comfortable sharing unprompted.
  **Acceptance criteria:** every item above checked, the demo path run start-to-finish without incident, go/no-go review passed.

### 13. Launch gate — the only production deploy in this phase
- [ ] **Close the uptime/cost monitoring gap before this deploy, not after** — sitting in Phase 1's Fast-follow since launch, never closed. Pull forward into this gate.
- [ ] **Define a rollback plan before deploying.** If PostHog was adopted (Section 1), ship dark via feature flags and flip on after the post-deploy smoke test, with an instant kill switch. At minimum, confirm the previous known-good Vercel deployment can be one-click reverted.
- [ ] Final full regression pass against staging one more time, immediately before deploy.
- [ ] Deploy Sections 1–12's work to production (`kairosadmissions.vercel.app`), in one deliberate, reviewed push.
- [ ] Post-deploy smoke test on the live production URL — same walkthrough as Section 12's demo path, run for real against production.
  **Acceptance criteria:** this step only happens after Section 12 has passed.

**Acceptance criteria for Phase 3 overall:** every item above either ships working end-to-end against real data or is explicitly logged as blocked on something external with the blocker named. Phase 3 is done when Section 12's go/no-go review passes and Section 13's production deploy completes.

---

## Phase 4 — premium tier + billing (behind Phase 3 by decision Jul 14)
Not needed for the Jul 7 Shivam demo. Pick this back up once Phase 3 is done.

- [ ] Kick off Stripe business verification application — worth starting early since it's external turnaround.
- [ ] Reach out to a real counselor contact about a pilot — non-software, yours.
- [ ] Send Terms/Privacy + DPA draft to whoever's doing the legal read — non-software, yours.
- [ ] Stripe checkout integration (test mode keys).
- [ ] Webhook as source of truth for `subscription_tier` (grant + revoke), idempotency on replayed events (`route.integration.test.ts` already drafted — extend/run).
- [ ] Failed payment/dunning flow, plan changes/proration, invoices/receipts — test-mode coverage.
- [ ] Public-facing pricing page.
- [ ] Self-serve school signup flow; minimal admin tooling to onboard a school without raw SQL.
- [ ] Sales collateral for school districts (one-pager / demo walkthrough) — content only, doesn't block code.
- [ ] Full end-to-end desktop walkthrough of premium flow (checkout → webhook grants tier → gated features unlock → cancel/downgrade → webhook revokes), once built.
- Live-mode Stripe verification/billing tracked separately below under "Post-Jul-6 — external-turnaround items."

---

## Post-Jul-6 — external-turnaround items (not blocked on engineering)
- [ ] Stripe business verification clears → flip to live mode → live-mode smoke test with a real card.
- [ ] Real counselor pilot actually runs (once recruited + verification-mode dashboard is ready).
- [ ] Legal read of Terms/Privacy/DPA comes back → fold in any changes.
- [ ] Support contact / SLA statement for paying school accounts — finalize once pricing is legally reviewed.

## Post-Phase-2 roadmap
- [ ] **Native mobile app (iOS/Android).** Tabled deliberately: the PWA fast-follow work covers the "feels like an app" need without App Store review risk or the Apple in-app-purchase/Stripe conflict. Revisit once there's real post-launch usage data. When picked up: decide React Native/Expo vs. Capacitor, resolve the Stripe-vs-Apple-IAP payment question first, budget real calendar time for device testing and review cycles.
