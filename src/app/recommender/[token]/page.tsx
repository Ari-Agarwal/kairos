import { createServiceClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import TalkingPointsClient from "./TalkingPointsClient";

async function getRecommenderData(token: string) {
  if (token.length !== 64 || !/^[0-9a-f]+$/.test(token)) return null;

  const service = createServiceClient();

  const { data: rec, error: recError } = await service
    .from("recommenders")
    .select("recommender_name, relationship, brag_sheet, user_id")
    .eq("share_token", token)
    .single();

  if (recError) console.error("recommender token lookup failed:", recError);
  if (!rec) return null;

  // Reads straight off profiles.display_name rather than an
  // auth.admin.getUserById() round-trip -- the same fix already applied
  // across the counselor-facing pages (Section 4) for the same unreliable
  // fan-out pattern; this page was the one spot it was missed.
  const { data: profile, error: profileError } = await service
    .from("profiles")
    .select("display_name")
    .eq("user_id", rec.user_id)
    .maybeSingle();
  if (profileError) console.error("recommender profile lookup failed:", profileError);
  const fullName = profile?.display_name?.trim() || "the student";
  const firstName = fullName.split(" ")[0];

  const brag = (rec.brag_sheet ?? {}) as Record<string, string>;

  return {
    student_first_name: firstName,
    recommender_name: rec.recommender_name as string,
    relationship: rec.relationship as string,
    brag_sheet: {
      activities: brag.activities ?? "",
      achievements: brag.achievements ?? "",
      anecdotes: brag.anecdotes ?? "",
      additional_context: brag.additional_context ?? "",
    },
  };
}

export default async function RecommenderPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await getRecommenderData(token);
  if (!data) notFound();

  const { student_first_name, recommender_name, relationship, brag_sheet } = data;

  const hasBrag =
    brag_sheet.activities || brag_sheet.achievements || brag_sheet.anecdotes || brag_sheet.additional_context;

  return (
    <div className="min-h-screen bg-bg text-text">
      <div className="max-w-2xl mx-auto px-5 py-10">
        <div className="mb-8">
          <p className="text-text-gray text-xs uppercase tracking-widest mb-2">
            Recommendation Letter · Shared by student
          </p>
          <h1 className="font-serif text-3xl text-text mb-1">
            Hello, {recommender_name}
          </h1>
          <p className="text-text-gray text-sm">
            {student_first_name} has asked you to write a recommendation letter for their college applications.
            Below is context {student_first_name} prepared to help you write the letter.
          </p>
        </div>

        <section className="mb-8">
          <div className="bg-card border border-border rounded-2xl p-5">
            <p className="text-text-gray text-xs uppercase tracking-widest mb-3">Your relationship</p>
            <p className="text-text">{relationship}</p>
          </div>
        </section>

        {hasBrag ? (
          <section className="mb-8 space-y-4">
            <h2 className="font-serif text-xl text-text">What {student_first_name} wants you to know</h2>
            {brag_sheet.activities && (
              <BragCard label="Activities & Involvement" content={brag_sheet.activities} />
            )}
            {brag_sheet.achievements && (
              <BragCard label="Achievements & Awards" content={brag_sheet.achievements} />
            )}
            {brag_sheet.anecdotes && (
              <BragCard label="Anecdotes to Share" content={brag_sheet.anecdotes} />
            )}
            {brag_sheet.additional_context && (
              <BragCard label="Additional Context" content={brag_sheet.additional_context} />
            )}
          </section>
        ) : (
          <section className="mb-8">
            <div className="bg-card border border-border rounded-2xl p-5">
              <p className="text-text-gray text-sm">
                {student_first_name} hasn&apos;t filled in their brag sheet yet. Check back later, or reach out to them directly.
              </p>
            </div>
          </section>
        )}

        {hasBrag && (
          <section className="mb-10">
            <h2 className="font-serif text-xl text-text mb-4">AI-Generated Talking Points</h2>
            <p className="text-text-gray text-sm mb-4">
              These suggestions are grounded strictly in what {student_first_name} wrote above.
              They are a starting point — your own direct observations will make the letter most impactful.
            </p>
            <TalkingPointsClient token={token} />
          </section>
        )}

        <p className="text-text-gray text-xs text-center border-t border-border pt-6">
          This page was shared by {student_first_name} for the sole purpose of supporting their college recommendation letter.
          Powered by Kairos.
        </p>
      </div>
    </div>
  );
}

function BragCard({ label, content }: { label: string; content: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <p className="text-text-gray text-xs uppercase tracking-widest mb-2">{label}</p>
      <p className="text-text text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
    </div>
  );
}
