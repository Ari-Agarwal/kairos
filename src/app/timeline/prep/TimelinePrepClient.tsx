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

    try {
      const res = await fetch("/api/timeline/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: feedback.trim() || undefined }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return { error: body.error ?? "Failed to generate timeline. Please try again." };
      }
      router.push("/timeline");
      return {};
    } catch {
      return { error: "Failed to generate timeline. Please try again." };
    }
  }

  return (
    <FeaturePrepFlow
      backHref="/timeline"
      heading="Let's sharpen your timeline"
      subheading="A few quick questions, then we'll build your timeline."
      inlineFields={inlineFields}
      linkOutFields={linkOutFields}
      feedbackQuestion="What would you like different?"
      feedbackPlaceholder="e.g. push the essay deadlines earlier, or focus more on financial aid prep"
      completeLabel="Generate Timeline"
      generatingLabel="Mapping out your timeline..."
      onComplete={handleComplete}
    />
  );
}
