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

**Status (Jul 17): light palette confirmed, superseding the original dark-background rule.** The monochrome rule was retired Jul 14; the base itself moved from dark to a warm-light background on Jul 16 (cream + cool charcoal), then retuned again Jul 17 to parchment + forest green based on focus-group feedback that a light background reads as more inviting. The line below is kept only as history — do not treat it as current.

- ~~Keep the dark background — this is not a light/cream Kollegio-style theme swap.~~ **Superseded (Jul 17).** Base surfaces are now light: page `#F8F6EC` (parchment), card `#FDFCF7`.
- **Bring in real color, not a single accent hue.** Kollegio's approach is the reference: a light/neutral base carries multiple distinct colors used deliberately — not a single "theme accent" reused everywhere, and not a monochrome gray ramp either. Concretely: different feature areas / categories (match tiers, premium, timeline states, odds pills) each get their own genuine hue, not a shared gray-shade-only distinction. Pick a real small palette (roughly 4-6 named colors) and assign each one a specific meaning, the same way the old monochrome ramp assigned meaning by shade — just with actual hue now available as a tool.
- **Every onboarding screen gets imagery.** Each step in the (now multi-screen, per-feature) onboarding flow should include a real illustration or photo relevant to that step's topic, not just text and form fields — this is a deliberate design requirement, not optional polish. No stock-photo-in-a-vacuum look; imagery should feel considered and specific to what that screen is asking for (e.g. the academics step gets something academic, the extracurriculars step gets something activity-related).
- Buttons with a light-filled background use dark text, never white-on-light, or the label becomes unreadable.
- **Buttons register hover explicitly** (Jul 17, from focus-group feedback that the site read as generic/AI-chat-like): every button gets a visible hover state — brightness/color shift, a soft glow ring in the accent tint, and a slight scale-up (~1.03), ~150ms, always gated behind `motion-reduce:` so reduced-motion users keep the color feedback without the scale. Implemented once in `buttonVariants` (`src/components/ui/button.tsx`) — inherit it, don't reimplement per screen.
- Serif for headlines/screen titles, system sans-serif for body/labels/buttons — keep this pairing unless the redesign's chosen typefaces replace it deliberately.
- Rounded corners 12–16px on cards and buttons — keep unless the redesign deliberately changes this.
- When integrating a 21st.dev/shadcn component, adapt its classes to this project's tokens rather than using shadcn's default theme variables, and drop any fabricated content (fake customer logos, third-party product screenshots) rather than keep it as placeholder.
- **Palette (Jul 17):** one brand accent used everywhere the brand shows up, one reserved color spent on a single job (urgency), one more reserved for premium — not a hue per category. Tier distinction (reach/target/safety) still reads primarily by shade/label, the way the old monochrome ramp worked; color is layered on top, not a replacement for that system.
  - `--primary` / `--amber` `#3C5E3B` — brand accent (deep forest green): CTAs, active states, progress, links, target-tier label.
  - `--red` `#DC4C3F` — reserved: reach-tier, errors, overdue, needs-attention. Nothing else uses this hue.
  - `--premium` `#8B5CF6` — reserved: premium tier only.
  - `--green` `#6B9080` — safety-tier / on-track / completed. Deliberately a different, more muted shade from `--primary`'s forest green so the brand accent and the safety-tier signal stay visually distinct despite both being "green."
  - `--secondary` `#78716A` — neutral info / no-activity, dimmest of the five.
  - Backgrounds: `--bg #F8F6EC` (parchment), `--card #FDFCF7`.
  - Full rationale: student focus-group synthesis, Jul 17 (see `Software_Timeline.md`) — light background tested as more inviting than dark; adjust shades freely, but keep the "one brand color + two reserved single-purpose colors, tiers by shade not hue" structure unless explicitly revisited.

## If you get stuck
- On a Supabase error: check the schema in the spec and retry.
- On an Anthropic API error: check that the API key is in .env.local and retry.
- On a TypeScript error: fix the type error and continue, do not skip or use "any".
- On any other error: try 3 times with different approaches, then leave a comment in the code explaining what failed and move to the next screen.
@AGENTS.md
