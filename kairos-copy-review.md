# Kairos Copy Review — Onboarding & Essay Feedback

## 1. Voice violations found

- **`onboarding/page.tsx:201`** — `"Tell us about yourself"` — generic, soft-onboarding tone; not precise or confident.
- **`onboarding/page.tsx:211-213`** — `"This builds your profile, which we'll use to generate your personalized school list and timeline next."` — wordy, passive, hand-holdy ("we'll use to generate").
- **`onboarding/page.tsx:82`** — `"Building your personalized list..."` — "personalized" reads like consumer-app marketing, not a status line.
- **`onboarding/page.tsx:83`** — `"This takes a moment, we're matching you against real schools."` — comma-splice, conversational filler ("This takes a moment") undercuts authority.
- **`EssayFeedbackClient.tsx:46`** — `"Paste your essay draft here..."` — fine functionally but trailing ellipsis softens it.
- **`EssayFeedbackClient.tsx:54`** — `"Reading your draft..."` — cute/anthropomorphized loading state; inconsistent with a dense-data product voice.
- **`EssayFeedbackClient.tsx:31`** — `"Failed to get feedback. Please try again."` — "Please" is the one hand-holding tic; otherwise fine.
- **`LockedCard.tsx`** — no copy in the component itself (pure wrapper around `children`); flag that the actual paywall message lives in the parent and wasn't available to review — same standard below applies to it.

## 2. Rewritten onboarding microcopy

| Element | Current | Rewrite |
|---|---|---|
| H1 | Tell us about yourself | **Your profile** |
| Intro card | This builds your profile, which we'll use to generate your personalized school list and timeline next. | **Used to generate your match list and application timeline. Takes under two minutes.** |
| Section: Basics | Basics | **Profile** |
| Section: Background | Background | **Academics** |
| Section: Goals | Goals | **Target** |
| Full Name | Full Name * | **Name** |
| Grade Level | Grade Level * | **Grade** |
| GPA | GPA * | **GPA** |
| Intended Major | Intended Major / Interests | **Intended major** |
| Extracurriculars | Extracurriculars (comma separated) | **Extracurriculars** *(helper, small: comma-separated)* |
| Location Preference | Location Preference | **Location preference** |
| College Goals | College Goals | **What you're optimizing for** *(placeholder: "Reach school, scholarship, specific program...")* |
| Submit button | Continue | **Generate matches** |
| Loading title | Building your personalized list... | **Matching against acceptance data** |
| Loading subtext | This takes a moment, we're matching you against real schools. | **Cross-referencing your profile against real admissions outcomes.** |

## 3. Rewritten essay-feedback copy

- Textarea placeholder: `Paste your essay draft here...` → **`Paste your draft`**
- Submit button: `Get Feedback` → **`Analyze`**
- Loading state: `Reading your draft...` → **`Analyzing`**
- Error fallback: `Failed to get feedback. Please try again.` → **`Feedback failed. Retry.`**

### Locked/paywall state (for whatever renders inside `LockedCard`)
Treat this as a feature gate, not an apology:

- Headline: **"Full essay analysis is a Pro feature."**
- Body: **"Line-level feedback on structure, voice, and specificity — the same detail a paid counselor charges $200/hour for."**
- CTA: **"Upgrade to Pro"** (not "Unlock now" / "Get access")

No "you're missing out," no exclamation points, no soft framing — state the gate and the value, once.
