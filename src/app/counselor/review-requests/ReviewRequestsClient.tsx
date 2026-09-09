"use client";

import { useState } from "react";

interface ReviewRequest {
  id: string;
  status: "pending" | "in_progress" | "completed";
  review_notes: string;
  created_at: string;
  studentName: string;
}

const STATUS_STYLES: Record<ReviewRequest["status"], string> = {
  pending: "bg-amber-tint text-amber-text-on-tint",
  in_progress: "bg-secondary-tint text-secondary",
  completed: "bg-green-tint text-green",
};

const STATUS_LABEL: Record<ReviewRequest["status"], string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
};

const NEXT_STATUS: Record<ReviewRequest["status"], ReviewRequest["status"] | null> = {
  pending: "in_progress",
  in_progress: "completed",
  completed: null,
};

export default function ReviewRequestsClient({ initialRequests }: { initialRequests: ReviewRequest[] }) {
  const [requests, setRequests] = useState(initialRequests);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);

  async function advanceStatus(r: ReviewRequest) {
    const next = NEXT_STATUS[r.status];
    if (!next) return;
    setUpdatingId(r.id);
    setErrorId(null);
    try {
      const res = await fetch(`/api/counselor/review-requests/${r.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error();
      setRequests((prev) => prev.map((req) => (req.id === r.id ? { ...req, status: next } : req)));
    } catch {
      setErrorId(r.id);
    } finally {
      setUpdatingId(null);
    }
  }

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <div className="px-5 md:px-8 py-10 max-w-3xl mx-auto w-full">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-serif text-2xl text-text">Review Requests</h1>
        {pendingCount > 0 && (
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-tint text-amber-text-on-tint">
            {pendingCount} pending
          </span>
        )}
      </div>

      {/* Human Review is shelved -- the student-facing entry point has been
          disabled and redirects to /dashboard, so no new requests can arrive.
          Existing open requests are still shown so counselors can close them
          out. This notice explains the quiet queue without requiring counselors
          to dig into product history. */}
      <div className="bg-card border border-border rounded-2xl px-5 py-4 mb-6 text-sm text-text-gray leading-relaxed">
        <p className="text-text font-medium mb-1">Student intake is currently paused</p>
        <p>
          The student-facing &quot;Request a Review&quot; feature has been temporarily removed from the student
          dashboard while it&apos;s being reworked. Students cannot submit new requests right now, which is why
          this queue may be quiet. Any requests already open are listed below so you can still close them out.
        </p>
      </div>

      {requests.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl px-6 py-8 text-center">
          <p className="text-text-gray text-sm">No open review requests for your students.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((r) => {
            const next = NEXT_STATUS[r.status];
            return (
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
                <p className="text-text-gray text-sm whitespace-pre-wrap mb-4">{r.review_notes}</p>
                {next && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => advanceStatus(r)}
                      disabled={updatingId === r.id}
                      className="text-sm font-medium px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-hover transition-colors text-bg disabled:opacity-40"
                    >
                      {updatingId === r.id ? "Updating..." : `Mark ${STATUS_LABEL[next]}`}
                    </button>
                    {errorId === r.id && <p className="text-red text-xs">Failed to update. Try again.</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
