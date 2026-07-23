import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import NavShell from "@/components/NavShell";
import MentorThreadClient from "./MentorThreadClient";

export default async function MentorThreadPage({ params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: request, error: requestError } = await supabase
    .from("mentor_requests")
    .select("id, mentee_id, mentor_id, school_name, status")
    .eq("id", requestId)
    .maybeSingle();

  if (requestError) console.error("mentor thread request query failed:", requestError);

  if (!request || request.status !== "accepted") notFound();
  if (request.mentee_id !== user.id && request.mentor_id !== user.id) notFound();

  const { data: messages, error: messagesError } = await supabase
    .from("mentor_messages")
    .select("id, sender_id, body, message_type, created_at")
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });

  if (messagesError) console.error("mentor thread messages query failed:", messagesError);

  const otherUserId = request.mentee_id === user.id ? request.mentor_id : request.mentee_id;
  const isMentor = request.mentor_id === user.id;

  return (
    <NavShell>
      <MentorThreadClient
        requestId={requestId}
        schoolName={request.school_name}
        initialMessages={messages ?? []}
        currentUserId={user.id}
        otherUserId={otherUserId}
        isMentor={isMentor}
      />
    </NavShell>
  );
}
