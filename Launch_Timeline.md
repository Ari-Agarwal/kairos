# Kairos Promotion Plan — Driving Signups to the Notification Link

Student-direct, free MVP. Goal: maximize signups to the notification/waitlist link before full launch. Written 2026-07-17.

---

## 1. Channel research — every realistic way to promote to high schoolers

### Owned
- **Notification link / landing page** — the conversion endpoint everything below points to. Every channel's only job is to drive traffic here.
- **Email** (if you're collecting any addresses from early testers/mentors) — low volume at this stage, but compounds.
- **SMS to a personal contact list** — direct, high open rate, fine at small scale (friends, camp cohort, debate/MUN/robotics teammates, etc.).

### Rented — where students actually are
- **Instagram** — Reels are the highest-leverage format for this audience. Story reshares from friends' accounts are the actual distribution mechanism (see "friends" below).
- **TikTok** — best top-of-funnel reach per hour invested; "day in the life of applying to college," "I built an app to fix X," relatable pain-point hooks outperform polished demos.
- **Reddit** — r/ApplyingToCollege (huge, high-intent, but strict self-promo rules — must give value first, disclose you're the builder, no link-dropping), r/collegeresults, r/highschool, local city subreddits ("students in [city]").
- **Facebook** — weakest for the students themselves, but parent Facebook groups ("[City] Parents of High Schoolers," class-of-2027/2028 parent groups) are underused and high-trust; parents forward things to their kids.
- **Discord** — study/college-admissions servers (e.g. large ATC-adjacent Discords) — same value-first rule as Reddit.
- **YouTube Shorts** — repurpose the same vertical video from TikTok/Reels, near-zero extra cost.

### Borrowed — other people's audiences
- **Friends and personal network** — the actual engine at this stage. Direct asks ("can you post this to your story") outperform posting and hoping. Personally ask 20-30 people, not a mass blast.
- **School clubs / student orgs** — NHS, student council, college counseling clubs — ask to share in their group chats/newsletters.
- **Micro-influencers in the college-admissions/study-content niche** (5k-50k followers, "studytok"/"studygram") — cheap or free product-seeding, much higher trust-per-follower than big accounts.
- **School newspaper / student-run publications** — free earned coverage, students read these.
- **Guidance counselors and college consultants** (individuals, not institutions — Phase 2 institutional sales is explicitly deferred) — a counselor mentioning it to students is high-trust distribution.
- **Camp mentor's network** (Young Founders Lab) — ask directly for 2-3 warm intros to people with student audiences.

---

## 2. SMART goals

**Primary goal:** Grow notification-link signups from current baseline to **500 signups within 6 weeks** (by 2026-08-28).

Broken into weekly SMART sub-goals:

| Week | Goal | Specific target | Measurable | Achievable | Relevant | Time-bound |
|---|---|---|---|---|---|---|
| 1 (Jul 17–24) | Seed network | 50 signups from direct personal asks (20-30 friends/classmates posting or sharing) | Track via link UTM `?src=friends` | Yes — direct asks convert highest at zero cost | Builds initial social proof for everything after | By Jul 24 |
| 2 (Jul 24–31) | First content push | Post 3 TikToks + 3 Reels (same footage, both platforms), 1 Reddit value-post in r/ApplyingToCollege | 100 cumulative signups, 3%+ link-click rate on posts | Yes — 6 short videos/week is sustainable solo | Tests which hook/format resonates before scaling spend | By Jul 31 |
| 3 (Jul 31–Aug 7) | Double down on what worked | Scale winning format to 2x volume; reach out to 5 micro-influencers for product seeding | 250 cumulative signups | Depends on Week 2 data — adjust format, not goal | Concentrates effort on proven channel instead of spreading thin | By Aug 7 |
| 4 (Aug 7–14) | Borrowed-audience push | Get 2 confirmed micro-influencer posts/stories live; pitch school newspaper | 350 cumulative signups | Realistic if outreach started Week 3 | Borrowed reach compounds on top of owned content | By Aug 14 |
| 5 (Aug 14–21) | Parent channel + Reddit/Discord round 2 | Post in 3 parent FB groups, 1 more Reddit value-post, 2 Discord communities | 450 cumulative signups | Parent channel is untapped — low competition | Reaches a segment your student content doesn't touch | By Aug 21 |
| 6 (Aug 21–28) | Push to goal + retention check | Final content push + re-engage anyone who signed up but hasn't returned | 500 cumulative signups, 30%+ of signups have opened the app at least once | Cumulative effect of 5 prior weeks | Signups alone are vanity without activation | By Aug 28 |

**Guardrail metric (not vanity):** track signup → first-session activation rate weekly, not just raw signups. If activation is under ~25%, stop scaling acquisition and fix onboarding first — more signups into a leaky funnel wastes the same effort.

---

## 3. Recommended stack (most optimal for a solo/small team, zero-to-low budget)

**Core loop, in priority order:**

1. **Personal asks first, always** (Week 1) — before any content goes out, get the 20-30 warm shares done. This is free, converts best, and gives you social proof screenshots to reuse in content.
2. **TikTok + Reels as the primary paid-nothing acquisition engine** — one video, cross-posted to both plus YouTube Shorts. This is the single highest-leverage channel for a high-school audience and costs only time.
3. **Reddit/Discord as a secondary, high-intent but effort-gated channel** — lower volume, but the traffic that converts is unusually qualified (people already actively researching college admissions). Follow community rules exactly (disclose builder status, lead with value, no drive-by links) or risk a ban that kills the channel entirely.
4. **Micro-influencer seeding as the borrowed-reach multiplier once you have 2-3 weeks of content data** — don't cold-pitch before you know what hook works; send your best-performing video as the pitch itself.
5. **Parent Facebook groups as an underused wedge** — almost no competing product is doing this for a student-direct tool, and parents are a second, less crowded distribution path to the same signups.
6. **Product Hunt / press are deliberately excluded from this phase** — they suit a product ready for a broad, general-tech audience; a notification-link-stage MVP aimed at high schoolers gets more value from the channels above. Revisit Product Hunt at full public launch, not now.

**Tooling to support this (all free/cheap tier):**
- Link with UTM parameters per channel (`?src=tiktok`, `?src=reddit`, `?src=friends`, etc.) so weekly goals above are actually measurable, not guessed.
- A simple spreadsheet or the existing analytics setup to track signups-by-source weekly against the table in Section 2.
- CapCut (free) for repurposing one video across TikTok/Reels/Shorts without re-shooting.

**What to explicitly not do at this stage:** paid ads (budget better spent once you know which organic hook converts), Product Hunt/press (wrong audience fit pre-launch), or institutional/school outreach (already deferred to Phase 2 per the Jul 13 strategy decision).
