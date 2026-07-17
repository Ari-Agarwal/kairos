import { createServiceClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

const CATEGORY_STYLES: Record<string, { badge: string; label: string }> = {
  reach:  { badge: "bg-red-tint text-red",                         label: "Reach"  },
  target: { badge: "bg-amber-tint text-amber-text-on-tint",        label: "Target" },
  safety: { badge: "bg-green-tint text-green",                     label: "Safety" },
};

interface Match {
  id: string;
  school_name: string;
  category: string;
  percentage: number;
  why_text: string;
}

interface Task {
  title: string;
  due_date: string | null;
  school_tags: string[] | null;
  completed: boolean;
}

async function getSnapshot(token: string) {
  if (token.length !== 64 || !/^[0-9a-f]+$/.test(token)) return null;

  const service = createServiceClient();

  const { data: link, error: linkError } = await service
    .from("shared_links")
    .select("user_id, expires_at, revoked_at")
    .eq("token", token)
    .single();

  if (linkError) console.error("shared view link query failed:", linkError);
  if (!link) return null;
  if (link.revoked_at !== null) return "revoked" as const;
  if (new Date(link.expires_at) < new Date()) return "expired" as const;

  const userId = link.user_id;

  const [profileRes, matchesRes, timelineRes, userData] = await Promise.all([
    service.from("profiles").select("grade_level, intended_major, current_school").eq("user_id", userId).single(),
    service.from("school_matches").select("id, school_name, category, percentage, why_text").eq("user_id", userId).eq("is_active", true).order("category"),
    service.from("timeline_items").select("title, due_date, school_tags, completed").eq("user_id", userId).eq("completed", false).order("due_date", { ascending: true }).limit(20),
    service.auth.admin.getUserById(userId),
  ]);

  if (profileRes.error) console.error("shared view profile query failed:", profileRes.error);
  if (matchesRes.error) console.error("shared view matches query failed:", matchesRes.error);
  if (timelineRes.error) console.error("shared view timeline query failed:", timelineRes.error);
  if (userData.error) console.error("shared view getUserById failed:", userData.error);

  const displayName: string =
    (userData.data?.user?.user_metadata?.full_name as string | undefined) ?? "Student";

  return {
    student: {
      display_name: displayName,
      grade_level: profileRes.data?.grade_level ?? null,
      current_school: profileRes.data?.current_school ?? null,
      intended_major: profileRes.data?.intended_major ?? null,
    },
    matches: (matchesRes.data ?? []) as Match[],
    upcoming_tasks: (timelineRes.data ?? []) as Task[],
  };
}

export default async function SharedView({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const snapshot = await getSnapshot(token);

  if (!snapshot) notFound();

  if (snapshot === "revoked") {
    return <StatusPage message="This shared link has been revoked by the student." />;
  }

  if (snapshot === "expired") {
    return <StatusPage message="This shared link has expired. Ask the student to send a new one." />;
  }

  const { student, matches, upcoming_tasks } = snapshot;

  const firstName = student.display_name.split(" ")[0];

  return (
    <div className="min-h-screen bg-bg text-text">
      <div className="max-w-2xl mx-auto px-5 py-10">
        <div className="mb-8">
          <p className="text-text-gray text-xs uppercase tracking-widest mb-2">Read-only · Shared by student</p>
          <h1 className="font-serif text-3xl text-text mb-1">{student.display_name}&apos;s College List</h1>
          <p className="text-text-gray text-sm">
            {[student.grade_level, student.current_school, student.intended_major?.length ? `Applying for ${student.intended_major.join(", ")}` : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>

        <section className="mb-10">
          <h2 className="font-serif text-xl text-text mb-4">School Matches</h2>
          {matches.length === 0 ? (
            <p className="text-text-gray text-sm">{firstName} hasn&apos;t generated school matches yet.</p>
          ) : (
            <div className="space-y-3">
              {matches.map((m, i) => {
                const style = CATEGORY_STYLES[m.category] ?? CATEGORY_STYLES.safety;
                return (
                  <div key={i} className="bg-card border border-border rounded-2xl p-5">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <p className="font-medium text-text">{m.school_name}</p>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-text-gray text-sm">{m.percentage}%</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.badge}`}>
                          {style.label}
                        </span>
                      </div>
                    </div>
                    <p className="text-text-gray text-sm leading-relaxed">{m.why_text}</p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="mb-10">
          <h2 className="font-serif text-xl text-text mb-4">Upcoming Tasks</h2>
          {upcoming_tasks.length === 0 ? (
            <p className="text-text-gray text-sm">No upcoming tasks.</p>
          ) : (
            <div className="space-y-2">
              {upcoming_tasks.map((t, i) => (
                <div key={i} className="bg-card border border-border rounded-xl px-5 py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-text text-sm">{t.title}</p>
                    {t.school_tags && t.school_tags.length > 0 && (
                      <p className="text-text-gray text-xs mt-0.5">{t.school_tags.join(", ")}</p>
                    )}
                  </div>
                  {t.due_date && (
                    <p className="text-text-gray text-xs shrink-0">
                      {new Date(t.due_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <p className="text-text-gray text-xs text-center border-t border-border pt-6">
          Admission odds are AI-generated estimates based on the student&apos;s profile and general acceptance data — not a guarantee of any outcome.
          This is a read-only view shared by {student.display_name}. Powered by Kairos.
        </p>
      </div>
    </div>
  );
}

function StatusPage({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-5">
      <div className="bg-card border border-border rounded-2xl p-8 max-w-sm text-center">
        <p className="font-serif text-xl text-text mb-2">Link unavailable</p>
        <p className="text-text-gray text-sm">{message}</p>
      </div>
    </div>
  );
}
