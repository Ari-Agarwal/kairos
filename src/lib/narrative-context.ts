import type { SupabaseClient } from "@supabase/supabase-js";

// The narrative builder's throughline/differentiator/essay_angles previously
// went nowhere else in the app -- a student could build a strong personal
// narrative and then essay feedback/brainstorm would have no idea it
// existed. Shared so both essay routes format it identically.
export async function getNarrativeContextText(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("narrative_profiles")
    .select("throughline, core_values, differentiator, essay_angles")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("getNarrativeContextText query failed:", error);
    return null;
  }
  if (!data || !data.throughline) return null;

  const coreValues = (data.core_values as string[] | null) ?? [];
  const angles = (data.essay_angles as { title: string; framing: string }[] | null) ?? [];

  const lines = [
    `This student previously built a personal narrative profile. Use it as background context -- don't force the essay to match it, but weigh feedback/suggestions against it where relevant:`,
    `Throughline: ${data.throughline}`,
    coreValues.length ? `Core values: ${coreValues.join(", ")}` : null,
    data.differentiator ? `What sets them apart: ${data.differentiator}` : null,
    angles.length ? `Previously suggested essay angles: ${angles.map((a) => a.title).join("; ")}` : null,
  ].filter(Boolean);

  return lines.join("\n");
}
