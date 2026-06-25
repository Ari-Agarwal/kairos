# Product

## Register

product

Landing page (`/`) is treated as a brand surface within this otherwise product-register app — see Design Principles below for how the two diverge.

## Users

High school students (and to a lesser extent their parents) navigating college admissions: building a profile, getting AI-matched school lists, generating application timelines, and getting essay feedback. They are anxious about getting into the "right" school, often comparing Metam mentally against expensive human private counselors. Sessions happen in short, task-focused bursts (check matches, check a deadline, get feedback on a draft) rather than long browsing sessions.

## Product Purpose

Metam replaces the function of an expensive private college counselor with AI: a matched school list grounded in real acceptance-rate data, a generated application timeline, and essay feedback — at a fraction of private-counselor cost. Success looks like a student trusting the match percentages and the timeline enough to act on them as their primary planning tool.

## Brand Personality

Sharp & modern — crisp, technical, high-craft, like Linear or Vercel: dense information presented with precision and confidence, not warmth-by-decoration. No hand-holding tone, no soft/bubbly edtech feel.

## Anti-references

- Generic SaaS template: gradient-hero, identical card grids, tiny uppercase tracked eyebrows above every section, numbered 01/02/03 section scaffolding.
- Childish / bubbly edtech-for-kids aesthetics — illustration-heavy, colorful, soft rounded mascots.
- Gradient text, glassmorphism-as-default, side-stripe card borders.

## Design Principles

1. **Authority through restraint, not decoration.** The monochrome palette is a deliberate choice signaling seriousness, not a limitation to work around with gradients or accent colors.
2. **Numbers earn trust.** Match percentages, deadlines, and statistics are the product's core credibility device — typography and layout should make them legible and prominent, never an afterthought.
3. **Landing page sells with a bold, technical visual centerpiece** (3D, motion-driven hero in the Tailark Hero Section 5 style) while the app itself stays information-dense and quiet — the brand/product registers diverge intentionally between `/` and everything behind auth.
4. **Density without clutter.** Dashboard and tool screens (matches, timeline, essay feedback) serve a working session — prioritize scanability and clear hierarchy over visual flourish.
5. **Motion is purposeful, not decorative.** Used to clarify state changes (sidebar collapse, modal entry, list reveal) and to make the landing hero feel premium — never uniform "fade up" applied reflexively to every section.

## Accessibility & Inclusion

WCAG AA contrast minimums apply throughout (body text ≥4.5:1, large/bold text ≥3:1) even within the monochrome palette — verify shade choices meet this rather than defaulting to a muted gray that "looks elegant" but under-contrasts. Respect `prefers-reduced-motion` for all new animation work (hero, sidebar, reveals).
