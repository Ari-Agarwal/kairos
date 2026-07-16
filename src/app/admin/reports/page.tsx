import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import ReportActions from "./ReportActions";

// Section 8's still-open item: `reports` rows exist and are queryable by the
// reporter, but there was no counselor/admin-facing surface to triage them.
// Same key-protected pattern as /admin/waitlist -- no admin-role concept in
// this app yet, so this gates on a shared secret instead of Supabase auth.

interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string | null;
  content_type: string;
  content_id: string | null;
  reason: string;
  status: "pending" | "reviewed" | "actioned" | "dismissed";
  created_at: string;
}

const STATUS_STYLES: Record<Report["status"], string> = {
  pending: "bg-amber-tint text-amber-text-on-tint",
  reviewed: "bg-premium/10 text-premium",
  actioned: "bg-green-tint text-green",
  dismissed: "bg-bg text-text-gray",
};

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>;
}) {
  const { key } = await searchParams;

  if (!key || key !== process.env.MODERATION_ADMIN_KEY) {
    notFound();
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from("reports")
    .select("id, reporter_id, reported_user_id, content_type, content_id, reason, status, created_at")
    .order("created_at", { ascending: false });

  if (error || !data) {
    return (
      <main className="min-h-screen bg-bg flex items-center justify-center px-6">
        <p className="text-red">Could not load reports.</p>
      </main>
    );
  }

  const reports = data as Report[];
  const userIds = Array.from(
    new Set(reports.flatMap((r) => [r.reporter_id, r.reported_user_id]).filter((id): id is string => !!id))
  );

  const nameByUser = new Map<string, string>();
  await Promise.all(
    userIds.map(async (id) => {
      const res = await service.auth.admin.getUserById(id);
      nameByUser.set(id, res.data.user?.user_metadata?.full_name ?? res.data.user?.email ?? "Unknown user");
    })
  );

  const pendingCount = reports.filter((r) => r.status === "pending").length;

  return (
    <main className="min-h-screen bg-bg px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-1">
          <h1 className="font-serif text-2xl text-text">Moderation Queue</h1>
          {pendingCount > 0 && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-tint text-amber-text-on-tint">
              {pendingCount} pending
            </span>
          )}
        </div>
        <p className="text-text-gray text-sm mb-8">{reports.length} total reports</p>

        {reports.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl px-6 py-8 text-center">
            <p className="text-text-gray text-sm">No reports submitted yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((r) => (
              <div key={r.id} className="bg-card border border-border rounded-2xl px-6 py-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <p className="text-text font-medium text-sm">
                      {nameByUser.get(r.reporter_id) ?? "Unknown user"} reported{" "}
                      {r.reported_user_id ? nameByUser.get(r.reported_user_id) ?? "unknown user" : "content"}
                    </p>
                    <p className="text-text-gray text-xs mt-0.5">
                      {r.content_type}
                      {" · "}
                      {new Date(r.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLES[r.status]}`}>
                    {r.status[0].toUpperCase() + r.status.slice(1)}
                  </span>
                </div>
                <p className="text-text-gray text-sm whitespace-pre-wrap">{r.reason}</p>
                {r.status === "pending" && <ReportActions reportId={r.id} adminKey={key} />}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
