import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import NavShell from "@/components/NavShell";
import DataPrivacyClient from "./DataPrivacyClient";

export const metadata = { title: "Your data — Kairos" };

export default async function DataPrivacyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <NavShell>
      <DataPrivacyClient />
    </NavShell>
  );
}
