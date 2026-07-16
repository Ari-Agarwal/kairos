import { createClient, createServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCounselorRecord } from "@/lib/access";
import CounselorNavShell from "@/components/CounselorNavShell";

interface ReviewRequest {
  id: string;
  user_id: string;
  status: "pending" | "in_progress" | "completed";
  review_notes: string;
  created_at: string;
  studentName: string;
}

const STATUS_STYLES: Record<ReviewRequest["status"], string> = {
  pending: "bg-amber-tint text-amber-text-on-tint",
  in_progress: "bg-premium/10 text-premium",
  completed: "bg-green-tint text-green",
};

const STATUS_LABEL: Record<ReviewRequest["status"], string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
};

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

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <CounselorNavShell schoolName={school?.name ?? "Your School"}>
      <div className="px-5 md:px-8 py-10 max-w-3xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-serif text-2xl text-text">Review Requests</h1>
          {pendingCount > 0 && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-tint text-amber-text-on-tint">
              {pendingCount} pending
            </span>
          )}
        </div>

        {requests.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl px-6 py-8 text-center">
            <p className="text-text-gray text-sm">No review requests from your students yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((r) => (
              <div key={r.id} className="bg-card border border-border rounded-2xl px-6 py-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <p className="text-text font-medium text-sm">{r.studentName}</p>
                    <p className="text-text-gray text-xs mt-0.5">
                      {new Date(r.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLES[r.status]}`}>
                    {STATUS_LABEL[r.status]}
                  </span>
                </div>
                <p className="text-text-gray text-sm whitespace-pre-wrap">{r.review_notes}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </CounselorNavShell>
  );
}
