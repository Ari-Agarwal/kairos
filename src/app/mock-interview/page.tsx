import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Lock } from "lucide-react";
import NavShell from "@/components/NavShell";
import { canAccessFeature } from "@/lib/access";
import MockInterviewClient from "./MockInterviewClient";
import LockedCard from "../essay-feedback/LockedCard";

export const metadata = { title: "Mock Interview — Kairos" };

export default async function MockInterviewPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile, error: profileError } = await supabase.from("profiles").select("subscription_tier").eq("user_id", user.id).maybeSingle();
  if (profileError) console.error("mock-interview profile query failed:", profileError);
  if (!profile) redirect("/onboarding");

  const isPremium = canAccessFeature(profile, "mock_interview");

  return (
    <NavShell>
      {!isPremium ? (
        <div className="px-5 md:px-8 py-8 max-w-2xl mx-auto w-full">
          <h1 className="font-serif text-2xl text-text mb-6">Mock Interview</h1>
          <LockedCard>
            <Lock className="text-premium w-7 h-7 mx-auto mb-2" />
            <p className="text-text font-medium mb-1">Mock Interview is a Premium feature</p>
            <p className="text-text-gray text-sm mb-4">
              Practice answering real admissions interview questions out loud and get direct, scored feedback.
            </p>
            <Link
              href="/upgrade"
              className="inline-block rounded-xl bg-premium hover:opacity-90 transition-opacity text-bg font-medium px-5 py-2.5"
            >
              See Premium Plans
            </Link>
          </LockedCard>
        </div>
      ) : (
        <MockInterviewClient />
      )}
    </NavShell>
  );
}
