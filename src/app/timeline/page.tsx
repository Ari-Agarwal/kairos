// SCREEN 6 COMPLETE
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import NavShell from "@/components/NavShell";
import ProfileCompletenessModal from "@/components/ProfileCompletenessModal";
import TimelineClient from "./TimelineClient";

interface TimelineItem {
  id: string;
  title: string;
  due_date: string | null;
  school_tags: string[];
  tier: "free" | "premium";
  is_strategic: boolean;
  completed: boolean;
  why_text: string;
}

function weekStart(): string {
  const d = new Date();
  const day = d.getUTCDay();
  const diff = (day + 6) % 7;
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

function computeYouAreHere(items: TimelineItem[]): string | null {
  const eligible = items.filter((i) => !i.completed && !i.is_strategic && i.due_date);
  if (eligible.length === 0) return null;

  const sortByDate = (list: TimelineItem[]) =>
    [...list].sort((a, b) => {
      const dateDiff = new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime();
      if (dateDiff !== 0) return dateDiff;
      return (b.school_tags?.length ?? 0) - (a.school_tags?.length ?? 0);
    });

  // Recomputed fresh on every page load (this is a Server Component, not
  // cached), so "today" is always current as of the latest visit — the
  // marker needs to actually compare against it rather than just picking
  // the chronologically-first incomplete item, or an unchecked task stays
  // pinned as "You are here" forever after its due date passes.
  const todayMs = new Date().setHours(0, 0, 0, 0);
  const upcoming = sortByDate(eligible.filter((i) => new Date(i.due_date!).getTime() >= todayMs));
  if (upcoming.length > 0) return upcoming[0].id;

  // Everything is overdue — "here" is the most recently missed item, not
  // the oldest one, since that's the one most relevant to catch up on now.
  const overdue = sortByDate(eligible);
  return overdue[overdue.length - 1].id;
}

export default async function TimelinePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile, error: profileError } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
  if (profileError) console.error("timeline: failed to fetch profile", profileError);
  if (!profile) redirect("/onboarding");

  const { data: items, error: itemsError } = await supabase
    .from("timeline_items")
    .select("*")
    .eq("user_id", user.id)
    .order("due_date", { ascending: true, nullsFirst: false });
  if (itemsError) console.error("timeline: failed to fetch timeline_items", itemsError);

  const { data: regenRow, error: regenError } = await supabase
    .from("regeneration_log")
    .select("timeline_count")
    .eq("user_id", user.id)
    .eq("week_start_date", weekStart())
    .maybeSingle();
  if (regenError) console.error("timeline: failed to fetch regeneration_log", regenError);

  const isPremium = profile.subscription_tier === "premium";
  const remaining = isPremium ? null : Math.max(0, 3 - (regenRow?.timeline_count ?? 0));
  const youAreHereId = items ? computeYouAreHere(items as TimelineItem[]) : null;

  return (
    <NavShell>
      <ProfileCompletenessModal profile={profile} />
      <TimelineClient
        items={items ?? []}
        isPremium={isPremium}
        youAreHereId={youAreHereId}
        remaining={remaining}
      />
    </NavShell>
  );
}
