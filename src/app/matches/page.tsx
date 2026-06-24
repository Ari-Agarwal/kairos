// SCREEN 3 COMPLETE
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import NavShell from "@/components/NavShell";
import ProfileCompletenessModal from "@/components/ProfileCompletenessModal";
import MatchListClient from "./MatchListClient";

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

  const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
  if (!profile) redirect("/onboarding");

  const { data: matches } = await supabase
    .from("school_matches")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("category", { ascending: false })
    .order("percentage", { ascending: false });

  const { data: regenRow } = await supabase
    .from("regeneration_log")
    .select("count")
    .eq("user_id", user.id)
    .eq("week_start_date", weekStart())
    .maybeSingle();

  const isPremium = profile.subscription_tier === "premium";
  const remaining = isPremium ? null : Math.max(0, 3 - (regenRow?.count ?? 0));

  return (
    <NavShell>
      <ProfileCompletenessModal profile={profile} />
      <MatchListClient initialMatches={matches ?? []} remaining={remaining} isPremium={isPremium} />
    </NavShell>
  );
}
