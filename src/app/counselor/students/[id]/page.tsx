import { createClient, createServiceClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { getCounselorRecord } from "@/lib/access";
import CounselorNavShell from "@/components/CounselorNavShell";
import StudentDetailClient from "./StudentDetailClient";

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const counselor = await getCounselorRecord(supabase, user.id);
  if (!counselor) redirect("/dashboard");

  const { data: school } = await supabase
    .from("schools")
    .select("name")
    .eq("school_id", counselor.school_id)
    .maybeSingle();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", id)
    .eq("school_id", counselor.school_id)
    .maybeSingle();

  if (!profile) notFound();

  const serviceClient = createServiceClient();
  const { data: authUser } = await serviceClient.auth.admin.getUserById(id);
  const studentName =
    (authUser.user?.user_metadata?.full_name as string | undefined) ?? authUser.user?.email ?? "Student";

  const { data: matches } = await supabase
    .from("school_matches")
    .select("*")
    .eq("user_id", id)
    .eq("is_active", true)
    .order("category", { ascending: false })
    .order("percentage", { ascending: false });

  const { data: timelineItems } = await supabase
    .from("timeline_items")
    .select("*")
    .eq("user_id", id)
    .order("due_date", { ascending: true, nullsFirst: false });

  const { data: note } = await supabase
    .from("counselor_notes")
    .select("*")
    .eq("counselor_id", counselor.counselor_id)
    .eq("student_user_id", id)
    .maybeSingle();

  return (
    <CounselorNavShell schoolName={school?.name ?? "Your School"}>
      <StudentDetailClient
        studentName={studentName}
        profile={profile}
        matches={matches ?? []}
        timelineItems={timelineItems ?? []}
        counselorId={counselor.counselor_id}
        studentUserId={id}
        initialNoteText={note?.note_text ?? ""}
      />
    </CounselorNavShell>
  );
}
