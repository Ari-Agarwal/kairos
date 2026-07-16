import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import NavShell from "@/components/NavShell";
import MentorsClient from "./MentorsClient";

export const metadata = { title: "Mentors — Kairos" };

export default async function MentorsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: sentRequests, error: sentRequestsError } = await supabase
    .from("mentor_requests")
    .select("id, mentor_id, school_name, intro, status, created_at")
    .eq("mentee_id", user.id)
    .order("created_at", { ascending: false });

  if (sentRequestsError) console.error("mentors sent requests query failed:", sentRequestsError);

  const { data: receivedRequests, error: receivedRequestsError } = await supabase
    .from("mentor_requests")
    .select("id, mentee_id, school_name, intro, status, created_at")
    .eq("mentor_id", user.id)
    .order("created_at", { ascending: false });

  if (receivedRequestsError) console.error("mentors received requests query failed:", receivedRequestsError);

  return (
    <NavShell>
      <MentorsClient sentRequests={sentRequests ?? []} receivedRequests={receivedRequests ?? []} />
    </NavShell>
  );
}
