import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import NavShell from "@/components/NavShell";
import { getMissingFields } from "@/lib/profile-completeness";
import LivingProfileNudge from "@/components/LivingProfileNudge";
import CountUp from "@/components/CountUp";
import GenerateTimelineCard from "./GenerateTimelineCard";
import HumanReviewCard from "@/components/HumanReviewCard";
import InviteFriendCard from "@/components/InviteFriendCard";
import { MatchesEmptyArt, ScholarshipsEmptyArt } from "@/components/EmptyStateIllustration";
import { getAllScholarships, getFitTier, type ScholarshipProfile } from "@/lib/scholarships";

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

  const { data: profile, error: profileError } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
  if (profileError) console.error("dashboard profile query failed:", profileError);
  if (!profile) redirect("/onboarding");

  const { count: activeMatchCount, error: activeMatchCountError } = await supabase
    .from("school_matches")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_active", true);

  if (activeMatchCountError) console.error("dashboard active match count query failed:", activeMatchCountError);

  const { data: activeMatches, error: activeMatchesError } = await supabase
    .from("school_matches")
    .select("school_name, category, percentage")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("percentage", { ascending: false });

  if (activeMatchesError) console.error("dashboard active matches query failed:", activeMatchesError);

  const CATEGORY_ORDER = ["reach", "target", "safety"] as const;
  const topMatches = CATEGORY_ORDER
    .map((category) => activeMatches?.find((m) => m.category === category))
    .filter((m): m is NonNullable<typeof m> => Boolean(m));

  const { count: timelineItemCount, error: timelineItemCountError } = await supabase
    .from("timeline_items")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (timelineItemCountError) console.error("dashboard timeline item count query failed:", timelineItemCountError);

  const { count: completedTimelineItemCount, error: completedTimelineItemCountError } = await supabase
    .from("timeline_items")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("completed", true);

  if (completedTimelineItemCountError) console.error("dashboard completed timeline item count query failed:", completedTimelineItemCountError);

  const { data: upcomingTasks, error: upcomingTasksError } = await supabase
    .from("timeline_items")
    .select("id, title, due_date")
    .eq("user_id", user.id)
    .eq("completed", false)
    .order("due_date", { ascending: true, nullsFirst: false })
    .limit(3);

  if (upcomingTasksError) console.error("dashboard upcoming tasks query failed:", upcomingTasksError);

  const { count: referredCount, error: referredCountError } = await supabase
    .from("profiles")
    .select("user_id", { count: "exact", head: true })
    .eq("referred_by_user_id", user.id);

  if (referredCountError) console.error("dashboard referred count query failed:", referredCountError);

  const { data: narrative, error: narrativeError } = await supabase
    .from("narrative_profiles")
    .select("throughline")
    .eq("user_id", user.id)
    .maybeSingle();

  if (narrativeError) console.error("dashboard narrative query failed:", narrativeError);

  const scholarshipProfile: ScholarshipProfile = {
    first_gen: (profile.first_gen as boolean | null) ?? null,
    financial_aid_need: (profile.financial_aid_need as boolean | null) ?? null,
    intended_major: (profile.intended_major as string[] | null) ?? null,
    extracurriculars: (profile.extracurriculars as string[] | null) ?? null,
  };

  const topScholarships = getAllScholarships()
    .map((s) => ({ scholarship: s, fit: getFitTier(s, scholarshipProfile) }))
    .filter((s) => s.fit.tier !== "Reach")
    .sort((a, b) => (a.fit.tier === b.fit.tier ? 0 : a.fit.tier === "Strong Fit" ? -1 : 1))
    .slice(0, 2);

  const name = (user.user_metadata?.full_name as string | undefined)?.split(" ")[0] || "there";

  return (
    <NavShell>
      {getMissingFields(profile).length === 0 && <LivingProfileNudge profile={profile} />}
      <div className="px-5 md:px-8 py-10 max-w-3xl mx-auto w-full">
        <h1 className="reveal font-serif text-3xl text-text mb-2">Welcome, {name}.</h1>
        <p className="reveal text-text-gray text-sm mb-8" style={{ ["--reveal-delay" as string]: "0.06s" }}>
          {profile.grade_level} · {profile.current_school} · {profile.intended_major?.length ? profile.intended_major.join(", ") : "Major undecided"}
          {" · "}
          {profile.unweighted_gpa} UW / {profile.weighted_gpa} W GPA
        </p>

        {timelineItemCount ? (() => {
          const pct = Math.round(((completedTimelineItemCount ?? 0) / timelineItemCount) * 100);
          return (
            <div className="reveal mb-6" style={{ ["--reveal-delay" as string]: "0.05s" }}>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-text-gray text-xs">Your journey so far</p>
                <p className="text-text-gray text-xs">
                  {completedTimelineItemCount ?? 0} of {timelineItemCount} timeline items done
                </p>
              </div>
              <div className="h-2 rounded-full bg-card border border-border overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })() : null}

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
              <>
                <MatchesEmptyArt />
                <p className="text-text-gray text-sm mt-2">No matches yet, tap Matches below to generate your personalized school list.</p>
              </>
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

        <div className="grid sm:grid-cols-2 gap-5 mb-8">
          <Link
            href="/narrative"
            className="reveal block min-w-0 bg-card border border-border rounded-2xl px-6 py-7 min-h-[200px] hover:border-primary/40 hover:-translate-y-0.5 transition-all"
            style={{ ["--reveal-delay" as string]: "0.22s" }}
          >
            <p className="text-text-gray text-sm mb-4">Your narrative throughline</p>
            {narrative?.throughline ? (
              <p className="font-serif text-lg text-text leading-snug">&ldquo;{narrative.throughline}&rdquo;</p>
            ) : (
              <div className="flex items-start gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-text-gray/70 ambient-star" style={{ ["--twinkle-max" as string]: "0.9" }} />
                <p className="text-text-gray text-sm">
                  No throughline yet, tap Narrative Builder below to find the story tying your application together.
                </p>
              </div>
            )}
          </Link>

          <Link
            href="/scholarships"
            className="reveal block min-w-0 bg-card border border-border rounded-2xl px-6 py-7 min-h-[200px] hover:border-primary/40 hover:-translate-y-0.5 transition-all"
            style={{ ["--reveal-delay" as string]: "0.26s" }}
          >
            <p className="text-text-gray text-sm mb-4">Top scholarship matches</p>
            {topScholarships.length > 0 ? (
              <div className="space-y-3">
                {topScholarships.map(({ scholarship, fit }) => (
                  <div key={scholarship.name} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span
                        className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full mb-1.5 ${
                          fit.tier === "Strong Fit" ? "bg-green-tint text-green" : "bg-amber-tint text-amber-text-on-tint"
                        }`}
                      >
                        {fit.tier}
                      </span>
                      <p className="font-serif text-base text-text truncate">{scholarship.name}</p>
                    </div>
                    {scholarship.award_amount && (
                      <span className="text-text-gray text-sm shrink-0">{scholarship.award_amount}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <>
                <ScholarshipsEmptyArt />
                <p className="text-text-gray text-sm mt-2">
                  No strong scholarship matches surfaced yet, tap Scholarships below to browse the full list.
                </p>
              </>
            )}
          </Link>
        </div>

        <HumanReviewCard />
        <InviteFriendCard referralCode={profile.referral_code ?? null} referredCount={referredCount ?? 0} />
        <Link href="/mock-interview" className="text-text-gray hover:text-text text-sm underline underline-offset-2">
          Practice a mock interview →
        </Link>
      </div>
    </NavShell>
  );
}
