// Grants admin access (profiles.is_admin = true) to an account by email, so
// they can reach /admin/waitlist, /admin/reports, and /admin/ai-usage.
// Replaces the old shared-secret-in-URL gate on those routes.
//
// Usage: node --env-file=.env.local scripts/grant-admin.mjs someone@example.com

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(1);
}

const email = process.argv[2];
if (!email) {
  console.error("Usage: node --env-file=.env.local scripts/grant-admin.mjs <email>");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUserByEmail(targetEmail) {
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = data.users.find((u) => u.email === targetEmail);
    if (match) return match;
    if (data.users.length < 200) return null;
    page++;
  }
}

async function main() {
  const user = await findUserByEmail(email);
  if (!user) {
    console.error(`No user found with email ${email}.`);
    process.exit(1);
  }

  const { error } = await supabase
    .from("profiles")
    .update({ is_admin: true })
    .eq("user_id", user.id);
  if (error) throw error;

  console.log(`Granted admin access to ${email} (user_id: ${user.id}).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
