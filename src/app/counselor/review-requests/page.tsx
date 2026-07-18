import { createClient, createServiceClient } from "@/lib/supabase/server";
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

  // Fetch student user_ids assigned to this counselor's school.
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("school_id", counselor.school_id);

  if (profilesError) console.error("counselor review-requests profiles query failed:", profilesError);

  const studentIds = (profiles ?? []).map((p) => p.user_id);

  const requests: ReviewRequest[] = [];

  if (studentIds.length > 0) {
    const { data: rows, error: rowsError } = await supabase
      .from("review_requests")
      .select("id, user_id, status, review_notes, created_at")
      .in("user_id", studentIds)
      .order("created_at", { ascending: false });

    if (rowsError) console.error("counselor review-requests query failed:", rowsError);

    if (rows && rows.length > 0) {
      const serviceClient = createServiceClient();
      const emailByUser = new Map<string, string>();

      await Promise.all(
        rows
          .map((r) => r.user_id)
          .filter((id, i, arr) => arr.indexOf(id) === i) // dedupe
          .map(async (id) => {
            const res = await serviceClient.auth.admin.getUserById(id);
            const label = res.data.user?.user_metadata?.full_name ?? res.data.user?.email ?? "Student";
            emailByUser.set(id, label);
          })
      );

      for (const r of rows) {
        requests.push({
          ...r,
          status: r.status as ReviewRequest["status"],
          studentName: emailByUser.get(r.user_id) ?? "Student",
        });
      }
    }
  }

  return (
    <CounselorNavShell schoolName={school?.name ?? "Your School"}>
      <ReviewRequestsClient initialRequests={requests} />
    </CounselorNavShell>
  );
}
