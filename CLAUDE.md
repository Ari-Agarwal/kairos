# Metam Project Instructions

## Build behavior
- Never stop and ask for clarification on design decisions. Use the spec.
- Never stop and ask for clarification on color choices. Use the design system.
- If you hit an error, try to fix it yourself up to 3 times before stopping.
- Do not ask for permission to create files or folders.
- Do not ask for permission to install packages that are in the spec.
- Build screens in the exact order specified: auth first, then onboarding, then match list, then each screen in order.
- After each screen is built, take a Playwright screenshot and save it to a /screenshots folder.

## Design rules
- Dark mode only. Background is #14121F, never use white or light backgrounds.
- Cards are #1F1B2E, never pure white or pure black.
- Primary color is #8B7FE8.
- Gold #D4A24C is reserved for the timeline "you are here" marker only.
- Use serif font (Georgia) for all headlines and screen titles.
- Use system sans-serif for all body text, labels, and buttons.
- Rounded corners 12-16px on all cards and buttons.
- Use 21st.dev Magic MCP for all UI component generation.

## If you get stuck
- On a Supabase error: check the schema in the spec and retry.
- On an Anthropic API error: check that the API key is in .env.local and retry.
- On a TypeScript error: fix the type error and continue, do not skip or use "any".
- On any other error: try 3 times with different approaches, then leave a comment in the code explaining what failed and move to the next screen.
@AGENTS.md
