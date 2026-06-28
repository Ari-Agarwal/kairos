# Telos Project Instructions

## Build behavior
- Never stop and ask for clarification on design decisions. Use the spec.
- Never stop and ask for clarification on color choices. Use the design system.
- If you hit an error, try to fix it yourself up to 3 times before stopping.
- Do not ask for permission to create files or folders.
- Do not ask for permission to install packages that are in the spec.
- Build screens in the exact order specified: auth first, then onboarding, then match list, then each screen in order.
- After each screen is built, take a Playwright screenshot and save it to a /screenshots folder.

## Design rules
- Dark mode only, fully monochrome (black/white/gray). No color accents anywhere, including for category pills, premium tags, or the timeline marker, distinguish those by shade and text label, not hue.
- Background is #0A0A0A (near-black), never pure black or light/white backgrounds.
- Cards are #171717.
- Primary (text, active states, button backgrounds) is #F2F2F2; primary-hover is #D4D4D4.
- Body/heading text is #FAFAFA; secondary/muted text is #A3A3A3.
- Borders are #2A2A2A.
- Former named accents (amber, green, red, premium, secondary) now map to distinct gray tints/shades on the same monochrome ramp, defined in src/app/globals.css, rather than hues. Keep using those same CSS variable names when styling so the mapping stays centralized.
- Buttons with a light (bg-primary/bg-premium) background use dark text (text-bg), never text-white, or the label becomes unreadable against the light background.
- Use serif font (Georgia) for all headlines and screen titles.
- Use system sans-serif for all body text, labels, and buttons.
- Rounded corners 12-16px on all cards and buttons.
- When integrating a 21st.dev/shadcn component, adapt its classes to these tokens (e.g. bg-background to bg-bg, text-muted-foreground to text-text-gray) rather than using shadcn's default theme variables, and drop any fabricated content (fake customer logos, third-party product screenshots) rather than keep it as placeholder.

## If you get stuck
- On a Supabase error: check the schema in the spec and retry.
- On an Anthropic API error: check that the API key is in .env.local and retry.
- On a TypeScript error: fix the type error and continue, do not skip or use "any".
- On any other error: try 3 times with different approaches, then leave a comment in the code explaining what failed and move to the next screen.
@AGENTS.md
