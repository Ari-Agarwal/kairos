import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import NavShell from "@/components/NavShell";
import CareerPathClient from "./CareerPathClient";
import { getCollegePhoto } from "@/lib/college-photo";

export const metadata = { title: "Career Path · Kairos" };

export default async function CareerPathPage({
  searchParams,
}: {
  searchParams: Promise<{ school?: string }>;
}) {
  const { school: preselectedSchool } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("intended_major")
    .eq("user_id", user.id)
    .maybeSingle();
  if (profileError) console.error("career-path profile query failed:", profileError);
  if (!profile) redirect("/onboarding");

  const { data: matches, error: matchesError } = await supabase
    .from("school_matches")
    .select("id, school_name")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("school_name");
  if (matchesError) console.error("career-path matches query failed:", matchesError);

  // Same primary Wikipedia photo used on Matches, here keyed by school name
  // (not match id) since Career Path's compare view also accepts free-typed
  // custom school names that don't have a match row.
  const photoEntries = await Promise.all(
    (matches ?? []).map(async (m) => [m.school_name, await getCollegePhoto(m.school_name)] as const)
  );
  const photos = Object.fromEntries(photoEntries);

  return (
    <NavShell>
      <div className="px-5 md:px-8 py-8 max-w-2xl mx-auto w-full">
        <h1 className="font-serif text-2xl text-text mb-1">Career Path</h1>
        <p className="text-text-gray text-sm mb-6">
          See what careers your intended major typically leads to at a given school: common internships,
          employer types, and salary ranges. Pick any school on your list or type in any school you&apos;re
          curious about.
        </p>

        <CareerPathClient
          matches={matches ?? []}
          intendedMajor={profile.intended_major}
          preselectedSchool={preselectedSchool ?? null}
          photos={photos}
        />
      </div>
    </NavShell>
  );
}
