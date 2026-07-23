"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import FeaturePrepFlow from "@/components/FeaturePrepFlow";
import { TIMELINE_THINKING } from "@/components/GenerationThinking";

export default function TimelinePrepClient({
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

    // Generation now runs as a background job (see api/timeline/generate) --
    // this call only does validation + kicks the job off, so it returns fast.
    // /timeline itself polls job status and shows a generating state.
    try {
      const res = await fetch("/api/timeline/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: feedback.trim() || undefined, isRegenerate }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return { error: body.error ?? "We hit a snag starting your timeline — try again, or check back in a few minutes if it keeps happening." };
      }
      router.push("/timeline");
      return {};
    } catch {
      return { error: "We hit a snag starting your timeline — check your connection and try again." };
    }
  }

  return (
    <FeaturePrepFlow
      backHref="/timeline"
      heading="Let's map out your timeline"
      subheading="A few quick questions, then we'll build your plan."
      inlineFields={inlineFields}
      linkOutFields={linkOutFields}
      feedbackQuestion={isRegenerate ? "What should change from your current timeline?" : "Anything you'd like your timeline to focus on?"}
      feedbackPlaceholder={
        isRegenerate
          ? "e.g. missing a deadline, wrong order, too many items at once"
          : "e.g. more focus on financial aid deadlines, or a lighter fall schedule"
      }
      completeLabel="Generate Timeline"
      generatingLabel="Mapping out your timeline..."
      thinkingMessages={TIMELINE_THINKING}
      onComplete={handleComplete}
    />
  );
}
