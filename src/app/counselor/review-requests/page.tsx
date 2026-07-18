import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCounselorRecord } from "@/lib/access";
import CounselorNavShell from "@/components/CounselorNavShell";
import ReviewRequestsClient from "./ReviewRequestsClient";

interface ReviewRequest {
  id: string;
  user_id: string;
  status: "pending" | "in_progress" | "completed";
  review_notes: string;
  created_at: string;
  studentName: string;
}

export default async function ReviewRequestsPage() {
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

  if (schoolError) console.error("counselor review-requests school query failed:", schoolError);

  // Fetch students assigned to this counselor's school.
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("user_id, display_name")
    .eq("school_id", counselor.school_id);

  if (profilesError) console.error("counselor review-requests profiles query failed:", profilesError);

  const studentIds = (profiles ?? []).map((p) => p.user_id);
  const nameByUser = new Map((profiles ?? []).map((p) => [p.user_id, p.display_name as string | null]));

  const requests: ReviewRequest[] = [];

  if (studentIds.length > 0) {
    const { data: rows, error: rowsError } = await supabase
      .from("review_requests")
      .select("id, user_id, status, review_notes, created_at")
      .in("user_id", studentIds)
      .order("created_at", { ascending: false });

    if (rowsError) console.error("counselor review-requests query failed:", rowsError);

    for (const r of rows ?? []) {
      requests.push({
        ...r,
        status: r.status as ReviewRequest["status"],
        studentName: nameByUser.get(r.user_id) ?? "Student",
      });
    }
  }

  return (
    <CounselorNavShell schoolName={school?.name ?? "Your School"}>
      <ReviewRequestsClient initialRequests={requests} />
    </CounselorNavShell>
  );
}
