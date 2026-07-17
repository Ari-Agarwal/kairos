import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import NavShell from "@/components/NavShell";
import { getMissingFields } from "@/lib/profile-completeness";
import { INLINE_TEXT_FIELDS } from "@/lib/mini-onboarding-fields";
import TimelinePrepClient from "./TimelinePrepClient";

export const metadata = { title: "Before we generate — Kairos" };

export default async function TimelinePrepPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile, error: profileError } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
  if (profileError) console.error("timeline prep profile query failed:", profileError);
  if (!profile) redirect("/onboarding");

  const missing = getMissingFields(profile, "timeline");
  const inlineFields = missing.filter((f) => INLINE_TEXT_FIELDS.includes(f));
  const linkOutFields = missing.filter((f) => !INLINE_TEXT_FIELDS.includes(f));

  return (
    <NavShell>
      <TimelinePrepClient inlineFields={inlineFields} linkOutFields={linkOutFields} />
    </NavShell>
  );
}
