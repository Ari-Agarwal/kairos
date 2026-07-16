"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import FeaturePrepFlow from "@/components/FeaturePrepFlow";

export default function MatchesPrepClient({
  inlineFields,
  linkOutFields,
}: {
  inlineFields: string[];
  linkOutFields: string[];
}) {
  const router = useRouter();
  const supabase = createClient();

  async function handleComplete(values: Record<string, string>, feedback: string) {
    const patch: Record<string, string> = {};
    for (const field of inlineFields) {
      if (values[field]?.trim()) patch[field] = values[field].trim();
    }
    if (Object.keys(patch).length > 0) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { error: "Not signed in." };
      const { error: updateError } = await supabase.from("profiles").update(patch).eq("user_id", user.id);
      if (updateError) return { error: updateError.message };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 65_000);
    try {
      const res = await fetch("/api/matches/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: feedback.trim() || undefined }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return { error: body.error ?? "Failed to generate. Please try again." };
      }
      router.push("/matches");
      return {};
    } catch (err) {
      return {
        error:
          err instanceof DOMException && err.name === "AbortError"
            ? "This is taking longer than expected. Please try again."
            : "Failed to generate. Please try again.",
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  return (
    <FeaturePrepFlow
      backHref="/matches"
      heading="Let's sharpen your matches"
      subheading="A few quick questions, then we'll generate your list."
      inlineFields={inlineFields}
      linkOutFields={linkOutFields}
      feedbackQuestion="What are you looking for?"
      feedbackPlaceholder="e.g. more schools on the West Coast, or a bigger reach list"
      completeLabel="Generate Matches"
      generatingLabel="Building your personalized list..."
      onComplete={handleComplete}
    />
  );
}
