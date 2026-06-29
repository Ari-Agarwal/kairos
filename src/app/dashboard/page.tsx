import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import NavShell from "@/components/NavShell";
import ProfileCompletenessModal from "@/components/ProfileCompletenessModal";
import { Features } from "@/components/blocks/features-6";

const CATEGORY_STYLES: Record<string, string> = {
  reach: "bg-red-tint text-red",
  target: "bg-amber-tint text-amber-text-on-tint",
  safety: "bg-green-tint text-green",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ matchError?: string }>;
}) {
  const { matchError } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
  if (!profile) redirect("/onboarding");

  const { count: activeMatchCount } = await supabase
    .from("school_matches")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_active", true);

  const { data: topMatches } = await supabase
    .from("school_matches")
    .select("school_name, category, percentage")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("percentage", { ascending: false })
    .limit(3);

  const { data: upcomingTasks } = await supabase
    .from("timeline_items")
    .select("id, title, due_date")
    .eq("user_id", user.id)
    .eq("completed", false)
    .order("due_date", { ascending: true, nullsFirst: false })
    .limit(3);

  const name = (user.user_metadata?.full_name as string | undefined)?.split(" ")[0] || "there";

  return (
    <NavShell>
      <ProfileCompletenessModal profile={profile} />
      <div className="px-5 md:px-8 py-10 max-w-2xl mx-auto w-full">
        <h1 className="font-serif text-3xl text-text mb-2">Welcome, {name}.</h1>
        <p className="text-text-gray text-sm mb-1">
          {profile.grade_level} · GPA {profile.gpa} · {profile.intended_major || "Major undecided"}
        </p>
        <Link href="/about" className="text-text-gray text-xs hover:text-text underline mb-8 inline-block">
          About Telos
        </Link>

        {matchError === "true" && (
          <div className="bg-red-tint border border-border rounded-2xl px-5 py-4 mb-6">
            <p className="text-red text-sm">
              We couldn&apos;t generate your school matches just now. Head to the Matches tab and
              tap &quot;Regenerate List&quot; to try again.
            </p>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          <Link
            href="/matches"
            className="block bg-card border border-border rounded-2xl px-5 py-5 hover:border-primary/40 transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-text-gray text-xs">Your top matches</p>
              <span className="text-text-gray text-xs">{activeMatchCount ?? 0} schools</span>
            </div>
            {topMatches && topMatches.length > 0 ? (
              <div className="space-y-2">
                {topMatches.map((m) => (
                  <div key={m.school_name} className="flex items-center justify-between">
                    <div>
                      <span
                        className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full mb-1 capitalize ${CATEGORY_STYLES[m.category]}`}
                      >
                        {m.category}
                      </span>
                      <p className="font-serif text-sm text-text">{m.school_name}</p>
                    </div>
                    <span className="font-serif text-lg text-primary">{m.percentage}%</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-text-gray text-sm">No matches yet, head to Matches to generate your list.</p>
            )}
          </Link>

          <Link
            href="/timeline"
            className="block bg-card border border-border rounded-2xl px-5 py-5 hover:border-primary/40 transition-colors"
          >
            <p className="text-text-gray text-xs mb-3">Coming up on your timeline</p>
            {upcomingTasks && upcomingTasks.length > 0 ? (
              <div className="space-y-2">
                {upcomingTasks.map((t) => (
                  <div key={t.id} className="flex items-center justify-between">
                    <p className="text-sm text-text truncate pr-2">{t.title}</p>
                    <span className="text-text-gray text-xs shrink-0">
                      {t.due_date ? new Date(t.due_date).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-text-gray text-sm">Nothing upcoming, check your full timeline for details.</p>
            )}
          </Link>
        </div>

        <Features activeMatchCount={activeMatchCount ?? 0} />
      </div>
    </NavShell>
  );
}
