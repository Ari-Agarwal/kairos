// SCREEN 7 COMPLETE
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Lock } from "lucide-react";
import NavShell from "@/components/NavShell";
import EssayFeedbackClient from "./EssayFeedbackClient";
import LockedCard from "./LockedCard";

export default async function EssayFeedbackPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("subscription_tier").eq("user_id", user.id).maybeSingle();
  if (!profile) redirect("/onboarding");

  const isPremium = profile.subscription_tier === "premium";

  return (
    <NavShell>
      <div className="px-5 md:px-8 py-8 max-w-2xl mx-auto w-full">
        <h1 className="font-serif text-2xl text-text mb-6">Essay &amp; Supplemental Feedback</h1>

        {!isPremium ? (
          <LockedCard>
            <Lock className="text-premium w-7 h-7 mx-auto mb-2" />
            <p className="text-text font-medium mb-1">Essay Feedback is a Premium feature</p>
            <p className="text-text-gray text-sm mb-4">
              Get direct, honest feedback on your drafts, the kind a private counselor would give.
            </p>
            <Link
              href="/upgrade"
              className="inline-block rounded-xl bg-premium hover:opacity-90 transition-opacity text-bg font-medium px-5 py-2.5"
            >
              See Premium Plans
            </Link>
          </LockedCard>
        ) : (
          <EssayFeedbackClient />
        )}
      </div>
    </NavShell>
  );
}
