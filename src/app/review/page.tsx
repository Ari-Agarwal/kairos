import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import NavShell from "@/components/NavShell";
import HumanReviewCard from "@/components/HumanReviewCard";

export const metadata = { title: "Human Review — Kairos" };

export default async function ReviewPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <NavShell>
      <div className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="font-serif text-2xl text-text mb-1">AI + Human Review</h1>
        <p className="text-text-gray text-sm mb-6">
          Get a real counselor&rsquo;s eyes on your application, on top of Kairos&rsquo;s AI guidance.
        </p>
        <HumanReviewCard />
      </div>
    </NavShell>
  );
}
