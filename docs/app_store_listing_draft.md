# App Store Connect Listing — Draft (Jul 24)

Drafted ahead of the App Store Connect listing (Software_Timeline.md Phase 2, step 7) so it's ready to paste in once the Apple Developer account is approved and Ari's dad creates the app record. Ari/dad should still eyeball everything below before submitting — nothing here has been reviewed by a human yet.

## App name
Kairos Admissions

(Matches the domain strategy and avoids the "Kairos Educational Services" name conflict noted in Launch_Timeline.md.)

## Subtitle (30 char max)
College matches, in one app

(29 chars)

## Promotional text (170 char max, editable without re-review)
Free college matching, application timeline, and essay feedback for high schoolers — see your real odds at every school, reach to safety.

(140 chars)

## Description

Kairos helps high schoolers navigate college admissions without guesswork.

**See your real odds.** Kairos analyzes your academic profile against real admissions data to show your estimated fit at every school on your list — reach, target, or safety — with a plain-language explanation of why.

**Never miss a deadline.** A single timeline tracks every task across every application: essays, recommendations, test scores, financial aid forms. Check things off as you go.

**Get better essays.** Submit drafts for AI-powered feedback tied to what actually matters for each school's admissions readers. See your essay history and how your writing has improved.

**Stay in sync.** Your Kairos account works the same on the web and in the app — sign in once and pick up right where you left off, from school research to submission.

Kairos is free to use and built directly for students, not sold to schools or counselors. Your data is yours: delete your account and everything tied to it at any time, right from the app.

## Keywords (100 char max, comma-separated, no spaces)
college,admissions,application,essay,scholarship,timeline,school,student,match,financial aid

(94 chars — leaves headroom; drop "financial aid" first if it needs trimming since that feature is still mid-build)

## What's New (first submission — use a general launch blurb)
Welcome to Kairos. Track your college matches, application timeline, and essay feedback all in one place.

## Category
Primary: Education
Secondary: (none needed — Education alone is accurate and avoids diluting search relevance)

## Age rating
**13+**, consistent with `docs/coppa_ferpa_determination.md`: the product self-attests users are 14+ at signup (one year above the COPPA floor), so nothing in the App Store questionnaire should trigger a higher rating. Answer "No" to all mature-content categories (violence, sexual content, gambling, alcohol/drugs, horror). Answer "Yes" to unrestricted web access only if the in-app browser (Google/Apple OAuth flow) counts — check current App Store Connect wording when filling this in, since Apple's questionnaire phrasing changes.

## Privacy nutrition label
Per the data-handling posture already documented in `docs/coppa_ferpa_determination.md`'s "Data-handling posture" addendum:

**Data linked to the user:**
- Contact Info: Email Address, Name
- Identifiers: User ID
- User Content: essay drafts/feedback, profile answers (GPA, extracurriculars, interests, narrative-builder answers), other user-generated content
- Usage Data: product interaction data (if PostHog analytics enabled — event names/metadata only, not content, per `lib/analytics.ts`)

**Data NOT collected:** financial info (no income/family data collected — Section 10 of the timeline explicitly not started), precise location, contacts, browsing history, health/fitness, search history, sensitive info.

**Data use:** App Functionality (all of the above). None of it is used for Third-Party Advertising or linked for Tracking — confirm this stays true; the codebase currently sells/shares nothing per the doc above.

**Third parties data may be shared with (processing only, not selling):** Anthropic (essay/profile text for AI generation, per-request), Resend (email delivery), Twilio (SMS, opt-in only), Stripe (payment processing only, no PII beyond what Stripe itself requires).

## Support & marketing URLs
- Support URL: kairosadmissions.com/support (confirm this page exists before submitting — if not, a simple contact-email page is enough for App Review)
- Marketing URL: kairosadmissions.com
- Privacy Policy URL: kairosadmissions.com/privacy (must exist and be live before submission — Apple checks this)

## Review notes (for Apple's reviewer)
This is a free, direct-to-student college admissions app. No school or district account is required — students sign up individually.

A demo account is provided below with sample data already populated (matches, timeline items, essay feedback) so all screens can be evaluated without manual data entry.

Sign in with Apple is implemented per guideline 4.8 since the app also offers Google sign-in. Account deletion is available in-app under Profile → Delete Account and fully removes the user's data (edge function: `supabase/functions/delete-account`).

**Demo account:**
- Email: `reviewer@kairosadmissions.com`
- Password: stored in `.env.local` as `REVIEWER_ACCOUNT_PASSWORD` (not committed — check there or the password manager entry, never paste the literal value into this file)

## Reviewer demo account
Created via `scripts/seed-reviewer-account.mjs` (run with `REVIEWER_ACCOUNT_PASSWORD=... node --env-file=.env.local scripts/seed-reviewer-account.mjs`, or set `REVIEWER_ACCOUNT_PASSWORD` directly in `.env.local`), separate from `student1@test.com` (the dev-seed account used for internal screenshots/testing):
- 6 school matches across reach/target/safety tiers with realistic percentages and factors
- 6 timeline items in a mix of completed/pending states
- 1 essay with feedback history
- Re-running the script is idempotent — it finds the existing account by email and refreshes its data rather than duplicating it, so it's safe to run again before each submission to keep the demo data current.

---

**Still open before this can be submitted:** Apple Developer approval (in progress), EAS project link + first production build, TestFlight pass, live support/privacy/marketing URLs, and the reviewer demo account above.
