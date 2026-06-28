export const meta = {
  name: 'dev-pipeline',
  description: 'Flat multi-agent dev pipeline: research -> implement -> (design/db review) -> test (loop x3) -> commit',
  phases: [
    { title: 'Research' },
    { title: 'Implement' },
    { title: 'Review' },
    { title: 'Test' },
    { title: 'Commit' },
  ],
}

const RESEARCH_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: 'Short summary of relevant conventions/architecture' },
    relevantFiles: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'relevantFiles'],
}

const DEV_SCHEMA = {
  type: 'object',
  properties: {
    filesChanged: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
    assumptions: { type: 'array', items: { type: 'string' } },
  },
  required: ['filesChanged', 'summary'],
}

const REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    pass: { type: 'boolean' },
    issues: { type: 'array', items: { type: 'string' } },
  },
  required: ['pass', 'issues'],
}

const TEST_SCHEMA = {
  type: 'object',
  properties: {
    pass: { type: 'boolean' },
    errorOutput: { type: 'string' },
  },
  required: ['pass', 'errorOutput'],
}

const PR_SCHEMA = {
  type: 'object',
  properties: {
    committed: { type: 'boolean' },
    commitMessage: { type: 'string' },
    notes: { type: 'string' },
  },
  required: ['committed', 'commitMessage'],
}

phase('Research')
const research = await agent(
  `Task: ${args.task}\n\nLook at the existing code conventions and architecture relevant to this task in this repo. Do NOT write any code. Report back a short summary (not a full transcript) of what the developer needs to know, plus a list of the most relevant existing files.`,
  { label: 'researcher', schema: RESEARCH_SCHEMA }
)
log(`Research done: ${research.summary.slice(0, 120)}...`)

phase('Implement')
let dev = await agent(
  `Task: ${args.task}\n\nRelevant conventions/architecture (from researcher):\n${research.summary}\nRelevant files: ${research.relevantFiles.join(', ')}\n\nImplement the change. Do not touch files unrelated to this task. If you hit an ambiguous design/color/permission decision, resolve it using the project's existing spec/design system and note the assumption — do not stop to ask. Return the files you changed and a short summary.`,
  { label: 'developer', schema: DEV_SCHEMA }
)
log(`Developer changed: ${dev.filesChanged.join(', ')}`)

phase('Review')
const reviewers = []
if (args.touchesUI) {
  reviewers.push(() => agent(
    `Review these changed files against the project's design system/tokens (see CLAUDE.md design rules): ${dev.filesChanged.join(', ')}. Summary of change: ${dev.summary}. Report pass/fail and concrete issues (e.g. wrong color token, wrong font). Do not edit anything.`,
    { label: 'design-reviewer', schema: REVIEW_SCHEMA }
  ))
}
if (args.touchesDB) {
  reviewers.push(() => agent(
    `Review these changed files for schema/migration correctness: ${dev.filesChanged.join(', ')}. Summary of change: ${dev.summary}. Check against supabase/schema.sql conventions. Report pass/fail and concrete issues. Do not edit anything unless explicitly asked.`,
    { label: 'db-reviewer', schema: REVIEW_SCHEMA }
  ))
}
const reviews = reviewers.length ? (await parallel(reviewers)).filter(Boolean) : []
const reviewIssues = reviews.flatMap(r => r.issues || [])
if (reviewIssues.length) {
  log(`Review flagged ${reviewIssues.length} issue(s), folding into next implement pass`)
  dev = await agent(
    `Address these review issues in the change you just made (files: ${dev.filesChanged.join(', ')}):\n${reviewIssues.join('\n')}`,
    { label: 'developer-fixup', schema: DEV_SCHEMA }
  )
}

phase('Test')
let testResult = null
for (let round = 1; round <= 3; round++) {
  testResult = await agent(
    `Run the actual build and test commands for this project (e.g. npm run build && npm test). Do not just read the diff. Report pass/fail and, on failure, the exact error output.`,
    { label: `tester-round${round}`, model: 'haiku', schema: TEST_SCHEMA }
  )
  if (testResult.pass) {
    log(`Tests passed on round ${round}`)
    break
  }
  log(`Round ${round} failed: ${testResult.errorOutput.slice(0, 200)}`)
  if (round === 3) break
  dev = await agent(
    `The previous change failed tests/build. Fix it.\nFiles changed: ${dev.filesChanged.join(', ')}\nError output:\n${testResult.errorOutput}`,
    { label: `developer-fix-round${round}`, schema: DEV_SCHEMA }
  )
}

if (!testResult || !testResult.pass) {
  log('Stopping: tests still failing after 3 rounds. Surfacing diff + failure reason instead of retrying or committing.')
  return { status: 'failed', filesChanged: dev.filesChanged, lastError: testResult ? testResult.errorOutput : 'no test result' }
}

phase('Commit')
const pr = await agent(
  `Stage and commit the changed files (${dev.filesChanged.join(', ')}) with a concise commit message describing why, following this repo's commit style. Do NOT push or open a PR — ask first if that seems warranted. Report whether you committed and the message used.`,
  { label: 'pr-agent', model: 'haiku', schema: PR_SCHEMA }
)

return { status: 'passed', filesChanged: dev.filesChanged, summary: dev.summary, commit: pr }
