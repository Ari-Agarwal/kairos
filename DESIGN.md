---
name: Kairos
description: AI college-admissions counselor — monochrome, high-craft, data-driven
colors:
  bg: "#000000"
  card: "#000000"
  primary: "#FFFFFF"
  primary-hover: "#D9D9D9"
  text: "#FFFFFF"
  border: "#FFFFFF26"
typography:
  display:
    fontFamily: "Georgia, 'Times New Roman', serif"
    fontSize: "clamp(2.5rem, 6vw, 5rem)"
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Georgia, 'Times New Roman', serif"
    fontSize: "clamp(1.5rem, 3vw, 2.25rem)"
    fontWeight: 400
    lineHeight: 1.15
  body:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    letterSpacing: "0.02em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.bg}"
    rounded: "{rounded.md}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  card-default:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.lg}"
---

# Design System: Kairos

## 1. Overview

**Creative North Star: "The Confidential Briefing"**

Kairos reads like a confidential strategic briefing, not a SaaS sales page: pure black and white, no hue anywhere, hierarchy built entirely from size, weight, and shade rather than color. The system rejects the cream/sand AI-default neutral and the generic gradient-hero SaaS template explicitly — there is no warmth-by-decoration here, only precision. Numbers (match percentages, deadlines, statistics) are the trust device; typography exists to make them legible above all else.

The app register (dashboard, matches, timeline, essay feedback) stays dense and quiet — a working tool a student returns to in short sessions. The landing page (`/`) is the one surface permitted a bold visual centerpiece: a technical, motion-driven 3D hero in the spirit of Tailark's Hero Section 5, still rendered entirely in monochrome.

