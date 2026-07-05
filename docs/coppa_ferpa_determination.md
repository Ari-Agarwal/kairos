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
- Kairos is a **direct-to-consumer** product in the MVP — students/parents, not schools, are the data subject's relationship-holder.
- GPA/grades entered by the student themselves (self-reported) are not "education records" under FERPA's definition, which covers records *maintained by an educational institution*. Self-reported data the student typed into a third-party app is not a FERPA record.

**Will become relevant:** The moment Phase 2's counselor dashboard or school-level integration ships and schools begin supplying or receiving student data through Kairos, FERPA analysis must be redone — likely requiring a written agreement (often structured as a "school official" exception) with each district. Flagged in [Software_Timeline.md](../Software_Timeline.md) Phase 2 section as the Data Processing Agreement item.

## Action items
- [x] Add age self-attestation to signup, block under-13 — done (Jun 30), see above.
- [x] Revisit this doc before any Phase 2 counselor/school rollout — done below (Jul 4), now that the counselor dashboard has actually shipped.

---

## Addendum: SOPIPA + state student-privacy laws (Jul 4, 2026)

**Status:** Same caveat as above — non-lawyer determination, informal read only. Written because the Phase 2 counselor dashboard (roster, at-risk flags, send-reminder, class-level aggregate view) shipped tonight, which is the trigger condition the original memo flagged ("will become relevant the moment Phase 2's counselor dashboard ships"). **Not a substitute for actual legal review before signing any real school or district as a customer.**

### What SOPIPA-style laws are, and the trigger that matters
California's SOPIPA (Student Online Personal Information Protection Act) was the first of what's now 40+ state student-data-privacy statutes (Illinois' SOPPA, New York Education Law 2-d, and similar laws in most other states, many modeled on the Student Data Privacy Consortium's national agreement template). Despite different names, they share the same core restrictions on covered "operators": no targeted advertising using student data, no selling student data, no building non-educational profiles of K-12 students, reasonable security requirements, and deletion of student data on the school's request.

The part that actually matters for Kairos: **these laws are triggered by a formal relationship between the operator and a K-12 school or district** — the product being "designed and marketed for K-12 school purposes" and provided *to* a school/LEA, not by an individual student or counselor signing up on their own. This is the same distinction the FERPA section above already draws, and it's the load-bearing fact here too.

### Where Kairos sits right now
- The counselor accounts shipped tonight are still **self-serve** — a counselor signs up and links themselves to a school record, the same way a student signs up for themselves. There is no formal contract, subscription, or data-sharing agreement between Kairos and any school district.
- `Software_Timeline.md`'s Phase 3 list still has "self-serve school signup flow" and "sales collateral for school districts" as **not-yet-built** — meaning the product doesn't yet have a flow where a district formally becomes Kairos's customer.
- Given that, my informal read is the same shape as the FERPA conclusion above: **SOPIPA and equivalent state laws are very likely not yet triggered**, because there's no formal operator-school relationship, no district contract, and no product feature that markets specifically to schools as the buyer.

### Where this gets real, fast
This determination is fragile and time-limited, not a durable position. It flips the moment any of these happen:
- A school or district pays for, formally adopts, or is invoiced for Kairos access for its counselor(s) (as opposed to a counselor using it as an individual consumer).
- Kairos starts marketing itself *to* schools/districts as a product they should adopt (the Phase 3 "sales collateral for school districts" item, once built and used).
- Any data flows from a school's own systems *into* Kairos (roster imports, SIS integration, etc.) rather than students/counselors typing their own data in.

**Any of those should trigger a real legal review before it happens, not after** — ideally the same review already flagged for the Terms/Privacy/DPA read, since a district-facing SOPIPA/state-law compliance posture usually requires its own written agreement (many states expect the Student Data Privacy Consortium's standard National Data Privacy Agreement template specifically, not just a generic DPA).

### Action items
- [ ] Before any real district/school becomes a paying or formally onboarded customer (Phase 3+), get an actual lawyer to confirm this determination and draft/adapt a state-compliant data privacy agreement (the NDPA template is the common starting point most districts already expect).
- [ ] Revisit this addendum again if a self-serve school signup flow or district sales motion is built, since that's the point this analysis assumes hasn't happened yet.
