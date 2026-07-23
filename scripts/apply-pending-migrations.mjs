// Applies any supabase/migration_*.sql file not yet recorded as applied,
// in numeric order. Closes the Software_Timeline.md Section 13 gap: every
// migration in this project has so far needed a remembered manual step
// (via the Supabase SQL editor or the supabase MCP server) -- a step that's
// easy to forget, and has already caused real incidents (Section 6a's
// "shipped code before the migration was applied" outage).
//
// Usage: node scripts/apply-pending-migrations.mjs
// Requires DATABASE_URL (a direct Postgres connection string -- Supabase
// project settings -> Database -> Connection string -> URI, "Session
// pooler" or direct connection, not the pgbouncer transaction-mode pooler
// since this runs multi-statement DDL). Exits 0 with a warning (does not
// fail the build) if DATABASE_URL isn't set, since not every environment
// needs to run this.
//
// Tracks applied files in a `_kairos_migrations_applied` table (filename
// primary key, applied_at), created on first run if missing. Each file
// runs inside its own transaction so a failure doesn't leave a
// half-applied migration recorded as done.

import { readdirSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, "..", "supabase");

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.warn(
      "DATABASE_URL not set -- skipping migration-apply step. " +
      "Set it (Supabase project settings -> Database -> Connection string) to enable automatic migration application."
    );
    return;
  }

  const files = readdirSync(migrationsDir)
    .filter((f) => /^migration_\d+.*\.sql$/.test(f))
    .sort((a, b) => {
      const numA = parseInt(a.match(/^migration_(\d+)/)[1], 10);
      const numB = parseInt(b.match(/^migration_(\d+)/)[1], 10);
      return numA - numB || a.localeCompare(b);
    });

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query(`
      create table if not exists _kairos_migrations_applied (
        filename text primary key,
        applied_at timestamptz not null default now()
      );
    `);

    const { rows } = await client.query("select filename from _kairos_migrations_applied");
    const alreadyApplied = new Set(rows.map((r) => r.filename));

    const pending = files.filter((f) => !alreadyApplied.has(f));
    if (pending.length === 0) {
      console.log("No pending migrations -- already up to date.");
      return;
    }

    console.log(`Applying ${pending.length} pending migration(s): ${pending.join(", ")}`);

    for (const file of pending) {
      const sql = readFileSync(join(migrationsDir, file), "utf8");
      console.log(`  -> ${file}`);
      try {
        await client.query("begin");
        await client.query(sql);
        await client.query(
          "insert into _kairos_migrations_applied (filename) values ($1)",
          [file]
        );
        await client.query("commit");
      } catch (err) {
        await client.query("rollback");
        console.error(`Migration ${file} failed -- stopping. Later migrations were not attempted.`);
        throw err;
      }
    }

    console.log("All pending migrations applied.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
