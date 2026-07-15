import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";

// Protected by a secret key in the URL (?key=...), same pattern as the
// parent/counselor share links — not gated by Supabase auth since there's
// no admin-role concept in this app. Deliberately returns a plain 404 on a
// wrong/missing key instead of a 401/403, so the route's existence isn't
// signaled to anyone probing it.

export default async function AdminWaitlistPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>;
}) {
  const { key } = await searchParams;

  if (!key || key !== process.env.WAITLIST_ADMIN_KEY) {
    notFound();
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from("waitlist_signups")
    .select("source, contact_type, created_at")
    .order("created_at", { ascending: false });

  if (error || !data) {
    return (
      <main className="min-h-screen bg-bg flex items-center justify-center px-6">
        <p className="text-red">Could not load waitlist data.</p>
      </main>
    );
  }

  const bySource = new Map<string, number>();
  for (const row of data) {
    const key = row.source ?? "(untagged link)";
    bySource.set(key, (bySource.get(key) ?? 0) + 1);
  }
  const sourceRows = Array.from(bySource.entries()).sort((a, b) => b[1] - a[1]);

  const byContactType = new Map<string, number>();
  for (const row of data) {
    byContactType.set(row.contact_type, (byContactType.get(row.contact_type) ?? 0) + 1);
  }

  return (
    <main className="min-h-screen bg-bg px-6 py-12">
      <div className="max-w-lg mx-auto">
        <h1 className="font-serif text-2xl text-text mb-1">Waitlist</h1>
        <p className="text-text-gray text-sm mb-8">{data.length} total signups</p>

        <h2 className="text-text text-sm font-medium mb-3">By source</h2>
        <div className="rounded-xl border border-border overflow-hidden mb-8">
          {sourceRows.map(([source, count], i) => (
            <div
              key={source}
              className={`flex justify-between px-4 py-3 text-sm ${i % 2 === 0 ? "bg-card" : "bg-bg"}`}
            >
              <span className="text-text">{source}</span>
              <span className="text-text-gray">{count}</span>
            </div>
          ))}
        </div>

        <h2 className="text-text text-sm font-medium mb-3">By contact type</h2>
        <div className="rounded-xl border border-border overflow-hidden">
          {Array.from(byContactType.entries()).map(([type, count], i) => (
            <div
              key={type}
              className={`flex justify-between px-4 py-3 text-sm ${i % 2 === 0 ? "bg-card" : "bg-bg"}`}
            >
              <span className="text-text capitalize">{type}</span>
              <span className="text-text-gray">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
