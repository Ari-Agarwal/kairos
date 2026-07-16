// SCREEN 8 COMPLETE
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import NavShell from "@/components/NavShell";
import ProfileClient from "./ProfileClient";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile, error: profileError } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
  if (profileError) console.error("profile page profile query failed:", profileError);
  if (!profile) redirect("/onboarding");

  const { count: activeSchoolCount, error: activeSchoolCountError } = await supabase
    .from("school_matches")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_active", true);

  if (activeSchoolCountError) console.error("profile page active school count query failed:", activeSchoolCountError);

  const fullName = (user.user_metadata?.full_name as string | undefined) ?? "";

  return (
    <NavShell>
      <ProfileClient
        profile={profile}
        fullName={fullName}
        email={user.email ?? ""}
        activeSchoolCount={activeSchoolCount ?? 0}
      />
    </NavShell>
  );
}
