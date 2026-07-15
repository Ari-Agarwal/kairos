// SCREEN 5 COMPLETE
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import NavShell from "@/components/NavShell";
import SchoolDetailClient from "./SchoolDetailClient";
import { getCollegeStats } from "@/lib/college-scorecard";

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

  const { data: profile } = await supabase.from("profiles").select("subscription_tier").eq("user_id", user.id).single();
  const isPremium = profile?.subscription_tier === "premium";
  const stats = await getCollegeStats(match.school_name);

  return (
    <NavShell>
      <SchoolDetailClient match={match} isPremium={isPremium} stats={stats} />
    </NavShell>
  );
}
