import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import NavShell from "@/components/NavShell";
import ScholarshipsClient from "./ScholarshipsClient";
import { getAllScholarships, isLikelyMatch, getMatchReason, getCategory, getFitTier, getScholarshipDataVerifiedDate } from "@/lib/scholarships";
import { getScholarshipLogo } from "@/lib/scholarship-logo";

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
    .select("scholarship_name, status, checklist")
    .eq("user_id", user.id);

  if (trackerError) console.error("scholarships tracker query failed:", trackerError);

  const trackerByName = new Map((trackerRows ?? []).map((r) => [r.scholarship_name, r.status]));
  const checklistByName = new Map(
    (trackerRows ?? []).map((r) => [r.scholarship_name, (r.checklist as { label: string; done: boolean }[] | null) ?? []])
  );

  const { data: syncedRows, error: syncedError } = await supabase
    .from("timeline_items")
    .select("title")
    .eq("user_id", user.id)
    .like("title", "Scholarship: %");

  if (syncedError) console.error("scholarships synced-timeline query failed:", syncedError);

  const syncedNames = new Set((syncedRows ?? []).map((r) => r.title.replace(/^Scholarship: /, "")));

  const allScholarships = getAllScholarships();
  const uniqueOrgs = [...new Set(allScholarships.map((s) => s.organization))];
  const logoEntries = await Promise.all(uniqueOrgs.map(async (org) => [org, await getScholarshipLogo(org)] as const));
  const logoByOrg = new Map(logoEntries);

  const scholarships = allScholarships.map((s) => ({
    ...s,
    likelyMatch: isLikelyMatch(s, scholarshipProfile),
    matchReason: getMatchReason(s, scholarshipProfile),
    fit: getFitTier(s, scholarshipProfile),
    category: getCategory(s),
    trackerStatus: (trackerByName.get(s.name) as "saved" | "applied" | undefined) ?? null,
    checklist: checklistByName.get(s.name) ?? [],
    syncedToTimeline: syncedNames.has(s.name),
    logo: logoByOrg.get(s.organization) ?? null,
  }));

  return (
    <NavShell>
      <ScholarshipsClient scholarships={scholarships} dataVerifiedDate={getScholarshipDataVerifiedDate()} />
    </NavShell>
  );
}
