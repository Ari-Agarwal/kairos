// SCREEN 9 COMPLETE
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import NavShell from "@/components/NavShell";
import UpgradeClient from "./UpgradeClient";

export default async function UpgradePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier, premium_notify_requested")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <NavShell>
      <UpgradeClient
        isPremium={profile?.subscription_tier === "premium"}
        notifyRequested={profile?.premium_notify_requested ?? false}
      />
    </NavShell>
  );
}
