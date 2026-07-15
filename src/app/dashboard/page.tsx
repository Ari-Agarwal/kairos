import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import NavShell from "@/components/NavShell";
import ProfileCompletenessModal from "@/components/ProfileCompletenessModal";
import CountUp from "@/components/CountUp";
import GenerateTimelineCard from "./GenerateTimelineCard";

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

  const { data: activeMatches } = await supabase
    .from("school_matches")
    .select("school_name, category, percentage")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("percentage", { ascending: false });

  const CATEGORY_ORDER = ["reach", "target", "safety"] as const;
  const topMatches = CATEGORY_ORDER
    .map((category) => activeMatches?.find((m) => m.category === category))
    .filter((m): m is NonNullable<typeof m> => Boolean(m));

  const { count: timelineItemCount } = await supabase
    .from("timeline_items")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

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
      <div className="px-5 md:px-8 py-10 max-w-3xl mx-auto w-full">
        <h1 className="reveal font-serif text-3xl text-text mb-2">Welcome, {name}.</h1>
        <p className="reveal text-text-gray text-sm mb-8" style={{ ["--reveal-delay" as string]: "0.06s" }}>
          {profile.grade_level} · {profile.current_school} · {profile.intended_major || "Major undecided"}
          {" · "}
          {profile.unweighted_gpa} UW / {profile.weighted_gpa} W GPA
        </p>

        {(() => {
          const cta = !activeMatchCount
            ? { text: "Generate your school matches to see where you stand.", href: "/matches", label: "Get Matches" }
            : !timelineItemCount
            ? { text: "Build your personalized application timeline.", href: "/timeline", label: "Build Timeline" }
            : { text: "Get feedback on your college essays.", href: "/essay-feedback", label: "Get Essay Feedback" };
          return (
            <div
              className="reveal flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card border border-border rounded-2xl px-5 py-4 mb-6"
              style={{ ["--reveal-delay" as string]: "0.08s" }}
            >
              <p className="text-text text-sm">{cta.text}</p>
              <Link
                href={cta.href}
                className="shrink-0 rounded-xl bg-primary hover:bg-primary-hover transition-colors text-bg font-medium text-sm px-4 py-2 text-center"
              >
                {cta.label}
              </Link>
            </div>
          );
        })()}

        {matchError === "true" && (
          <div className="reveal bg-red-tint border border-border rounded-2xl px-5 py-4 mb-6">
            <p className="text-red text-sm">
              We couldn&apos;t generate your school matches just now. Head to the Matches tab and
              we&apos;ll pick it back up automatically.
            </p>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-5 mb-8">
          <Link
            href="/matches"
            className="reveal block min-w-0 bg-card border border-border rounded-2xl px-6 py-7 min-h-[220px] hover:border-primary/40 hover:-translate-y-0.5 transition-all"
            style={{ ["--reveal-delay" as string]: "0.12s" }}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-text-gray text-sm">Your top matches</p>
              <span className="text-text-gray text-sm">
                <CountUp value={activeMatchCount ?? 0} suffix=" schools" />
              </span>
            </div>
            {topMatches && topMatches.length > 0 ? (
              <div className="space-y-3">
                {topMatches.map((m) => (
                  <div key={m.school_name} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span
                        className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full mb-1.5 capitalize ${CATEGORY_STYLES[m.category]}`}
                      >
                        {m.category}
                      </span>
                      <p className="font-serif text-base text-text truncate">{m.school_name}</p>
                    </div>
                    <CountUp value={m.percentage} suffix="%" className="font-serif text-xl text-primary shrink-0" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-start gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-text-gray/70 ambient-star" style={{ ["--twinkle-max" as string]: "0.9" }} />
                <p className="text-text-gray text-sm">No matches yet, tap Matches below to generate your personalized school list.</p>
              </div>
            )}
          </Link>

          {!timelineItemCount ? (
            <div className="reveal h-full" style={{ ["--reveal-delay" as string]: "0.18s" }}>
              <GenerateTimelineCard />
            </div>
          ) : (
            <Link
              href="/timeline"
              className="reveal block min-w-0 bg-card border border-border rounded-2xl px-6 py-7 min-h-[220px] hover:border-primary/40 hover:-translate-y-0.5 transition-all"
              style={{ ["--reveal-delay" as string]: "0.18s" }}
            >
              <p className="text-text-gray text-sm mb-4">Coming up on your timeline</p>
              {upcomingTasks && upcomingTasks.length > 0 ? (
                <div className="space-y-3">
                  {upcomingTasks.map((t) => (
                    <div key={t.id} className="flex items-center justify-between gap-2">
                      <p className="text-base text-text truncate min-w-0">{t.title}</p>
                      <span className="text-text-gray text-sm shrink-0">
                        {t.due_date ? new Date(`${t.due_date}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-start gap-2.5">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-text-gray/70 ambient-star" style={{ ["--twinkle-max" as string]: "0.9" }} />
                  <p className="text-text-gray text-sm">Nothing upcoming yet, tap Timeline below to see your full plan.</p>
                </div>
              )}
            </Link>
          )}
        </div>
      </div>
    </NavShell>
  );
}
