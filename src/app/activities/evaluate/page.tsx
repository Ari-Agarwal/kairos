import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import NavShell from "@/components/NavShell";
import ActivityEvalClient from "./ActivityEvalClient";

export default async function ActivityEvalPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("extracurriculars, activity_hours")
    .eq("user_id", user.id)
    .maybeSingle();
  if (profileError) console.error("activities evaluate profile query failed:", profileError);
  if (!profile) redirect("/onboarding");

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

        <ActivityEvalClient activities={activities} activityHours={activityHours} />
      </div>
    </NavShell>
  );
}
