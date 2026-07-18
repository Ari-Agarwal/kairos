import { createClient } from "@/lib/supabase/server";
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

  const { data: school, error: schoolError } = await supabase
    .from("schools")
    .select("name")
    .eq("school_id", counselor.school_id)
    .maybeSingle();

  if (schoolError) console.error("student detail school query failed:", schoolError);

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", id)
    .eq("school_id", counselor.school_id)
    .maybeSingle();

  if (profileError) console.error("student detail profile query failed:", profileError);

  if (!profile) notFound();

  const studentName = (profile.display_name as string | null) ?? "Student";

  const { data: matches, error: matchesError } = await supabase
    .from("school_matches")
    .select("*")
    .eq("user_id", id)
    .eq("is_active", true)
    .order("category", { ascending: false })
    .order("percentage", { ascending: false });

  if (matchesError) console.error("student detail matches query failed:", matchesError);

  const { data: timelineItems, error: timelineError } = await supabase
    .from("timeline_items")
    .select("*")
    .eq("user_id", id)
    .order("due_date", { ascending: true, nullsFirst: false });

  if (timelineError) console.error("student detail timeline query failed:", timelineError);

  const { data: note, error: noteError } = await supabase
    .from("counselor_notes")
    .select("*")
    .eq("counselor_id", counselor.counselor_id)
    .eq("student_user_id", id)
    .maybeSingle();

  if (noteError) console.error("student detail note query failed:", noteError);

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
