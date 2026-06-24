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

function computeYouAreHere(items: TimelineItem[]): string | null {
  const eligible = items.filter((i) => !i.completed && !i.is_strategic && i.due_date);
  if (eligible.length === 0) return null;

  eligible.sort((a, b) => {
    const dateDiff = new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime();
    if (dateDiff !== 0) return dateDiff;
    return (b.school_tags?.length ?? 0) - (a.school_tags?.length ?? 0);
  });

  return eligible[0].id;
}

export default async function TimelinePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
  if (!profile) redirect("/onboarding");

  const { data: items } = await supabase
    .from("timeline_items")
    .select("*")
    .eq("user_id", user.id)
    .order("due_date", { ascending: true, nullsFirst: false });

  const isPremium = profile.subscription_tier === "premium";
  const youAreHereId = items ? computeYouAreHere(items as TimelineItem[]) : null;

  return (
    <NavShell>
      <ProfileCompletenessModal profile={profile} />
      <TimelineClient items={items ?? []} isPremium={isPremium} youAreHereId={youAreHereId} />
    </NavShell>
  );
}
