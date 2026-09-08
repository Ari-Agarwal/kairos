// SCREEN 7 COMPLETE
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import EssayFeedbackClient from "./EssayFeedbackClient";

// Moved out of NavShell onto its own dedicated screen (Software_Timeline.md
// QA item: the feedback flow felt clunky crammed under the full app nav
// chrome). Just a back button in the corner, matching the focused-screen
// pattern used elsewhere (e.g. the "← Profile" link on Recommendation
// Letters) rather than the full sidebar/tab nav.
export default async function EssayFeedbackPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile, error: profileError } = await supabase.from("profiles").select("user_id").eq("user_id", user.id).maybeSingle();
  if (profileError) console.error("essay-feedback profile query failed:", profileError);
  if (!profile) redirect("/onboarding");

  return (
    <div className="min-h-screen bg-bg text-text">
      <div className="px-5 md:px-8 py-8 max-w-2xl mx-auto w-full">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-text-gray hover:text-text text-sm mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
        <h1 className="font-serif text-2xl text-text mb-6">Essay &amp; Supplemental Feedback</h1>

        <EssayFeedbackClient />
      </div>
    </div>
  );
}
