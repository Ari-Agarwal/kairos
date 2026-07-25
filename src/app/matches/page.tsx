// SCREEN 3 COMPLETE
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import NavShell from "@/components/NavShell";
import MatchListClient from "./MatchListClient";
import { getCollegeLogo } from "@/lib/college-scorecard";

function weekStart(): string {
  const d = new Date();
  const day = d.getUTCDay();
  const diff = (day + 6) % 7;
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

export default async function MatchesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile, error: profileError } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
  if (profileError) console.error("matches profile query failed:", profileError);
  if (!profile) redirect("/onboarding");

  const { data: matchRows, error: matchRowsError } = await supabase
    .from("school_matches")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("percentage", { ascending: false });

  if (matchRowsError) console.error("matches school_matches query failed:", matchRowsError);

  const CATEGORY_ORDER: Record<string, number> = { reach: 0, target: 1, safety: 2 };
  const matches = matchRows
    ? [...matchRows].sort((a, b) => CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category])
    : matchRows;

  const { data: regenRow, error: regenRowError } = await supabase
    .from("regeneration_log")
    .select("count")
    .eq("user_id", user.id)
    .eq("week_start_date", weekStart())
    .maybeSingle();

  if (regenRowError) console.error("matches regeneration_log query failed:", regenRowError);

  const isPremium = profile.subscription_tier === "premium";
  const remaining = isPremium ? null : Math.max(0, 3 - (regenRow?.count ?? 0));

  // Match-list cards show the school's logo, not a photo (Software_Timeline.md
  // QA item: the previous photo slot never loaded -- the page's CSP silently
  // blocked the external Wikipedia image host, and a logo reads better at
  // card size anyway). School Detail's dedicated Photos tab still uses the
  // Wikipedia photo lookup.
  const logoEntries = await Promise.all(
    (matches ?? []).map(async (m) => [m.id, await getCollegeLogo(m.school_name)] as const)
  );
  const logos = Object.fromEntries(logoEntries);

  const studentName = (user.user_metadata?.full_name as string | undefined) || null;

  return (
    <NavShell>
      <MatchListClient
        initialMatches={matches ?? []}
        remaining={remaining}
        isPremium={isPremium}
        logos={logos}
        studentName={studentName}
      />
    </NavShell>
  );
}
