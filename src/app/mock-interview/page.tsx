import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import NavShell from "@/components/NavShell";
import MockInterviewClient from "./MockInterviewClient";

export const metadata = { title: "Mock Interview · Kairos" };

export default async function MockInterviewPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile, error: profileError } = await supabase.from("profiles").select("user_id").eq("user_id", user.id).maybeSingle();
  if (profileError) console.error("mock-interview profile query failed:", profileError);
  if (!profile) redirect("/onboarding");

  return (
    <NavShell>
      <MockInterviewClient />
    </NavShell>
  );
}
