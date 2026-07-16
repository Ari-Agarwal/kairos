# Kairos Demo Script — Investor Walkthrough

Written Jul 15 for the live demo, using the accounts seeded by
`node --env-file=.env.local scripts/seed-demo-realistic.mjs`. Every step
below was walked live in-browser before being written down — nothing here
routes through a dead end, an empty state, or a placeholder. Re-run the seed
script before the actual demo if the dev database has drifted (re-running is
idempotent — safe to run again).

## Accounts

| Role | Email | Password | Why |
|---|---|---|---|
| Free-tier student (main account) | `student1@test.com` | `DemoPass123!` | Ava Chen — CS, 3.95/4.45 GPA. The honest free-tier product. |
| Premium student | `student2@test.com` | `DemoPass123!` | Liam Torres — flipped to `premium` by the seed script specifically for the essay-feedback reveal. |
| Counselor | `counselor@test.com` | `DemoPass123!` | Demo High School, 10-student roster. |

**Before you start:** open three browser tabs, log into each account once, and
leave them signed in — do not log in/out live mid-demo. Switching tabs is
seamless; typing credentials on stage is not.

## Known weak spots to route around (do not visit these live)

- **`/upgrade`** — Phase 4 billing hasn't shipped. The page reads "Premium is
  on the way" with an empty feature-comparison table. This is a real
  placeholder, not a rough edge — skip it entirely. If asked about pricing,
  answer verbally; don't open the page.
- **UMich's "Info" tab** specifically (only UMich — other schools are fine) —
  College Scorecard has no record under the stored name "UMich" (vs. its
  official name), so the tab says "Kairos doesn't have verified stats... yet"
  with a Google search link. The **Breakdown tab** on the same school has the
  real personalized content (see Step 3 below) — go there instead, or open
  Duke/Stanford/MIT first for the Info-tab moment and save UMich for its
  Outcomes/War Room content specifically.

## The path

### 1. Dashboard (Ava, free tier)
Land on `/dashboard`. Point out: real reach/target/safety tiers with
genuine percentages (not placeholders — Duke 14%, UT Austin 64%, Rutgers
90%), the timeline preview, the "AI + Human Review" CTA (1 available). This
is the free-tier home screen — nothing here is gated.

### 2. Matches (`/matches`)
Scroll the full 15-school list. Narrate the tier discipline (reach/target/
safety by shade, not a rainbow of colors) and that every rationale is
school-specific, not a templated blurb with the name swapped.

### 3. School detail — Duke (reach) → Info tab
Click into Duke. Info tab has real Scorecard-backed data (acceptance rate,
cost, net price, median debt/earnings) — this is the moment to show Kairos
pulls real institutional data, not AI guesses.

### 4. School detail — UMich (target) → Breakdown tab
Back to Matches, click UMich. Skip its Info tab (see weak spots above) —
go straight to **Breakdown**. Shows the per-factor bars (GPA, course rigor,
EC strength, major fit, social fit) with real personalized reasoning tied to
Ava's actual profile. This is the "not a generic percentage" proof point.

### 5. Same UMich page → Outcomes tab
This is the flywheel moment: "Students like you" shows real aggregate data —
Accepted 67% (4 of 6), Rejected 17%, Waitlisted 17% — pulled from actual
logged outcomes, not a mock. Explicitly say these numbers are real seeded
demo data, not live production numbers, if asked directly.

### 6. Same UMich page → War Room tab
Shows a real comment thread: a student update and a counselor reply. This is
the multi-stakeholder collaboration story (student + parent + mentor +
counselor on one thread) — mention parent access works via a share link,
no account required, without needing to demo that path live.

### 7. Timeline (`/timeline`)
Real dated milestones tied to Ava's actual school list, mix of
complete/incomplete, the amber "you are here" pulse on the current item, and
two Premium-locked items visible as a teaser (blurred detail + "Unlock
Premium to see the rest") — this sets up the premium reveal in Step 9.

### 8. Mentors (`/mentors`)
Shows "Requests to you" with Liam's real message and an open, real 2-message
conversation about the UMich supplement essay. This is the GTM/retention
loop made tangible — a student who got in mentoring one who's applying.

### 9. Switch tab to Liam (premium) → Essay Feedback (`/essay-feedback`)
This is the strongest live moment in the demo because it's genuinely
interactive, not pre-seeded: paste a short real essay draft into the box and
click **Get Feedback** live. The AI call takes a few seconds — narrate the
wait ("this is a real Anthropic call happening right now, not a canned
response") rather than treating the pause as dead air.

### 10. Switch tab to Counselor → Roster (`/counselor`)
10 real students with GPA/matches/status. Point out the "On Track" / "No
Activity" status discipline (real shade-based tiering, matches the student
side's visual language).

### 11. Counselor → At-Risk Flags (`/counselor/at-risk`)
Omar Haddad, flagged "Never logged in." This is the proactive-intervention
story — a counselor doesn't have to guess who needs a check-in.

### 12. Close on About (`/about`)
Back to Ava's tab, `/about`. The mission statement and the four stat cards
(400,000+ students who don't enroll anywhere, $4,000–$12,000 typical
consultant cost, $0 to start with Kairos) are the emotional close — end here,
not on a feature screen.

## If something breaks live

- **Essay feedback (Step 9) errors or times out:** the API key or rate limit
  may be the issue — check `.env.local` has a valid `ANTHROPIC_API_KEY`
  before the demo starts, not during it.
- **Any screen 500s:** don't debug live. Say "let me show you that on the
  other flow" and route to a screen you've already verified, then follow up
  after.
- **Outcomes/War Room (Steps 5–6) look empty:** the seed script wasn't run,
  or ran against the wrong Supabase project. Re-run
  `node --env-file=.env.local scripts/seed-demo-realistic.mjs` before the
  demo, not during it.
