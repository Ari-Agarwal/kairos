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

  const { data: match, error: matchError } = await supabase
    .from("school_matches")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (matchError) console.error("school detail match query failed:", matchError);
  if (!match) notFound();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("unweighted_gpa, intended_major, financial_aid_need")
    .eq("user_id", user.id)
    .single();

  if (profileError) console.error("school detail profile query failed:", profileError);
  const stats = await getCollegeStats(match.school_name);
  const cohortStats: CohortStats | null = await getCohortStats(
    match.school_name,
    profile?.unweighted_gpa ?? null,
    profile?.intended_major ?? null,
  );

  return (
    <NavShell>
      <SchoolDetailClient
        match={match}
        stats={stats}
        cohortStats={cohortStats}
        financialAidNeed={profile?.financial_aid_need ?? null}
      />
    </NavShell>
  );
}
