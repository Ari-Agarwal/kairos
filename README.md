# Kairos

A hub for students applying to college.

Kairos brings everything a student needs for the college application process into one place: a personalized school match list, a full application timeline, and an AI mentor for admissions questions. Counselors get a dashboard to manage their full caseload in one place.

Built and shipped solo by [Ari Agarwal](https://github.com/Ari-Agarwal), a high school sophomore, using Claude Code as the primary AI coding tool.

## Product

- **Student match list**: reach/target/safety school recommendations generated from GPA, coursework, extracurriculars, and preferences, with visible reasoning behind each recommendation.
- **Application timeline**: every deadline and requirement across every school a student is applying to, in one place.
- **AI mentor chat**: admissions questions answered directly, positioned as coaching, not essay drafting.
- **Counselor dashboard**: a filterable, sortable roster view so a counselor can track an entire caseload of students at once.

## Tech stack

- [Next.js](https://nextjs.org) 16 / [React](https://react.dev) 19 / TypeScript
- [Supabase](https://supabase.com) for auth and the database
- [Anthropic Claude API](https://www.anthropic.com) for AI-generated match reasoning and the mentor chat
- [Resend](https://resend.com) for transactional email
- Deployed on [Vercel](https://vercel.com)

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Requires a `.env.local` with Supabase and Anthropic API credentials (not included in this repo).
