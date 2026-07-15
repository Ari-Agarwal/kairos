# Kairos Project Instructions

## Build behavior
- Never stop and ask for clarification on design decisions. Use the spec.
- Never stop and ask for clarification on color choices. Use the design system.
- If you hit an error, try to fix it yourself up to 3 times before stopping.
- Do not ask for permission to create files or folders.
- Do not ask for permission to install packages that are in the spec.
- Build screens in the exact order specified: auth first, then onboarding, then match list, then each screen in order.
- After each screen is built, take a Playwright screenshot and save it to a /screenshots folder.

## Design rules

**Status (Jul 14): monochrome rule retired.** Redesign in progress on localhost only — see `Software_Timeline.md` Phase 3. Nothing below ships to the production URL until Phase 3 is explicitly signed off.

- **Keep the dark background** — this is not a light/cream Kollegio-style theme swap. Base surfaces stay dark (`#0A0A0A` page / `#171717` card, or close to it — free to retune exact values during the redesign, just stay in the near-black family for backgrounds).
- **Bring in real color, not a single accent hue.** Kollegio's approach is the reference: a dark/neutral base carries multiple distinct colors used deliberately — not a single "theme accent" reused everywhere, and not a monochrome gray ramp either. Concretely: different feature areas / categories (match tiers, premium, timeline states, odds pills) each get their own genuine hue, not a shared gray-shade-only distinction. Pick a real small palette (roughly 4-6 named colors) and assign each one a specific meaning, the same way the old monochrome ramp assigned meaning by shade — just with actual hue now available as a tool.
- **Every onboarding screen gets imagery.** Each step in the (now multi-screen, per-feature) onboarding flow should include a real illustration or photo relevant to that step's topic, not just text and form fields — this is a deliberate design requirement, not optional polish. No stock-photo-in-a-vacuum look; imagery should feel considered and specific to what that screen is asking for (e.g. the academics step gets something academic, the extracurriculars step gets something activity-related).
- Buttons with a light-filled background use dark text, never white-on-light, or the label becomes unreadable.
- Serif for headlines/screen titles, system sans-serif for body/labels/buttons — keep this pairing unless the redesign's chosen typefaces replace it deliberately.
- Rounded corners 12–16px on cards and buttons — keep unless the redesign deliberately changes this.
- When integrating a 21st.dev/shadcn component, adapt its classes to this project's tokens rather than using shadcn's default theme variables, and drop any fabricated content (fake customer logos, third-party product screenshots) rather than keep it as placeholder.
- **Palette locked (Jul 14):** one brand accent used everywhere the brand shows up, one reserved color spent on a single job (urgency), one more reserved for premium — not a hue per category. Tier distinction (reach/target/safety) still reads primarily by shade/label, the way the old monochrome ramp worked; color is layered on top, not a replacement for that system.
  - `--primary` / `--amber` `#FFB020` — brand accent: CTAs, active states, progress, links, target-tier label.
  - `--red` `#FF5C4D` — reserved: reach-tier, errors, overdue, needs-attention. Nothing else uses this hue.
  - `--premium` `#B18AFF` — reserved: premium tier only.
  - `--green` `#9C9789` — safety-tier / on-track / completed. Stays a muted neutral on purpose, not a fourth hue.
  - `--secondary` `#8a8a8a` — neutral info / no-activity, dimmest of the five.
  - Backgrounds unchanged: `--bg #0A0A0A`, `--card #171717`.
  - Full rationale and the palette this replaced: see the redesign discussion in this session; adjust shades freely, but keep the "one brand color + two reserved single-purpose colors, tiers by shade not hue" structure unless explicitly revisited.

## If you get stuck
- On a Supabase error: check the schema in the spec and retry.
- On an Anthropic API error: check that the API key is in .env.local and retry.
- On a TypeScript error: fix the type error and continue, do not skip or use "any".
- On any other error: try 3 times with different approaches, then leave a comment in the code explaining what failed and move to the next screen.
@AGENTS.md
