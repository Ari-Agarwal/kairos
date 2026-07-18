import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import NavShell from "@/components/NavShell";
import ScholarshipsClient from "./ScholarshipsClient";
import { getAllScholarships, isLikelyMatch, getMatchReason, getCategory } from "@/lib/scholarships";

export const metadata = { title: "Scholarships — Kairos" };

export default async function ScholarshipsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("first_gen, financial_aid_need, intended_major, extracurriculars")
    .eq("user_id", user.id)
    .single();

  if (profileError) console.error("scholarships profile query failed:", profileError);

  const scholarshipProfile = {
    first_gen: profile?.first_gen ?? null,
    financial_aid_need: profile?.financial_aid_need ?? null,
    intended_major: (profile?.intended_major as string[] | null) ?? null,
    extracurriculars: (profile?.extracurriculars as string[] | null) ?? null,
  };

  const { data: trackerRows, error: trackerError } = await supabase
    .from("scholarship_tracker")
    .select("scholarship_name, status")
    .eq("user_id", user.id);

  if (trackerError) console.error("scholarships tracker query failed:", trackerError);

  const trackerByName = new Map((trackerRows ?? []).map((r) => [r.scholarship_name, r.status]));

  const scholarships = getAllScholarships().map((s) => ({
    ...s,
    likelyMatch: isLikelyMatch(s, scholarshipProfile),
    matchReason: getMatchReason(s, scholarshipProfile),
    category: getCategory(s),
    trackerStatus: (trackerByName.get(s.name) as "saved" | "applied" | undefined) ?? null,
  }));

  return (
    <NavShell>
      <ScholarshipsClient scholarships={scholarships} />
    </NavShell>
  );
}
