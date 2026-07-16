"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ACTIONS: { status: "reviewed" | "actioned" | "dismissed"; label: string }[] = [
  { status: "reviewed", label: "Mark reviewed" },
  { status: "actioned", label: "Mark actioned" },
  { status: "dismissed", label: "Dismiss" },
];

export default function ReportActions({ reportId, adminKey }: { reportId: string; adminKey: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState<string | null>(null);

  async function setStatus(status: string) {
    setSubmitting(status);
    const res = await fetch(`/api/admin/reports/${reportId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: adminKey, status }),
    });
    setSubmitting(null);
    if (res.ok) router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {ACTIONS.map((a) => (
        <button
          key={a.status}
          onClick={() => setStatus(a.status)}
          disabled={submitting !== null}
          className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-border text-text hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
        >
          {submitting === a.status ? "..." : a.label}
        </button>
      ))}
    </div>
  );
}
