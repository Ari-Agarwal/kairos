import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import NavShell from "@/components/NavShell";
import ScholarshipsClient from "./ScholarshipsClient";
import { getAllScholarships, isLikelyMatch, getCategory } from "@/lib/scholarships";

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
    intended_major: profile?.intended_major ?? null,
    extracurriculars: (profile?.extracurriculars as string[] | null) ?? null,
  };

  const scholarships = getAllScholarships().map((s) => ({
    ...s,
    likelyMatch: isLikelyMatch(s, scholarshipProfile),
    category: getCategory(s),
  }));

  return (
    <NavShell>
      <ScholarshipsClient scholarships={scholarships} />
    </NavShell>
  );
}
