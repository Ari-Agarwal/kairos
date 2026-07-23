import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import NavShell from "@/components/NavShell";
import NarrativeBuilderClient from "./NarrativeBuilderClient";

export const metadata = { title: "Narrative Builder — Kairos" };

export default async function NarrativePage({
  searchParams,
}: {
  searchParams: Promise<{ flagged_activity?: string; flagged_note?: string; seed_key?: string; seed_text?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { flagged_activity: flaggedActivity, flagged_note: flaggedNote, seed_key: seedKey, seed_text: seedText } =
    await searchParams;

  const { data: narrative, error } = await supabase
    .from("narrative_profiles")
    .select("answers, throughline, core_values, growth_arc, differentiator, essay_angles, suggested_activities")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) console.error("narrative page query failed:", error);

  const initial =
    narrative && narrative.throughline
      ? {
          answers: narrative.answers,
          throughline: narrative.throughline,
          core_values: narrative.core_values ?? [],
          growth_arc: narrative.growth_arc ?? "",
          differentiator: narrative.differentiator ?? "",
          essay_angles: narrative.essay_angles ?? [],
          gaps: [] as string[],
          suggested_activities: narrative.suggested_activities ?? [],
        }
      : null;

  return (
    <NavShell>
      <div className="px-5 md:px-8 py-8 max-w-2xl mx-auto w-full">
        <h1 className="font-serif text-2xl text-text mb-2">Narrative Builder</h1>
        <p className="text-text-gray text-sm mb-6">
          Answer a few guided questions and get a clear, specific throughline you can use to anchor your essays and
          activities descriptions — not a generic summary, something grounded in what's actually true about you.
        </p>
        <p className="text-text-gray text-xs mb-6">
          Your answers are sent to our AI provider (Anthropic) to generate this synthesis.
        </p>
        <NarrativeBuilderClient
          initial={initial}
          flaggedActivity={flaggedActivity && flaggedNote ? { activity: flaggedActivity, note: flaggedNote } : null}
          seed={seedKey && seedText ? { key: seedKey, text: seedText } : null}
        />
      </div>
    </NavShell>
  );
}
