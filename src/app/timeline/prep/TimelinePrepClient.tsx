"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import FeaturePrepFlow from "@/components/FeaturePrepFlow";

export default function TimelinePrepClient({
  inlineFields,
  linkOutFields,
}: {
  inlineFields: string[];
  linkOutFields: string[];
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
        return { error: "Failed to save your answers. Please try again." };
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 65_000);
    try {
      const res = await fetch("/api/timeline/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: feedback.trim() || undefined }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return { error: body.error ?? "Failed to generate. Please try again." };
      }
      router.push("/timeline");
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
      backHref="/timeline"
      heading="Let's map out your timeline"
      subheading="A few quick questions, then we'll build your plan."
      inlineFields={inlineFields}
      linkOutFields={linkOutFields}
      feedbackQuestion="Anything you'd like your timeline to focus on?"
      feedbackPlaceholder="e.g. more focus on financial aid deadlines, or a lighter fall schedule"
      completeLabel="Generate Timeline"
      generatingLabel="Mapping out your timeline..."
      onComplete={handleComplete}
    />
  );
}
