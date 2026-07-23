import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Lock } from "lucide-react";
import NavShell from "@/components/NavShell";
import ActivityEvalClient from "./ActivityEvalClient";

export default async function ActivityEvalPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("subscription_tier, extracurriculars, activity_hours")
    .eq("user_id", user.id)
    .maybeSingle();
  if (profileError) console.error("activities evaluate profile query failed:", profileError);
  if (!profile) redirect("/onboarding");

  const isPremium = profile.subscription_tier === "premium";
  const activities: string[] = profile.extracurriculars ?? [];
  const activityHours: Record<string, number> = (profile.activity_hours as Record<string, number> | null) ?? {};

  return (
    <NavShell>
      <div className="px-5 md:px-8 py-8 max-w-2xl mx-auto w-full">
        <div className="flex items-center gap-3 mb-2">
          <Link href="/profile" className="text-text-gray hover:text-text text-sm">
            ← Profile
          </Link>
        </div>
        <h1 className="font-serif text-2xl text-text mb-2">Activity List Evaluation</h1>
        <p className="text-text-gray text-sm mb-6">
          See how your activity list is likely to read to an admissions officer, with specific suggestions to strengthen it.
        </p>

        {!isPremium ? (
          <div className="bg-card border border-border rounded-2xl p-8 text-center">
            <Lock className="text-premium w-7 h-7 mx-auto mb-2" />
            <p className="text-text font-medium mb-1">Activity Evaluation is a Premium feature</p>
            <p className="text-text-gray text-sm mb-4">
              Get a scored evaluation and concrete suggestions for how to strengthen your activity list before you apply.
            </p>
            <Link
              href="/upgrade"
              className="inline-block rounded-xl bg-premium hover:opacity-90 transition-opacity text-bg font-medium px-5 py-2.5"
            >
              See Premium Plans
            </Link>
          </div>
        ) : (
          <ActivityEvalClient activities={activities} activityHours={activityHours} />
        )}
      </div>
    </NavShell>
  );
}
