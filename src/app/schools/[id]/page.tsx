// SCREEN 5 COMPLETE
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import NavShell from "@/components/NavShell";
import SchoolDetailClient from "./SchoolDetailClient";
import { getCollegeStats } from "@/lib/college-scorecard";
import { getCohortStats } from "@/lib/cohort";
import type { CohortStats } from "@/lib/cohort-types";

export default async function SchoolDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: match } = await supabase
    .from("school_matches")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!match) notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier, unweighted_gpa, intended_major")
    .eq("user_id", user.id)
    .single();
  const isPremium = profile?.subscription_tier === "premium";
  const stats = await getCollegeStats(match.school_name);
  const cohortStats: CohortStats | null = await getCohortStats(
    match.school_name,
    profile?.unweighted_gpa ?? null,
    profile?.intended_major ?? null,
  );

  return (
    <NavShell>
      <SchoolDetailClient match={match} isPremium={isPremium} stats={stats} cohortStats={cohortStats} />
    </NavShell>
  );
}
