import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import NavShell from "@/components/NavShell";
import RecommendersClient from "./RecommendersClient";

export default async function RecommendersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("user_id", user.id)
    .maybeSingle();
  if (profileError) console.error("recommenders profile query failed:", profileError);
  if (!profile) redirect("/onboarding");

  const { data: recommenders, error: recommendersError } = await supabase
    .from("recommenders")
    .select("id, recommender_name, recommender_email, relationship, status, share_token, brag_sheet, last_reminded_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (recommendersError) console.error("recommenders query failed:", recommendersError);

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "";

  return (
    <NavShell>
      <div className="px-5 md:px-8 py-8 max-w-2xl mx-auto w-full">
        <div className="flex items-center gap-3 mb-2">
          <Link href="/profile" className="text-text-gray hover:text-text text-sm">
            ← Profile
          </Link>
        </div>
        <h1 className="font-serif text-2xl text-text mb-2">Recommendation Letters</h1>
        <p className="text-text-gray text-sm mb-6">
          Add teachers or mentors who are writing you a recommendation. Share a link with them so they can see your brag sheet and AI-generated talking points.
        </p>
        <RecommendersClient
          initialRecommenders={recommenders ?? []}
          origin={origin}
        />
      </div>
    </NavShell>
  );
}
