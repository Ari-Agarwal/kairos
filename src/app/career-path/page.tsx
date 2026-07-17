import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Lock } from "lucide-react";
import NavShell from "@/components/NavShell";
import { canAccessFeature } from "@/lib/access";
import LockedCard from "../essay-feedback/LockedCard";
import CareerPathClient from "./CareerPathClient";

export const metadata = { title: "Career Path — Kairos" };

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
    .select("subscription_tier, intended_major")
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

  const isPremium = canAccessFeature({ subscription_tier: profile.subscription_tier }, "career_path_explorer");

  return (
    <NavShell>
      <div className="px-5 md:px-8 py-8 max-w-2xl mx-auto w-full">
        <h1 className="font-serif text-2xl text-text mb-1">Career Path</h1>
        <p className="text-text-gray text-sm mb-6">
          Typical internships, employer types, and salary patterns for your intended major — at any
          school, not just one match at a time.
        </p>

        {!isPremium ? (
          <LockedCard>
            <Lock className="text-premium w-7 h-7 mx-auto mb-2" />
            <p className="text-text font-medium mb-1">Career Path is a Premium feature</p>
            <p className="text-text-gray text-sm mb-4">
              See typical internships, employer types, and salary patterns for your major at any
              school you&apos;re considering.
            </p>
            <Link
              href="/upgrade"
              className="inline-block rounded-xl bg-premium hover:opacity-90 transition-opacity text-bg font-medium px-5 py-2.5"
            >
              See Premium Plans
            </Link>
          </LockedCard>
        ) : (
          <CareerPathClient
            matches={matches ?? []}
            intendedMajor={profile.intended_major}
            preselectedSchool={preselectedSchool ?? null}
          />
        )}
      </div>
    </NavShell>
  );
}
