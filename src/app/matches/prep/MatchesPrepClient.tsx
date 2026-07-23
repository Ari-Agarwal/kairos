"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import FeaturePrepFlow from "@/components/FeaturePrepFlow";
import { MATCHES_THINKING } from "@/components/GenerationThinking";

export default function MatchesPrepClient({
  inlineFields,
  linkOutFields,
  isRegenerate,
}: {
  inlineFields: string[];
  linkOutFields: string[];
  isRegenerate: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();

  async function handleComplete(values: Record<string, string | string[]>, feedback: string) {
    const patch: Record<string, string | string[]> = {};
    for (const field of inlineFields) {
      const value = values[field];
      if (Array.isArray(value)) {
        if (value.length > 0) patch[field] = value;
      } else if (value?.trim()) {
        patch[field] = value.trim();
      }
    }
    // This block only runs when at least one field was filled in, but it
    // still needs its own try/catch so a flaky auth/update call surfaces as
    // an error instead of hanging the flow in its "submitting" state forever.
    if (Object.keys(patch).length > 0) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { error: "Not signed in." };
        const { error: updateError } = await supabase.from("profiles").update(patch).eq("user_id", user.id);
        if (updateError) return { error: updateError.message };
      } catch {
        return { error: "Couldn't save your answers just now — check your connection and try again." };
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 65_000);
    try {
      const res = await fetch("/api/matches/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: feedback.trim() || undefined, isRegenerate }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return { error: body.error ?? "We hit a snag generating your matches — try again, or check back in a few minutes if it keeps happening." };
      }
      const body = await res.json().catch(() => ({}));
      if (Array.isArray(body.failedCategories) && body.failedCategories.length > 0) {
        sessionStorage.setItem("kairos_matches_failed_categories", JSON.stringify(body.failedCategories));
      }
      router.push("/matches");
      return {};
    } catch (err) {
      return {
        error:
          err instanceof DOMException && err.name === "AbortError"
            ? "This is taking longer than expected — try again in a moment."
            : "We hit a snag generating your matches — try again, or check back in a few minutes if it keeps happening.",
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  return (
    <FeaturePrepFlow
      backHref="/matches"
      heading="Let's refine your matches"
      subheading="A few quick questions, then we'll generate your list."
      inlineFields={inlineFields}
      linkOutFields={linkOutFields}
      feedbackQuestion={isRegenerate ? "What should change from your last list?" : "What are you looking for?"}
      feedbackPlaceholder={
        isRegenerate
          ? "e.g. too many reach schools, wrong region, missing a program you care about"
          : "e.g. more schools on the West Coast, or a bigger reach list"
      }
      completeLabel="Generate Matches"
      generatingLabel="Building your personalized list..."
      thinkingMessages={MATCHES_THINKING}
      onComplete={handleComplete}
      required
    />
  );
}