**Key Characteristics:**
- Pure black (#000000) background, pure white (#FFFFFF) ink — no grey hex values anywhere in the system
- Distinction by shade/opacity and text label, never by hue (category pills, premium tags, timeline markers)
- Georgia serif for all headlines, system sans for everything else
- 12–16px rounded corners on all cards and buttons
- Flat by default — no shadows; depth comes from border + opacity layering only

## 2. Colors

A pure two-value palette: every visual role is white at full or partial opacity over a black canvas. There is no secondary or tertiary hue — only one ink, modulated by alpha.

### Primary
- **Paper White** (#FFFFFF): all body/heading text, active states, primary button backgrounds, the single ink of the system.

### Neutral
- **True Black** (#000000): page background and card background — cards do not lift off the page via a lighter fill, only via border.
- **Hover White** (rgba(255,255,255,0.85) / ~#D9D9D9): primary button hover/active state, the only intentional "shade shift" in the system.
- **Border Hairline** (rgba(255,255,255,0.15)): all card/input borders and dividers.

### Named Rules
**The Single Ink Rule.** Every "accent" — category pills (reach/target/safety), premium tags, the timeline marker — is white at a distinct opacity step (8% / 10% / 14% / 20%) plus a text label. Never introduce a second hue to distinguish meaning; opacity and the word itself carry the distinction.

**No-Grey-Default Rule.** Muted/secondary text uses full-opacity white (#FFFFFF), not an opacity-reduced white that reads as grey. If a contrast pass requires a quieter tone, reduce size/weight, not opacity, to avoid drifting into the generic muted-grey AI tell.

## 3. Typography

**Display Font:** Georgia, "Times New Roman", serif
**Body Font:** system-ui (the OS-native sans stack)
**Character:** A deliberate contrast pair — serif for anything that announces ("a briefing headline"), system sans for anything functional (data, labels, buttons, body copy). The pairing should never blur into "two similar sans-serifs."

### Hierarchy
- **Display** (400, clamp(2.5rem, 6vw, 5rem), 1.05 line-height, -0.02em tracking): landing hero headline and major screen titles only.
- **Headline** (400, clamp(1.5rem, 3vw, 2.25rem), 1.15): section/card group headers, serif.
- **Title** (500, 1.125rem): card titles, modal headers, sans.
- **Body** (400, 1rem, 1.6 line-height, capped 65–75ch): paragraph copy, descriptions, AI-generated feedback text.
- **Label** (500, 0.8125rem, 0.02em tracking): pills, buttons, nav items, form labels — sans, never serif.

### Named Rules
**The Serif-Announces Rule.** Georgia appears only on headings/titles that introduce a screen or section. The moment text becomes functional (a button, a stat, a label), it switches to system sans — mixing the two within one text element is forbidden.

## 4. Elevation

Flat by default. Kairos has no shadow vocabulary — depth and grouping are conveyed entirely through the 15%-opacity hairline border and, occasionally, a denser fill step (the same white-on-black opacity ramp used for accents). Nothing lifts off the page; everything sits flush.

### Named Rules
**The Flat-By-Default Rule.** Box-shadow is prohibited everywhere except a single soft ambient glow permitted on the landing-page 3D hero element, where it is structural to the centerpiece rather than decorative card chrome.

## 5. Components

### Buttons
- **Shape:** 12px radius
- **Primary:** white background (#FFFFFF), black text (`text-bg`, never `text-white` — unreadable on a light fill), 12px/24px padding
- **Hover/Focus:** background steps to Hover White (~#D9D9D9); focus-visible gets a 2px white outline offset 2px (no glow/shadow)
- **Secondary/Ghost:** transparent background, white border-hairline, white text; hover fills to ~8% white tint

### Pills (category / premium tags)
- **Style:** rounded-full, background = the relevant opacity-tint token (8–20% white), text = full white, no border
- **State:** distinguished only by opacity step + label text ("Reach", "Target", "Safety", "Premium") — never by hue

### Cards / Containers
- **Corner Style:** 16px radius
- **Background:** #000000 (identical to page bg — cards are demarcated by border, not fill)
- **Shadow Strategy:** none (see Elevation)
- **Border:** 1px solid rgba(255,255,255,0.15)
- **Internal Padding:** 24px

### Inputs / Fields
- **Style:** transparent background, 1px border-hairline, 12px radius
- **Focus:** border opacity steps to full white, no glow
- **Error:** border steps to a denser white-tint (per Single Ink Rule) plus inline error label text — never a red hue

### Navigation
- Collapsible left sidebar (desktop): icon+label items, active state = full white text + 8% white tint background, inactive = white text at full opacity but reduced size; collapse toggle is icon-only inline with the username row. Mobile: header + bottom tab bar, same active/inactive logic.

### Landing Hero (signature component)
A full-bleed 3D, motion-driven centerpiece (Tailark Hero Section 5 lineage) rendered in monochrome only — geometry/material grayscale or white-line wireframe, ambient glow permitted here only, parallax/scroll-driven motion with a `prefers-reduced-motion` static fallback.

## 6. Do's and Don'ts

### Do:
- **Do** use #FFFFFF and #000000 as the only two hex values anywhere in the codebase; every other color is one of those two at a defined opacity step.
- **Do** distinguish category pills, premium tags, and the timeline marker by shade/opacity + label text only.
- **Do** use `text-bg` (not `text-white`) on any element with a light/white background fill.
- **Do** use Georgia for headlines/titles and system sans for body/labels/buttons.
- **Do** give the landing-page 3D hero a `prefers-reduced-motion` static fallback.

### Don't:
- **Don't** introduce any hue, including tinted "warm" or "cool" neutrals — this is a strict two-value (black/white) system.
- **Don't** use gradient text, glassmorphism-as-default, or side-stripe colored borders.
- **Don't** ship a generic SaaS gradient-hero, identical card grids, or tiny uppercase tracked eyebrows above every section on the landing page.
- **Don't** use bubbly/colorful/illustration-heavy edtech styling anywhere.
- **Don't** apply box-shadow outside the single landing-hero exception.
- **Don't** reduce opacity on body text to fake a "muted grey" — adjust size/weight instead.
