# COPPA / FERPA Informal Determination

**Status:** Non-lawyer determination, Day 1 of launch sprint (Jun 28, 2026). Scope today: identify exposure and the minimum mitigation needed before Jul 6 launch — not a legal opinion.

## Facts as of today
- Signup is direct-to-student, self-serve. No school/district account creation in the MVP.
- No age or birthdate field exists anywhere in signup (`src/app/signup/page.tsx`) — there is currently no age floor or gate.
- Data collected per student: name, email, GPA/grades, extracurriculars, interests, and (via the product flow) essay text submitted for AI feedback.
- Target audience is high schoolers (~14-18), but nothing in the product enforces that.

## COPPA exposure
COPPA applies to operators who **knowingly** collect personal information from children under 13. Two relevant facts:
- You don't ask age, so you have no way to know if a signup is under 13 — this does **not** make you exempt; the FTC has held that ignoring obvious signals (e.g., serving an audience that plausibly includes under-13s) can still create exposure, and lack of an age gate is treated as a known gap, not a defense.
- The actual product (GPA, college-prep timeline, career matching) is realistically irrelevant/unusable to a child under 13, which lowers practical risk — but doesn't eliminate it absent a gate.

**Determination:** Low real-world risk given the product's natural audience skews 14-18, but **not compliant as currently built**, because there is no mechanism that prevents or flags under-13 signups.

**Required before launch:** Add a self-attestation age gate at signup. Implemented as a required "I confirm I am 14 years of age or older" checkbox (raised one year above the COPPA 13 threshold for additional margin), blocking both email/password and OAuth signup paths in `src/app/signup/page.tsx`. This is the standard minimum bar (used by Instagram, Discord, etc.) — it shifts you out of "knowingly collecting" territory entirely, with a buffer year. Not airtight (kids can lie), but it's the accepted floor for a free consumer product at this stage.

**Not required for MVP:** Parental consent flows, age verification beyond self-attestation, COPPA-specific privacy notices — these are only needed if you market to or knowingly enroll under-13 users, which you are not doing.

## FERPA exposure
FERPA governs **educational records held by schools/districts** that receive federal funding, and applies to the schools themselves (or to vendors acting as a "school official" under a written agreement).

**Determination:** FERPA does not apply to this MVP. Reasoning:
- No school or district account, integration, or data-sharing agreement exists in this phase (explicitly deferred to Phase 2).
- Telos is a **direct-to-consumer** product in the MVP — students/parents, not schools, are the data subject's relationship-holder.
- GPA/grades entered by the student themselves (self-reported) are not "education records" under FERPA's definition, which covers records *maintained by an educational institution*. Self-reported data the student typed into a third-party app is not a FERPA record.

**Will become relevant:** The moment Phase 2's counselor dashboard or school-level integration ships and schools begin supplying or receiving student data through Telos, FERPA analysis must be redone — likely requiring a written agreement (often structured as a "school official" exception) with each district. Flagged in [Software_Timeline.md](../Software_Timeline.md) Phase 2 section as the Data Processing Agreement item.

## Action items
- [ ] Add age self-attestation to signup, block under-13 (blocks Jul 6 launch — see Day 1/Day 2 checklist)
- [ ] Revisit this doc before any Phase 2 counselor/school rollout
